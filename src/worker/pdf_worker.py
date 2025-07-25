import os, time, json, tempfile, requests, asyncio
from upstash_redis import Redis
import psycopg2, psycopg2.extras
import fitz
from collections import defaultdict
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from text_extractor import TextExtractor
from image_extractor import ImageExtractor
from table_extractor import TableExtractor
from llm_cleaner import components_from_chunks
from embedding_service import EmbeddingService
from image_upload_service import ImageUploadService
import re

NULL_RE = re.compile(r'\u0000')

def strip_nul(obj):
    if isinstance(obj, str):
        return obj.replace("\x00", "")
    if isinstance(obj, list):
        return [strip_nul(x) for x in obj]
    if isinstance(obj, dict):
        return {k: strip_nul(v) for k, v in obj.items()}
    return obj

def safe_json(obj:dict) -> str:
    clean = strip_nul(obj)
    return json.dumps(clean, ensure_ascii=False)

redis = Redis(
    url=os.environ["UPSTASH_REDIS_REST_URL"],
    token=os.environ["UPSTASH_REDIS_REST_TOKEN"]
)

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cursor = conn.cursor()

# Extractors
text_extractor = TextExtractor()
image_extractor = ImageExtractor()
table_extractor = TableExtractor()
embedding_service = EmbeddingService()
image_upload_service = ImageUploadService()

def download_blob(url: str) -> str:
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    file_descriptor, temp_path = tempfile.mkstemp(suffix=".pdf")
    with open(file_descriptor, "wb") as temp_file:
        temp_file.write(response.content)
    return temp_path

async def process_page_async(
    page_num: int,
    page_text: list,
    page_images: list,
    page_tables: list,
    job_name: str,
    page_dims: dict,
    semaphore: asyncio.Semaphore
):
    """Process a single page asynchronously"""
    async with semaphore:  # Limit concurrent LLM calls
        if not page_text:
            print(f"Skipping page {page_num} (no text content).")
            return None

        print(f"Processing page {page_num} through LLM...")
        
        # Get components for THIS PAGE ONLY
        page_components = await components_from_chunks(page_text, page_images, page_tables)
        
        # Filter out titles from pages other than page 1
        if page_num > 1:
            page_components = [comp for comp in page_components if comp.get('component') != 'Title']
        
        if page_components:
            # Store components with the CORRECT page number
            cursor.execute(
                """
                INSERT INTO pdf_objects (file, page, type, content, bbox, page_width, page_height)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    job_name,
                    page_num,
                    "components",
                    json.dumps({"components": page_components}),
                    json.dumps([0, 0, 0, 0]), # Placeholder bbox
                    page_dims.get(page_num, (612, 792))[0],
                    page_dims.get(page_num, (612, 792))[1],
                )
            )
            print(f"Stored {len(page_components)} components for page {page_num}.")
            
        return page_components

def process_job(job:dict):
    pdf_path = None
    try:
        print("Processing:", job["name"])
        
        # Update file status to PROCESSING
        cursor.execute(
            "UPDATE \"File\" SET \"uploadStatus\" = 'PROCESSING' WHERE \"key\" = %s",
            (job["name"],)
        )
        conn.commit()
        
        pdf_path = download_blob(job["url"])

        # 1. Extract all objects from the PDF
        text_objects = text_extractor.extract(pdf_path)
        image_objects = image_extractor.extract(pdf_path)
        table_objects = table_extractor.extract(pdf_path)
        
        print(f"Extracted: {len(text_objects)} text, {len(image_objects)} image, {len(table_objects)} table objects.")
        print("Image objects extracted:")
        for img in image_objects:
            print(f"  id={img.get('id', img.get('filename'))} page={img.get('page')} filename={img.get('filename')} group_id={img.get('group_id', None)}")
        print("Table objects extracted:")
        for tbl in table_objects:
            print(f"  id={tbl.get('id', tbl.get('filename'))} page={tbl.get('page')} filename={tbl.get('filename')} group_id={tbl.get('group_id', None)}")

        # 2. Upload images and tables to CDN
        if image_objects or table_objects:
            print("Uploading images and tables to CDN...")
            all_vision_objects = image_objects + table_objects
            uploaded_objects = image_upload_service.upload_images_batch(all_vision_objects)
            
            # Separate back into images and tables
            image_objects = [obj for obj in uploaded_objects if obj.get('type') == 'image']
            table_objects = [obj for obj in uploaded_objects if obj.get('type') == 'table']
            
            print(f"Uploaded {len([img for img in image_objects if 'cdn_url' in img])} images")
            print(f"Uploaded {len([table for table in table_objects if 'cdn_url' in table])} tables")

        # 3. Group all extracted objects by their page number
        text_by_page = defaultdict(list)
        images_by_page = defaultdict(list)
        tables_by_page = defaultdict(list)

        for obj in text_objects:
            text_by_page[obj.get('page', 1)].append(obj)
        for obj in image_objects:
            images_by_page[obj.get('page', 1)].append(obj)
        for obj in table_objects:
            tables_by_page[obj.get('page', 1)].append(obj)

        # 4. Get page dimensions and number of pages
        doc = fitz.open(pdf_path)
        num_pages = len(doc)
        page_dims = {i + 1: (p.rect.width, p.rect.height) for i, p in enumerate(doc)}
        doc.close()

        # 5. Process pages concurrently with asyncio
        async def process_all_pages():
            # Create a semaphore to limit concurrent LLM calls (adjust based on your API limits)
            semaphore = asyncio.Semaphore(3)  # Process up to 3 pages concurrently
            
            # Create tasks for all pages
            tasks = []
            for page_num in range(1, num_pages + 1):
                page_text = text_by_page.get(page_num, [])
                page_images = images_by_page.get(page_num, [])
                page_tables = tables_by_page.get(page_num, [])
                
                task = process_page_async(
                    page_num, 
                    page_text, 
                    page_images, 
                    page_tables, 
                    job["name"], 
                    page_dims, 
                    semaphore
                )
                tasks.append(task)
            
            # Wait for all pages to complete
            print(f"Processing {len(tasks)} pages concurrently...")
            page_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Collect all components and handle any exceptions
            all_components = []
            for i, result in enumerate(page_results):
                page_num = i + 1
                if isinstance(result, Exception):
                    print(f"Error processing page {page_num}: {result}")
                elif result is not None:
                    all_components.extend(result)
            
            return all_components
        
        # Run the async processing
        all_components = asyncio.run(process_all_pages())

        # 6. Create embeddings from a simple text representation of all components
        if all_components:
            # Create a simple string representation for embedding
            html_content_for_embedding = "\n".join([c['props'].get('text', '') for c in all_components if 'text' in c['props']])
            print("Creating embeddings...")
            embedding_info = embedding_service.create_embeddings(
                file_name=job["name"],
                content=html_content_for_embedding
            )
            print(f"Embeddings created: {embedding_info.get('chunk_count')} chunks.")

        # 7. Store vision objects (images and tables) with correct page numbers
        vision_objects = image_objects + table_objects
        if vision_objects:
            for obj in vision_objects:
                if "page_width" not in obj:
                    w, h = page_dims.get(obj["page"], (612, 792))
                    obj["page_width"] = w
                    obj["page_height"] = h
            print("Inserting vision objects into DB:")
            for obj in vision_objects:
                print(f"  type={obj['type']} id={obj.get('id', obj.get('filename'))} page={obj['page']} filename={obj.get('filename')} group_id={obj.get('group_id', None)}")
            psycopg2.extras.execute_values(
                cursor,
                """ 
                INSERT INTO pdf_objects (file, page, type, content, bbox, page_width, page_height)
                VALUES %s
                """,
                [
                    (
                        job["name"],
                        obj["page"],
                        obj["type"],
                        safe_json(obj), # Store the whole object in content
                        json.dumps(obj.get("bbox", [])),
                        obj["page_width"],
                        obj["page_height"],
                    )
                    for obj in vision_objects
                ],
            )
            print(f"Stored {len(vision_objects)} vision objects.")

        # Update file status to SUCCESS
        cursor.execute(
            "UPDATE \"File\" SET \"uploadStatus\" = 'SUCCESS' WHERE \"key\" = %s",
            (job["name"],)
        )
        conn.commit()
        print("Successfully processed", job["name"])

    except Exception as e:
        print(f"Error processing {job['name']}: {str(e)}")
        # Update file status to FAILED
        cursor.execute(
            "UPDATE \"File\" SET \"uploadStatus\" = 'FAILED' WHERE \"key\" = %s",
            (job["name"],)
        )
        conn.commit()
        raise
    finally:
        if pdf_path and os.path.exists(pdf_path):
            os.remove(pdf_path)
        if 'image_objects' in locals() and (image_objects or table_objects):
            all_vision_objects = image_objects + table_objects
            image_upload_service.cleanup_local_files(all_vision_objects)
    
    print("Done: ", job["name"])

def main():
    print("PDF Worker started - waiting for jobs...")
    while True:
        try:
            job_json = redis.rpop("pdf_jobs")
            if job_json is None:
                time.sleep(2)
                continue
            
            print("Found job! Processing...")
            process_job(json.loads(job_json))
            
        except Exception as e:
            print(f"Error in main loop: {str(e)}")
            time.sleep(5)

if __name__ == "__main__":
    main()