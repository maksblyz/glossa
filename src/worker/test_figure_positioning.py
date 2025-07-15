#!/usr/bin/env python3
"""
Test script to verify figure positioning and title/caption detection
"""

import os
from text_extractor import TextExtractor
from image_extractor import ImageExtractor
from table_extractor import TableExtractor
from llm_cleaner import components_from_chunks

def test_figure_positioning():
    """Test the figure positioning system"""
    
    # Check if we have a test PDF
    test_pdf = "table_test.pdf"
    if not os.path.exists(test_pdf):
        print(f"Test PDF {test_pdf} not found. Please place a test PDF in the current directory.")
        return
    
    print("Testing figure positioning system...")
    
    try:
        # Extract text, images, and tables
        text_extractor = TextExtractor()
        image_extractor = ImageExtractor()
        table_extractor = TableExtractor()
        
        text_blocks = text_extractor.extract(test_pdf)
        image_objects = image_extractor.extract(test_pdf)
        table_objects = table_extractor.extract(test_pdf)
        
        print(f"Extracted: {len(text_blocks)} text blocks, {len(image_objects)} images, {len(table_objects)} tables")
        
        # Process through LLM to get components
        components = components_from_chunks(text_blocks, image_objects, table_objects)
        
        print(f"Generated {len(components)} components")
        
        # Show the structure of components
        for i, comp in enumerate(components[:10]):  # Show first 10
            comp_type = comp.get('component', 'Unknown')
            props = comp.get('props', {})
            
            if comp_type == 'FigureTitle':
                print(f"  {i+1}. {comp_type}: {props.get('text', '')}")
            elif comp_type == 'FigureCaption':
                print(f"  {i+1}. {comp_type}: {props.get('text', '')}")
            elif comp_type in ['Image', 'Table']:
                src = props.get('src', '')
                print(f"  {i+1}. {comp_type}: {src[:50]}...")
            elif comp_type == 'Text':
                text = props.get('text', '')
                print(f"  {i+1}. {comp_type}: {text[:50]}...")
            else:
                print(f"  {i+1}. {comp_type}")
        
        # Look for figure titles and captions
        figure_titles = [comp for comp in components if comp.get('component') == 'FigureTitle']
        figure_captions = [comp for comp in components if comp.get('component') == 'FigureCaption']
        images = [comp for comp in components if comp.get('component') == 'Image']
        tables = [comp for comp in components if comp.get('component') == 'Table']
        
        print(f"\nFound:")
        print(f"  - {len(figure_titles)} figure titles")
        print(f"  - {len(figure_captions)} figure captions")
        print(f"  - {len(images)} images")
        print(f"  - {len(tables)} tables")
        
        # Show figure titles
        for i, title in enumerate(figure_titles):
            print(f"  Figure Title {i+1}: {title.get('props', {}).get('text', '')}")
        
        # Show figure captions
        for i, caption in enumerate(figure_captions):
            print(f"  Figure Caption {i+1}: {caption.get('props', {}).get('text', '')}")
        
        print(f"\nTest completed successfully!")
        
    except Exception as e:
        print(f"Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_figure_positioning() 