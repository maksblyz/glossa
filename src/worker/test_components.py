#!/usr/bin/env python3
"""
Test script for the new JSON-based component system
"""

import os
from llm_cleaner import components_from_chunks, tsx_from_chunks

# Test data with various content types
test_chunks = [
    {"content": "INTRODUCTION"},
    {"content": "This is a sample document with some text."},
    {"content": "It contains multiple paragraphs and should be formatted properly."},
    {"content": "1. First item in a list"},
    {"content": "2. Second item in a list"},
    {"content": "3. Third item in a list"},
    {"content": "θ = argmin L(θ) (1.6)"},
    {"content": "This is called empirical risk minimization."},
    {"content": "CONCLUSION"},
    {"content": "This concludes our test document."}
]

def test_component_system():
    """Test the new component-based system"""
    try:
        print("Testing new component system...")
        
        # Test the new components function
        components = components_from_chunks(test_chunks)
        print(f"Generated {len(components)} components")
        
        # Print each component
        for i, component in enumerate(components):
            print(f"\nComponent {i + 1}:")
            print(f"  Type: {component['component']}")
            print(f"  Props: {component['props']}")
        
        # Test backward compatibility
        print("\n" + "="*50)
        print("Testing backward compatibility...")
        html_result = tsx_from_chunks(test_chunks)
        print("Generated HTML:")
        print(html_result)
        
        return True
    except Exception as e:
        print(f"Error testing component system: {e}")
        return False

if __name__ == "__main__":
    test_component_system() 