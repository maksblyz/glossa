import os, time, json, tempfile, requests
from upstash_redis import Redis
import psycopg2, psycopg2.extras

from text_extractor import TextExtractor
from image_extractor import ImageExtractor
from table_extractor import TableExtractor

redis = Redis(
    url =os.environ["UPSTASH_REDIS_REST_URL"],
    token=os.environ["UPSTASH_REDIS_REST_TOKEN"]
)

connect = psycopg2.connect(os.environ["DATABASE_URL"])
cursor = connect.cursor()

text = TextExtractor()
images = ImageExtractor()
tables = TableExtractor()



