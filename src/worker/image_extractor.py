import fitz
import os
import hashlib
import tempfile
from base_extractor import BaseExtractor
from PIL import Image
import io
import shutil
from collections import defaultdict

class ImageExtractor(BaseExtractor):
    def extract(self, pdf_path: str) -> list[dict]:
        extracted = []
        doc = fitz.open(pdf_path)
        
        # Create directory for extracted images
        pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]
        images_dir = os.path.join("extracted_images", pdf_name)
        os.makedirs(images_dir, exist_ok=True)

        # Path to Next.js public assets
        public_assets_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../public/pdf-assets', pdf_name))
        os.makedirs(public_assets_dir, exist_ok=True)

        # Deduplication: global set of hashes
        seen_hashes = set()
        # For grouping: group images by page and similar relative_y
        page_groups = defaultdict(list)

        for page_number, page in enumerate(doc, start=1):
            images = page.get_images(full=True)
            page_rect = page.rect
            for img_index, img in enumerate(images):
                xref = img[0]
                for inst in page.get_image_info(xref):
                    bbox = inst['bbox']
                    try:
                        pix = fitz.Pixmap(doc, xref)
                        if pix.n - pix.alpha < 4:
                            img_data = pix.tobytes("png")
                        else:
                            pix1 = fitz.Pixmap(fitz.csRGB, pix)
                            img_data = pix1.tobytes("png")
                            pix1 = None
                        img_hash = hashlib.md5(img_data).hexdigest()
                        if img_hash in seen_hashes:
                            continue  # skip duplicate
                        seen_hashes.add(img_hash)
                        filename = f"page_{page_number}_img_{img_index}_{img_hash[:8]}.png"
                        filepath = os.path.join(images_dir, filename)
                        with open(filepath, "wb") as f:
                            f.write(img_data)
                        public_path = os.path.join(public_assets_dir, filename)
                        shutil.copyfile(filepath, public_path)
                        rel_x = bbox[0] / page_rect.width
                        rel_y = bbox[1] / page_rect.height
                        rel_width = (bbox[2] - bbox[0]) / page_rect.width
                        rel_height = (bbox[3] - bbox[1]) / page_rect.height
                        img_pil = Image.open(io.BytesIO(img_data))
                        img_width, img_height = img_pil.size
                        # For grouping: store by page and rel_y
                        page_groups[page_number].append({
                            "type": "image",
                            "bbox": list(bbox),
                            "page": page_number,
                            "xref": xref,
                            "filename": filename,
                            "filepath": filepath,
                            "relative_position": {
                                "x": rel_x,
                                "y": rel_y,
                                "width": rel_width,
                                "height": rel_height
                            },
                            "dimensions": {
                                "width": img_width,
                                "height": img_height
                            },
                            "content_hash": img_hash,
                            "is_inline": False  # TODO: detect inline images
                        })
                        pix = None
                    except Exception as e:
                        print(f"Error extracting image on page {page_number}: {e}")
                        continue
        # Grouping: assign group_id to horizontally-aligned images (same page, similar rel_y)
        grouped_extracted = []
        for page, imgs in page_groups.items():
            # Sort by rel_y, then rel_x
            imgs = sorted(imgs, key=lambda i: (round(i['relative_position']['y'], 2), i['relative_position']['x']))
            group_id = 0
            last_y = None
            for img in imgs:
                y = round(img['relative_position']['y'], 2)
                if last_y is not None and abs(y - last_y) > 0.05:
                    group_id += 1
                img['group_id'] = f"page{page}_group{group_id}"
                last_y = y
                grouped_extracted.append(img)
        doc.close()
        return grouped_extracted
