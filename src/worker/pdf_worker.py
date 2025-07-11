import os, time, json, tempfile, requests
from upstash_redis import Redis
import psycopg2, psycopg2.extras
import fitz

from text_extractor import TextExtractor
from image_extractor import ImageExtractor
from table_extractor import TableExtractor
from llm_cleaner import components_from_chunks, tsx_from_chunks
from embedding_service import EmbeddingService
from image_upload_service import ImageUploadService
import re, json

NULL_RE = re.compile(r'\u0000')

def strip_nul(obj):
    # Strip real NUL chars froms strings in lists/dicts
    if isinstance(obj, str):
        return obj.replace("\x00", "")
    if isinstance(obj, list):
        return [strip_nul(x) for x in obj]
    if isinstance(obj, dict):
        return {k: strip_nul(v) for k, v in obj.items()}
    return obj

def safe_json(obj:dict) -> str:
    """ dump to json and strip null for db"""
    clean = strip_nul(obj)
    return json.dumps(clean, ensure_ascii=False)

redis = Redis(
    url =os.environ["UPSTASH_REDIS_REST_URL"],
    token=os.environ["UPSTASH_REDIS_REST_TOKEN"]
)

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cursor = conn.cursor()

# Extractors
text = TextExtractor()
images = ImageExtractor()
tables = TableExtractor()
embedding_service = EmbeddingService()
image_upload_service = ImageUploadService()

def download_blob(url: str) -> str:
    # download temp file
    response = requests.get(url, timeout=30)
    response.raise_for_status()

    file_descriptor, temp_path = tempfile.mkstemp(suffix=".pdf")
    with open(file_descriptor, "wb") as temp_file:
        temp_file.write(response.content)
    return temp_path

def process_job(job:dict):
    pdf_path = None
    try:
        print("Processing:", job["name"])
        pdf_path = download_blob(job["url"])

        # Extract text chunks for LLM processing
        text_objects = text.extract(pdf_path)
        print("Text objects:", len(text_objects))

        # Extract images and tables
        image_objects = images.extract(pdf_path)
        print("Image objects:", len(image_objects))
        
        table_objects = tables.extract(pdf_path)
        print("Table objects:", len(table_objects))

        # Upload images to CDN
        if image_objects:
            print("Uploading images to CDN...")
            image_objects = image_upload_service.upload_images_batch(image_objects)
            print(f"Uploaded {len([img for img in image_objects if 'cdn_url' in img])} images")

        # Process text through LLM for component structure
        if text_objects:
            print("Processing text through LLM for components...")
            components = components_from_chunks(text_objects, image_objects, table_objects)
            print(f"Generated {len(components)} components")
            
            # Convert components to HTML for backward compatibility with embeddings
            formatted_content = tsx_from_chunks(text_objects)
            print("LLM processing complete")
            
            # ⭐️ Create and store embeddings for the formatted content
            print("Creating embeddings...")
            embedding_info = embedding_service.create_embeddings(
                file_name=job["name"], 
                html_content=formatted_content
            )
            print(f"Embeddings created: {embedding_info.get('chunk_count')} chunks in collection '{embedding_info.get('collection_name')}'")
            
        else:
            components = []
            formatted_content = ""

        # Get page dimensions
        doc = fitz.open(pdf_path)
        page_dims = {i + 1: (p.rect.width, p.rect.height) for i, p in enumerate(doc)}
        doc.close()

        # Store components as structured data
        if components:
            cursor.execute(
                """
                INSERT INTO pdf_objects (file, page, type, content, bbox, page_width, page_height)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    job["name"],
                    1,  # Store components on page 1
                    "components",
                    json.dumps({"components": components}),
                    json.dumps([0, 0, 0, 0]),  # Placeholder bbox
                    page_dims[1][0] if page_dims else 612,
                    page_dims[1][1] if page_dims else 792,
                )
            )

        # Also store formatted HTML for backward compatibility
        if formatted_content:
            cursor.execute(
                """
                INSERT INTO pdf_objects (file, page, type, content, bbox, page_width, page_height)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    job["name"],
                    1,  # Store formatted content on page 1
                    "formatted",
                    json.dumps({"content": formatted_content}),
                    json.dumps([0, 0, 0, 0]),  # Placeholder bbox
                    page_dims[1][0] if page_dims else 612,
                    page_dims[1][1] if page_dims else 792,
                )
            )

        # Store images and tables
        vision_objects = image_objects + table_objects
        if vision_objects:
            # Add page dimensions to objects that don't have them
            for obj in vision_objects:
                if "page_width" not in obj:
                    w, h = page_dims[obj["page"]]
                    obj["page_width"] = w
                    obj["page_height"] = h

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
                        safe_json(obj.get("content", {})),
                        json.dumps(obj.get("bbox", [])),
                        obj["page_width"],
                        obj["page_height"],
                    )
                    for obj in vision_objects
                ],
            )

        conn.commit()
        print("Successfully processed", job["name"])

    except Exception as e:
        print(f"Error processing {job['name']}: {str(e)}")
        conn.rollback()
        raise
    finally:
        # Clean up temporary files
        if pdf_path and os.path.exists(pdf_path):
            try:
                os.remove(pdf_path)
            except Exception as e:
                print(f"Warning: Could not remove temp file {pdf_path}: {str(e)}")
        
        # Clean up extracted images
        if 'image_objects' in locals():
            image_upload_service.cleanup_local_files(image_objects)
    
    print("Done: ", job["name"])

def main():
    print("PDF Worker started - waiting for jobs...")
    job_count = 0
    
    while True:
        try:
            print(f"Checking for jobs... (checked {job_count} times)")
            job_json = redis.rpop("pdf_jobs")
            if job_json is None:
                print("No jobs in queue, sleeping for 2 seconds...")
                time.sleep(2)
                job_count += 1
                continue
                
            print(f"Found job! Processing...")
            process_job(json.loads(job_json))
            job_count = 0  # Reset counter after processing
            
            # for testing
            while True:
                user_input = input("\nWould you like to process another PDF? (y/n): ")
                if user_input in ['y']:
                    print("Continuing to wait for jobs...")
                    break
                elif user_input in ['n']:
                    print("Quitting")
                    return
                else:
                    print("Print y or n")
            
        except Exception as e:
            print(f"Error in main loop: {str(e)}")
            time.sleep(5)  # Wait longer on error

if __name__ == "__main__":
    main()

