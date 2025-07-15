import fitz
import os
import hashlib
import tempfile
from base_extractor import BaseExtractor
from PIL import Image
import io
import shutil
import numpy as np
import layoutparser as lp
from pathlib import Path
from collections import defaultdict

MODEL = Path("~/.torch/iopath_cache/s/dgy9c10wykk4lq4/model_final.pth").expanduser()

class TableExtractor(BaseExtractor):
    def __init__(self):
        # Initialize layout parser model for table detection
        try:
            self._layout = lp.Detectron2LayoutModel(
                "lp://PubLayNet/faster_rcnn_R_50_FPN_3x/config",
                model_path=str(MODEL),
                extra_config=["MODEL.ROI_HEADS.SCORE_THRESH_TEST", 0.5],
            )
        except Exception as e:
            print(f"Warning: Could not load layout parser model: {e}")
            self._layout = None

    def extract(self, pdf_path: str) -> list[dict]:
        if not self._layout:
            print("Layout parser model not available, skipping table extraction")
            return []
            
        extracted = []
        doc = fitz.open(pdf_path)
        
        # Create directory for extracted tables
        pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]
        tables_dir = os.path.join("extracted_images", pdf_name)
        os.makedirs(tables_dir, exist_ok=True)

        # Path to Next.js public assets
        public_assets_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../public/pdf-assets', pdf_name))
        os.makedirs(public_assets_dir, exist_ok=True)

        # Deduplication: global set of hashes
        seen_hashes = set()
        # For grouping: group tables by page and similar relative_y
        page_groups = defaultdict(list)

        for page_number, page in enumerate(doc, start=1):
            try:
                # Rasterize the page at high DPI for better table detection
                pix = page.get_pixmap(dpi=300, alpha=False)
                img = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, 3)[..., ::-1]
                page_rect = page.rect

                # Detect layout elements
                layout_blocks = self._layout.detect(img)
                
                # PubLayNet: block.type == 3 or 4 can both be tables (different table styles)
                table_blocks = [block for block in layout_blocks if block.type in [3, 4]]
                
                # Filter out overlapping table blocks (keep the one with more text content)
                filtered_table_blocks = []
                for block in table_blocks:
                    x0, y0, x1, y1 = map(int, block.coordinates)
                    block_area = (x1 - x0) * (y1 - y0)
                    
                    # Extract text content for this block
                    text_rect = fitz.Rect(x0, y0, x1, y1)
                    text_content = page.get_text("text", clip=text_rect).strip()
                    char_count = len(text_content)
                    
                    # Check if this block overlaps significantly with any existing block
                    is_duplicate = False
                    for existing_block in filtered_table_blocks:
                        ex0, ey0, ex1, ey1 = map(int, existing_block.coordinates)
                        existing_area = (ex1 - ex0) * (ey1 - ey0)
                        
                        # Calculate intersection
                        ix0, iy0, ix1, iy1 = max(x0, ex0), max(y0, ey0), min(x1, ex1), min(y1, ey1)
                        if ix0 < ix1 and iy0 < iy1:  # There is intersection
                            intersection_area = (ix1 - ix0) * (iy1 - iy0)
                            overlap_ratio = intersection_area / min(block_area, existing_area)
                            
                            if overlap_ratio > 0.7:  # More than 70% overlap
                                # Get text content for existing block
                                existing_text_rect = fitz.Rect(ex0, ey0, ex1, ey1)
                                existing_text_content = page.get_text("text", clip=existing_text_rect).strip()
                                existing_char_count = len(existing_text_content)
                                
                                # Keep the one with more text content
                                if char_count > existing_char_count:
                                    filtered_table_blocks.remove(existing_block)
                                    filtered_table_blocks.append(block)
                                is_duplicate = True
                                break
                    
                    if not is_duplicate:
                        filtered_table_blocks.append(block)
                
                table_blocks = filtered_table_blocks
                
                # Verify that detected "tables" actually contain text/data (not just images)
                verified_table_blocks = []
                for block in table_blocks:
                    x0, y0, x1, y1 = map(int, block.coordinates)
                    
                    # Extract text from this region using PyMuPDF
                    text_rect = fitz.Rect(x0, y0, x1, y1)
                    text_content = page.get_text("text", clip=text_rect).strip()
                    
                    # Check if this region contains any text (likely a table or a figure with text)
                    if len(text_content) > 0:  # Any text at all
                        verified_table_blocks.append(block)
                        print(f"Verified table on page {page_number}: {len(text_content)} chars of text")
                    else:
                        print(f"Rejected table candidate on page {page_number}: only {len(text_content)} chars (likely an image)")
                        if len(text_content) > 0:
                            print(f"  Text preview: '{text_content[:100]}...'")
                
                table_blocks = verified_table_blocks
                
                for table_index, table_block in enumerate(table_blocks):
                    try:
                        # Get table coordinates
                        x0, y0, x1, y1 = map(int, table_block.coordinates)
                        
                        # Crop the table region
                        table_crop = img[y0:y1, x0:x1]
                        
                        # Convert to PIL Image and save
                        table_pil = Image.fromarray(table_crop)
                        
                        # Create a unique filename
                        table_hash = hashlib.md5(table_crop.tobytes()).hexdigest()
                        if table_hash in seen_hashes:
                            continue  # skip duplicate
                        seen_hashes.add(table_hash)
                        
                        filename = f"page_{page_number}_table_{table_index}_{table_hash[:8]}.png"
                        filepath = os.path.join(tables_dir, filename)
                        
                        # Save the table image
                        table_pil.save(filepath, "PNG")
                        
                        # Copy to public assets
                        public_path = os.path.join(public_assets_dir, filename)
                        shutil.copyfile(filepath, public_path)
                        
                        # Calculate relative position
                        rel_x = x0 / pix.w
                        rel_y = y0 / pix.h
                        rel_width = (x1 - x0) / pix.w
                        rel_height = (y1 - y0) / pix.h
                        
                        # Get table dimensions
                        table_width, table_height = table_pil.size
                        
                        # Store table info similar to images
                        page_groups[page_number].append({
                            "type": "table",
                            "bbox": [x0, y0, x1, y1],
                            "page": page_number,
                            "filename": filename,
                            "filepath": filepath,
                            "relative_position": {
                                "x": rel_x,
                                "y": rel_y,
                                "width": rel_width,
                                "height": rel_height
                            },
                            "dimensions": {
                                "width": table_width,
                                "height": table_height
                            },
                            "content_hash": table_hash,
                            "is_inline": False,
                            "confidence": table_block.score if hasattr(table_block, 'score') else 0.5
                        })
                        
                        print(f"Extracted table {table_index + 1} on page {page_number}: {filename}")
                        
                    except Exception as e:
                        print(f"Error extracting table {table_index + 1} on page {page_number}: {e}")
                        continue
                        
            except Exception as e:
                print(f"Error processing page {page_number} for tables: {e}")
                continue

        # Grouping: assign group_id to horizontally-aligned tables (same page, similar rel_y)
        grouped_extracted = []
        for page, tables in page_groups.items():
            # Sort by rel_y, then rel_x
            tables = sorted(tables, key=lambda t: (round(t['relative_position']['y'], 2), t['relative_position']['x']))
            group_id = 0
            last_y = None
            for table in tables:
                y = round(table['relative_position']['y'], 2)
                if last_y is not None and abs(y - last_y) > 0.05:
                    group_id += 1
                table['group_id'] = f"page{page}_table_group{group_id}"
                last_y = y
                grouped_extracted.append(table)

        doc.close()
        return grouped_extracted