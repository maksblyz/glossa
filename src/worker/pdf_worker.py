import os, time, json, tempfile, requests
from upstash_redis import Redis
import psycopg2, psycopg2.extras

from text_extractor import TextExtractor
from image_extractor import ImageExtractor
from table_extractor import TableExtractor
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

text = TextExtractor()
images = ImageExtractor()
tables = TableExtractor()

def download_blob(url: str) -> str:
    # download temp file
    response = requests.get(url, timeout=30)
    response.raise_for_status()

    file_descriptor, temp_path = tempfile.mkstemp(suffix=".pdf")
    with open(file_descriptor, "wb") as temp_file:
        temp_file.write(response.content)
    return temp_path

def process_job(job:dict):
    print("Processing:", job["name"])
    pdf_path = download_blob(job["url"])

    extracted_objects = (
        text.extract(pdf_path) +
        images.extract(pdf_path) +
        tables.extract(pdf_path)
    )

    psycopg2.extras.execute_values(
        cursor,
        """ 
        INSERT INTO pdf_objects (file, page, type, content, bbox)
        VALUES %s
        """,
        [
            (
                job["name"],
                obj["page"],
                obj["type"],
                safe_json(obj.get("content", {})),
                json.dumps(obj.get("bbox", [])),
            )
            for obj in extracted_objects
        ],
    )

    conn.commit()
    os.remove(pdf_path)
    print("Done: ", job["name"])

def main():
    while True:
        job_json = redis.rpop("pdf_jobs")
        if job_json is None:
            time.sleep(2)
            continue
        process_job(json.loads(job_json))

if __name__ == "__main__":
    main()

