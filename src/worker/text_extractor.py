import fitz
import spacy
from . import BaseExtractor
from collections import defaultdict

class TextExtractor(BaseExtractor):
    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")

    def extract(self, pdf_path: str) -> list[dict]:
        doc = fitz.open(pdf_path)
        extracted = []

        for page_number, page in enumerate(doc, start=1):
            full_text, char_map = self._extract_page_text(page)
            sentence_spans = self._split_sentences(full_text)
            page_sentences = self._build_sentence_objects(sentence_spans, char_map, page_number)
            extracted.extend(page_sentences)

        doc.close()
        return extracted

    def _extract_page_text(self, page):
        text_dict = page.get_text("rawdict")
        full_text = ""
        char_map = []

        for block in text_dict["blocks"]:
            if block.get("type") != 0:
                continue

            for line in block["lines"]:
                for span in line["spans"]:
                    for char in span.get("chars", []):
                        c = char["c"]
                        full_text += c
                        char_map.append({
                            "char": c,
                            "bbox": char["bbox"]
                        })

        return full_text, char_map

    def _split_sentences(self, full_text):
        doc = self.nlp(full_text)
        return [(s.start_char, s.end_char, s.text.strip()) for s in doc.sents]

    def _build_sentence_objects(self, sentence_spans, char_map, page_number):
        results = []

        for start, end, sent_text in sentence_spans:
            chars = char_map[start:end]
            if not chars:
                continue

            # group by visual line (same y0 within a tolerance)
            lines = defaultdict(list)
            for c in chars:
                y_top = round(c["bbox"][1] / 2) * 2  # group by y0, ~2pt tolerance
                lines[y_top].append(c)

            for line_chars in lines.values():
                bboxes = [c["bbox"] for c in line_chars]
                x0 = min(b[0] for b in bboxes)
                y0 = min(b[1] for b in bboxes)
                x1 = max(b[2] for b in bboxes)
                y1 = max(b[3] for b in bboxes)

                results.append({
                    "type": "text",
                    "content": sent_text,  # same full sentence for all line chunks
                    "bbox": [x0, y0, x1, y1],
                    "page": page_number
                })

        return results