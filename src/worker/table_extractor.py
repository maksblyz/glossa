import camelot, fitz
from base_extractor import BaseExtractor

class TableExtractor(BaseExtractor):
    def extract(self, pdf_path: str) -> list[dict]:
        doc = fitz.open(pdf_path)
        extracted = []
        tables = camelot.read_pdf(pdf_path, flavor='stream', pages='all')
        for i, table in enumerate(tables):
            pg = int(table.page)
            pw = doc[pg - 1].rect.width
            ph = doc[pg-1].rect.height

            # Convert the table DataFrame to a dictionary format
            df = table.df
            table_dict = {}
            for row_idx, row in df.iterrows():
                table_dict[str(row_idx)] = {}
                for col_idx, value in enumerate(row):
                    table_dict[str(row_idx)][str(col_idx)] = str(value)
            
            extracted.append({
                "type": "table",
                "content": table_dict,
                "bbox": table._bbox,
                "page": int(pg),
                "page_width": pw,
                "page_height": ph,
            })

        doc.close()
        return extracted