import camelot
from . import BaseExtractor

class TableExtractor(BaseExtractor):
    def extract(self, pdf_path: str) -> list[dict]:
        extracted = []
        tables = camelot.read_pdf(pdf_path, flavor='stream', pages='all')
        for i, table in enumerate(tables):
            df = table.df
            page_number = table.page
            print(f"Table {i+1} on page {page_number}:")
            print(df)
            
            extracted.append({
                "type": "table",
                "content": df.to_dict(),
                "bbox": table._bbox,
                "page": int(page_number)
            })

        return extracted