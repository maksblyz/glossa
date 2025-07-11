import camelot
from base_extractor import BaseExtractor

def is_real_table(df):
    # Require at least 2 columns and 2 rows
    if df.shape[1] < 2 or df.shape[0] < 2:
        return False
    # Require at least half the cells to be non-empty
    non_empty = (df.values != '').sum()
    if non_empty < (df.shape[0] * df.shape[1]) // 2:
        return False
    # Optionally: check if first row looks like headers (not sentences)
    if any(len(str(x).split()) > 5 for x in df.iloc[0]):
        return False
    return True

class TableExtractor(BaseExtractor):
    def extract(self, pdf_path: str) -> list[dict]:
        extracted = []
        tables = camelot.read_pdf(pdf_path, flavor='stream', pages='all')
        for i, table in enumerate(tables):
            df = table.df
            if not is_real_table(df):
                continue  # skip this table
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