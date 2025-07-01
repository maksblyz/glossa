import fitz, cv2, numpy as np, layoutparser as lp, spacy, uuid
from doctr.models import ocr_predictor
from base_extractor import BaseExtractor
from pathlib import Path


MODEL = Path("~/.torch/iopath_cache/s/dgy9c10wykk4lq4/model_final.pth").expanduser()

class VisionExtractor(BaseExtractor):
    _layout = lp.Detectron2LayoutModel("lp://PubLayNet/faster_rcnn_R_50_FPN_3x/config",
        model_path=str(MODEL),
        extra_config=["MODEL.ROI_HEADS.SCORE_THRESH_TEST", 0.5],
    )

    _ocr = ocr_predictor('db_resnet50', 'crnn_vgg16_bn', pretrained=True)
    # split sentences
    _nlp = spacy.load("en_core_web_sm")


    def extract(self, pdf_path: str) -> list[dict]:
        doc = fitz.open(pdf_path)
        out = []
        
        try:
            for pnum, page in enumerate(doc, 1):
                # raster
                pix = page.get_pixmap(dpi=300, alpha=False)
                img = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, 3)[..., ::-1]

                # detect layout
                for block in self._layout.detect(img):
                    if block.type not in {"Text", "Title"}:
                        continue
                    x0, y0, x1, y1 = map(int, block.coordinates)
                    crop = img[y0:y1, x0:x1]

                    # OCR
                    result = self._ocr([crop])[0]
                    lines = result.pages[0].blocks

                    words = []
                    for ln in lines:
                        for line in ln.lines:
                            for w in line.words:
                                coords = [
                                    x0 + int(w.geometry[0]),
                                    y0 + int(w.geometry[1]),
                                    x0 + int(w.geometry[2]),
                                    y0 + int(w.geometry[3])
                                ]
                                words.append((w.value, coords))     
                    
                    if not words:
                        continue

                    raw = " ".join(w for w,_ in words)
                    sent_spans = self._nlp(raw).sents
                    idx = 0
                    for s in sent_spans:
                        token_cnt = len(s.text.split())
                        
                        # Ensure we don't go out of bounds
                        if idx + token_cnt > len(words):
                            token_cnt = len(words) - idx
                        
                        if token_cnt <= 0:
                            continue
                            
                        # Calculate bounding box for this sentence
                        word_coords = words[idx:idx+token_cnt]
                        if not word_coords:
                            continue
                            
                        xs = [b[0] for _, b in word_coords] + [b[2] for _, b in word_coords]
                        ys = [b[1] for _, b in word_coords] + [b[3] for _, b in word_coords]
                        
                        if not xs or not ys:
                            continue
                            
                        bx = [min(xs), min(ys), max(xs), max(ys)]
                        
                        out.append({
                            "id": str(uuid.uuid4()),
                            "page": pnum,
                            "type": "text",
                            "content": s.text.strip(),
                            "bbox": bx,
                            "page_width": pix.w,
                            "page_height": pix.h,
                        })
                        idx += token_cnt
        except Exception as e:
            print(f"Error in vision extraction: {str(e)}")
            # Return empty list on error, don't crash the entire process
            return []
        finally:
            doc.close()
            
        return out
    

