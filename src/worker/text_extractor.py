import fitz  # PyMuPDF
from base_extractor import BaseExtractor
from operator import itemgetter

class TextExtractor(BaseExtractor):
    """
    Extracts text from a PDF, preserving the block structure.
    This approach is superior to sentence-based extraction because it
    maintains the document's original layout (headings, paragraphs, etc.),
    giving the LLM the necessary context for proper formatting.
    """
    def extract(self, pdf_path: str) -> list[dict]:
        doc = fitz.open(pdf_path)
        blocks = []
        for page_num, page in enumerate(doc, 1):
            # Extract text blocks from the page as a dictionary
            page_blocks = page.get_text("dict")["blocks"]
            for block in page_blocks:
                # We are only interested in text blocks (type 0)
                if block.get("type", 1) != 0:
                    continue

                # Reconstruct the text content of the block
                block_text = ""
                for line in block.get("lines", []):
                    # Join spans within a line with a space
                    line_text = " ".join([span.get("text", "") for span in line.get("spans", [])])
                    block_text += line_text + " " # Add the reconstructed line and a space

                # Skip empty blocks
                if not block_text.strip():
                    continue

                blocks.append({
                    "id": f"{page_num}-{block['number']}",
                    "type": "text",
                    "content": block_text.strip(),
                    "bbox": list(block["bbox"]),
                    "page": page_num,
                })
        doc.close()
        return blocks