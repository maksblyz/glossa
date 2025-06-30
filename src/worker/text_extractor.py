import fitz
import spacy
from base_extractor import BaseExtractor
from collections import defaultdict

class TextExtractor(BaseExtractor):
    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")

    def extract(self, pdf_path: str) -> list[dict]:
        doc = fitz.open(pdf_path)
        out = []

        for page_no, page in enumerate(doc, 1):
            out.extend(self._page_sentences(page, page_no))

        doc.close()
        return out

    # NEW
    def _page_sentences(self, page: fitz.Page, page_no: int) -> list[dict]:
        words = page.get_text("words") 
        if not words:
            return []

        # Build concatenated text plus per word char offsets
        pieces, positions = [], []
        pos = 0
        for w in words:
            txt = w[4]
            pieces.append(txt)
            start, end = pos, pos + len(txt)
            positions.append((start, end))
            pos = end + 1 # +1 for injected space

        full = " ".join(pieces)
        doc   = self.nlp(full)

        out = []
        for sent in doc.sents:
            # grab every word whose char range intersects the sentence span
            idxs = [i for i,(s,e) in enumerate(positions)
                    if e > sent.start and s < sent.end]
            if not idxs:
                continue

            xs = [words[i][0] for i in idxs] + [words[i][2] for i in idxs]
            ys = [words[i][1] for i in idxs] + [words[i][3] for i in idxs]

            out.append({
                "type":    "text",
                "content": sent.text.strip(),
                "bbox":    [min(xs), min(ys), max(xs), max(ys)],
                "page":    page_no,
            })

        return out
