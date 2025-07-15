#!/usr/bin/env python3
"""
Debug script to see what layout types are detected
"""

import fitz
import numpy as np
import layoutparser as lp
from pathlib import Path

MODEL = Path("~/.torch/iopath_cache/s/dgy9c10wykk4lq4/model_final.pth").expanduser()

def debug_layout_types():
    """Debug what layout types are detected"""
    
    test_pdf = "table_test.pdf"
    if not Path(test_pdf).exists():
        print(f"Test PDF {test_pdf} not found.")
        return
    
    try:
        # Initialize layout parser
        layout_model = lp.Detectron2LayoutModel(
            "lp://PubLayNet/faster_rcnn_R_50_FPN_3x/config",
            model_path=str(MODEL),
            extra_config=["MODEL.ROI_HEADS.SCORE_THRESH_TEST", 0.5],
        )
        
        # Open PDF
        doc = fitz.open(test_pdf)
        
        for page_num, page in enumerate(doc, 1):
            print(f"\n=== Page {page_num} ===")
            
            # Rasterize page
            pix = page.get_pixmap(dpi=300, alpha=False)
            img = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, 3)[..., ::-1]
            
            # Detect layout
            layout_blocks = layout_model.detect(img)
            
            print(f"Found {len(layout_blocks)} layout blocks")
            
            # Count by type
            type_counts = {}
            for block in layout_blocks:
                block_type = block.type
                type_counts[block_type] = type_counts.get(block_type, 0) + 1
                print(f"  Block {len(type_counts)}: type='{block_type}', score={block.score:.3f}, coords={block.coordinates}")
            
            print(f"Type counts: {type_counts}")
            
            # Check for table-like blocks (type 4 is typically Table in PubLayNet)
            table_candidates = [block for block in layout_blocks if block.type == 4]
            print(f"Table candidates (type 4): {len(table_candidates)}")
            for i, block in enumerate(table_candidates):
                print(f"  Table {i+1}: type={block.type}, score={block.score:.3f}, coords={block.coordinates}")
            
            # Also check other numeric types
            for block in layout_blocks:
                if isinstance(block.type, int):
                    print(f"  Numeric type {block.type}: score={block.score:.3f}")
        
        doc.close()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_layout_types() 