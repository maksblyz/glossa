#!/usr/bin/env python3
"""
Test script to verify deduplication is working correctly
"""

import os
from text_extractor import TextExtractor
from image_extractor import ImageExtractor
from table_extractor import TableExtractor
from llm_cleaner import components_from_chunks

def test_deduplication():
    """Test that deduplication is working correctly"""
    
    # Check if we have a test PDF
    test_pdf = "table_test.pdf"
    if not os.path.exists(test_pdf):
        print(f"Test PDF {test_pdf} not found. Please place a test PDF in the current directory.")
        return
    
    print("Testing deduplication...")
    
    try:
        # Extract text, images, and tables
        text_extractor = TextExtractor()
        image_extractor = ImageExtractor()
        table_extractor = TableExtractor()
        
        text_blocks = text_extractor.extract(test_pdf)
        image_objects = image_extractor.extract(test_pdf)
        table_objects = table_extractor.extract(test_pdf)
        
        # Process through LLM to get components
        components = components_from_chunks(text_blocks, image_objects, table_objects)
        
        print(f"Generated {len(components)} components")
        
        # Check for duplicates
        image_srcs = []
        table_srcs = []
        figure_titles = []
        figure_captions = []
        
        for comp in components:
            comp_type = comp.get('component', '')
            props = comp.get('props', {})
            
            if comp_type == 'Image':
                src = props.get('src', '')
                if src:
                    image_srcs.append(src)
            elif comp_type == 'Table':
                src = props.get('src', '')
                if src:
                    table_srcs.append(src)
            elif comp_type == 'FigureTitle':
                text = props.get('text', '')
                if text:
                    figure_titles.append(text)
            elif comp_type == 'FigureCaption':
                text = props.get('text', '')
                if text:
                    figure_captions.append(text)
        
        # Check for duplicates and grouped instances
        duplicate_images = [src for src in set(image_srcs) if image_srcs.count(src) > 1]
        duplicate_tables = [src for src in set(table_srcs) if table_srcs.count(src) > 1]
        duplicate_titles = [text for text in set(figure_titles) if figure_titles.count(text) > 1]
        duplicate_captions = [text for text in set(figure_captions) if figure_captions.count(text) > 1]
        
        print(f"\nDeduplication Results:")
        print(f"  - Images: {len(image_srcs)} total, {len(set(image_srcs))} unique sources")
        print(f"  - Tables: {len(table_srcs)} total, {len(set(table_srcs))} unique sources")
        print(f"  - Figure Titles: {len(figure_titles)} total, {len(set(figure_titles))} unique")
        print(f"  - Figure Captions: {len(figure_captions)} total, {len(set(figure_captions))} unique")
        
        if duplicate_images:
            print(f"  📊 Found {len(duplicate_images)} image sources with multiple instances (grouped images): {duplicate_images}")
        else:
            print(f"  ✅ No grouped images found")
            
        if duplicate_tables:
            print(f"  📊 Found {len(duplicate_tables)} table sources with multiple instances (grouped tables): {duplicate_tables}")
        else:
            print(f"  ✅ No grouped tables found")
            
        if duplicate_titles:
            print(f"  ⚠️  Found {len(duplicate_titles)} duplicate titles: {duplicate_titles}")
        else:
            print(f"  ✅ No duplicate titles found")
            
        if duplicate_captions:
            print(f"  ⚠️  Found {len(duplicate_captions)} duplicate captions: {duplicate_captions}")
        else:
            print(f"  ✅ No duplicate captions found")
        
        print(f"\nTest completed successfully!")
        
    except Exception as e:
        print(f"Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_deduplication() 