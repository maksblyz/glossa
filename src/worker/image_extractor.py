import fitz
from base_extractor import BaseExtractor

class ImageExtractor(BaseExtractor):
    def extract(self, pdf_path: str) -> list[dict]:
        extracted = []
        doc = fitz.open(pdf_path)

        for page_number, page in enumerate(doc, start=1):
            pw = page.rect.width
            ph = page.rect.height
            images = page.get_images(full=True)
            for xref, *_ in enumerate(images):
                for inst in page.get_image_info(xref):
                    extracted.append({
                        "type": "image",
                        "bbox": list(inst["bbox"]),
                        "page": page_number,
                        "xref": xref,
                        "page_width": pw,
                        "page_height": ph,
                    })

        doc.close()
        return extracted
