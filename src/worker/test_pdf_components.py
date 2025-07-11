#!/usr/bin/env python3
"""
Test script to process a real PDF with the new component system
"""

import os
from text_extractor import TextExtractor
from llm_cleaner import components_from_chunks, tsx_from_chunks

def test_pdf_processing():
    """Test processing a real PDF with the component system"""
    try:
        print("Testing PDF processing with component system...")
        
        # Use the sample PDF
        pdf_path = "glasso_sample.pdf"
        
        if not os.path.exists(pdf_path):
            print(f"PDF file {pdf_path} not found")
            return False
        
        # Extract text chunks
        text_extractor = TextExtractor()
        text_objects = text_extractor.extract(pdf_path)
        print(f"Extracted {len(text_objects)} text objects")
        
        if not text_objects:
            print("No text objects extracted")
            return False
        
        # Process with new component system
        print("\nProcessing with component system...")
        components = components_from_chunks(text_objects)
        print(f"Generated {len(components)} components")
        
        # Show first few components
        print("\nFirst 5 components:")
        for i, component in enumerate(components[:5]):
            print(f"\nComponent {i + 1}:")
            print(f"  Type: {component['component']}")
            print(f"  Props: {component['props']}")
        
        # Test backward compatibility
        print("\n" + "="*50)
        print("Testing backward compatibility...")
        html_result = tsx_from_chunks(text_objects)
        print("Generated HTML (first 500 chars):")
        print(html_result[:500] + "..." if len(html_result) > 500 else html_result)
        
        return True
        
    except Exception as e:
        print(f"Error testing PDF processing: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_pdf_processing() 