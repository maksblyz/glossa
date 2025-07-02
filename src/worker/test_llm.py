#!/usr/bin/env python3
"""
Test script for the LLM cleaner
"""

import os
from llm_cleaner import tsx_from_chunks

# Test data
test_chunks = [
    {"content": "INTRODUCTION"},
    {"content": "This is a sample document with some text."},
    {"content": "It contains multiple paragraphs and should be formatted properly."},
    {"content": "1. First item in a list"},
    {"content": "2. Second item in a list"},
    {"content": "3. Third item in a list"},
    {"content": "CONCLUSION"},
    {"content": "This concludes our test document."}
]

def test_llm_cleaner():
    """Test the LLM cleaner with sample data"""
    try:
        print("Testing LLM cleaner...")
        result = tsx_from_chunks(test_chunks)
        print("Success! Generated TSX:")
        print("=" * 50)
        print(result)
        print("=" * 50)
        return True
    except Exception as e:
        print(f"Error testing LLM cleaner: {e}")
        return False

if __name__ == "__main__":
    # Check if OpenAI API key is set
    if not os.environ.get("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY environment variable not set")
        exit(1)
    
    test_llm_cleaner() 