import fitz
from . import BaseExtractor

class ImageExtractor(BaseExtractor):
    def extract(self, pdf_path: str) -> list[dict]:
        extracted = []
        doc = fitz.open(pdf_path)

        for page_number, page in enumerate(doc, start=1):
            images = page.get_images(full=True)
            for img_index, img in enumerate(images):
                xref = img[0]
                for inst in page.get_image_info(xref):
                    bbox = inst['bbox']
                    extracted.append({
                        "type": "image",
                        "bbox": list(bbox),
                        "page": page_number,
                        "xref": xref
                    })

        doc.close()
        return extracted
