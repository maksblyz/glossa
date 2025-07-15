#!/usr/bin/env python3
"""
Test script to verify text extraction produces properly spaced text
"""

import os
from text_extractor import TextExtractor

def test_text_extraction():
    """Test the text extractor with a sample PDF"""
    
    # Check if we have a test PDF
    test_pdf = "table_test.pdf"
    if not os.path.exists(test_pdf):
        print(f"Test PDF {test_pdf} not found. Please place a test PDF in the current directory.")
        return
    
    print("Testing text extraction...")
    
    try:
        # Initialize the text extractor
        extractor = TextExtractor()
        
        # Extract text
        text_blocks = extractor.extract(test_pdf)
        
        print(f"Found {len(text_blocks)} text blocks")
        
        # Show first few blocks to check spacing
        for i, block in enumerate(text_blocks[:5]):
            print(f"\nBlock {i+1} (Page {block.get('page')}):")
            content = block.get('content', '')
            print(f"Content: {repr(content)}")
            print(f"Length: {len(content)} chars")
            if len(content) > 100:
                print(f"Preview: {content[:100]}...")
            else:
                print(f"Full content: {content}")
        
        # Look for blocks that might contain the problematic text
        for i, block in enumerate(text_blocks):
            content = block.get('content', '')
            if 'ScaledDot' in content or 'querywithallkeys' in content or 'Figure2' in content:
                print(f"\nFound problematic text in block {i+1} (Page {block.get('page')}):")
                print(f"Content: {repr(content)}")
                print(f"Length: {len(content)} chars")
        
        print(f"\nTest completed. Extracted {len(text_blocks)} text blocks.")
        
    except Exception as e:
        print(f"Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_text_extraction() 