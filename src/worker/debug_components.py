#!/usr/bin/env python3
"""
Debug script to inspect component structure and group_ids
"""

import os
from text_extractor import TextExtractor
from image_extractor import ImageExtractor
from table_extractor import TableExtractor
from llm_cleaner import components_from_chunks

def debug_components():
    """Debug the component structure to understand grouping"""
    
    # Check if we have a test PDF
    test_pdf = "table_test.pdf"
    if not os.path.exists(test_pdf):
        print(f"Test PDF {test_pdf} not found. Please place a test PDF in the current directory.")
        return
    
    print("Debugging component structure...")
    
    try:
        # Extract text, images, and tables
        text_extractor = TextExtractor()
        image_extractor = ImageExtractor()
        table_extractor = TableExtractor()
        
        text_blocks = text_extractor.extract(test_pdf)
        image_objects = image_extractor.extract(test_pdf)
        table_objects = table_extractor.extract(test_pdf)
        
        print(f"Extracted {len(image_objects)} image objects:")
        for i, img in enumerate(image_objects):
            print(f"  Image {i+1}: filename={img.get('filename')} group_id={img.get('group_id')} page={img.get('page')}")
        
        print(f"\nExtracted {len(table_objects)} table objects:")
        for i, table in enumerate(table_objects):
            print(f"  Table {i+1}: filename={table.get('filename')} group_id={table.get('group_id')} page={table.get('page')}")
        
        # Process through LLM to get components
        components = components_from_chunks(text_blocks, image_objects, table_objects)
        
        print(f"\nGenerated {len(components)} components")
        
        # Analyze components
        image_components = [c for c in components if c.get('component') == 'Image']
        table_components = [c for c in components if c.get('component') == 'Table']
        
        print(f"\nImage components ({len(image_components)}):")
        for i, comp in enumerate(image_components):
            props = comp.get('props', {})
            print(f"  Image {i+1}: src={props.get('src')} group_id={props.get('group_id')} alt={props.get('alt', '')[:50]}...")
        
        print(f"\nTable components ({len(table_components)}):")
        for i, comp in enumerate(table_components):
            props = comp.get('props', {})
            print(f"  Table {i+1}: src={props.get('src')} group_id={props.get('group_id')} alt={props.get('alt', '')[:50]}...")
        
        # Check for grouped components
        image_groups = {}
        for comp in image_components:
            group_id = comp.get('props', {}).get('group_id', 'no-group')
            if group_id not in image_groups:
                image_groups[group_id] = []
            image_groups[group_id].append(comp)
        
        table_groups = {}
        for comp in table_components:
            group_id = comp.get('props', {}).get('group_id', 'no-group')
            if group_id not in table_groups:
                table_groups[group_id] = []
            table_groups[group_id].append(comp)
        
        print(f"\nImage groups:")
        for group_id, group in image_groups.items():
            print(f"  Group '{group_id}': {len(group)} images")
            for img in group:
                print(f"    - {img.get('props', {}).get('src')}")
        
        print(f"\nTable groups:")
        for group_id, group in table_groups.items():
            print(f"  Group '{group_id}': {len(group)} tables")
            for table in group:
                print(f"    - {table.get('props', {}).get('src')}")
        
        print(f"\nDebug completed!")
        
    except Exception as e:
        print(f"Error during debugging: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_components() 