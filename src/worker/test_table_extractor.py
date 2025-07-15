#!/usr/bin/env python3
"""
Test script for the new table extractor that uses layout parser
"""

import os
import sys
from table_extractor import TableExtractor
import fitz
import numpy as np

def test_table_extractor():
    """Test the table extractor with a sample PDF"""
    
    # Check if we have a test PDF
    test_pdf = "table_test.pdf"
    if not os.path.exists(test_pdf):
        print(f"Test PDF {test_pdf} not found. Please place a test PDF in the current directory.")
        return
    
    print("Testing table extractor...")
    
    try:
        # Initialize the table extractor
        extractor = TableExtractor()
        
        if not extractor._layout:
            print("Warning: Layout parser model not available. This is expected if the model hasn't been downloaded yet.")
            print("The extractor will return an empty list.")
            return
        
        # Open PDF
        doc = fitz.open(test_pdf)
        
        # Use layout parser to get table candidates (debug mode)
        layout_model = extractor._layout
        for page_num, page in enumerate(doc, 1):
            pix = page.get_pixmap(dpi=300, alpha=False)
            img = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, 3)[..., ::-1]
            layout_blocks = layout_model.detect(img)
            table_blocks = [block for block in layout_blocks if block.type in [3, 4]]
            for i, block in enumerate(table_blocks):
                x0, y0, x1, y1 = map(int, block.coordinates)
                text_rect = fitz.Rect(x0, y0, x1, y1)
                text_content = page.get_text("text", clip=text_rect).strip()
                # Write the raw text to a file for inspection
                out_path = f"table_candidate_page{page_num}_block{i}_rawtext.txt"
                with open(out_path, "w", encoding="utf-8") as f:
                    f.write(text_content)
                print(f"Wrote raw text for table candidate page {page_num} block {i} to {out_path} (chars: {len(text_content)})")
        doc.close()
        
        # Now run the normal extractor
        tables = extractor.extract(test_pdf)
        
        print(f"Found {len(tables)} tables")
        
        for i, table in enumerate(tables):
            print(f"\nTable {i+1}:")
            print(f"  Page: {table.get('page')}")
            print(f"  Filename: {table.get('filename')}")
            print(f"  Filepath: {table.get('filepath')}")
            print(f"  Bbox: {table.get('bbox')}")
            print(f"  Relative position: {table.get('relative_position')}")
            print(f"  Dimensions: {table.get('dimensions')}")
            print(f"  Group ID: {table.get('group_id')}")
            print(f"  Confidence: {table.get('confidence')}")
            
            # Check if the image file was created
            if os.path.exists(table.get('filepath', '')):
                print(f"  ✓ Image file created successfully")
            else:
                print(f"  ✗ Image file not found")
        
        print(f"\nTest completed. Extracted {len(tables)} tables.")
        
    except Exception as e:
        print(f"Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_table_extractor() 