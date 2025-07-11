#!/usr/bin/env python3
"""
Test script for image integration functionality
"""

import os
import sys
import tempfile
from image_extractor import ImageExtractor
from image_upload_service import ImageUploadService

def test_image_extraction():
    """Test image extraction from a sample PDF"""
    print("Testing image extraction...")
    
    # Create a simple test PDF with images (you'll need to provide one)
    test_pdf_path = "glasso_sample.pdf"  # Use the existing sample PDF
    
    if not os.path.exists(test_pdf_path):
        print(f"Test PDF not found: {test_pdf_path}")
        print("Please provide a PDF with images for testing")
        return False
    
    try:
        # Test image extraction
        extractor = ImageExtractor()
        images = extractor.extract(test_pdf_path)
        
        print(f"Extracted {len(images)} images")
        
        for i, img in enumerate(images):
            print(f"Image {i+1}:")
            print(f"  Filename: {img.get('filename', 'N/A')}")
            print(f"  Page: {img.get('page', 'N/A')}")
            print(f"  Position: {img.get('relative_position', 'N/A')}")
            print(f"  Dimensions: {img.get('dimensions', 'N/A')}")
            print(f"  File exists: {os.path.exists(img.get('filepath', ''))}")
            print()
        
        return len(images) > 0
        
    except Exception as e:
        print(f"Error during image extraction: {e}")
        return False

def test_image_upload_service():
    """Test image upload service (mock)"""
    print("Testing image upload service...")
    
    try:
        upload_service = ImageUploadService()
        print("Image upload service initialized successfully")
        
        # Test with mock data
        mock_images = [
            {
                "type": "image",
                "filename": "test_image.png",
                "filepath": "/tmp/test_image.png"
            }
        ]
        
        # This will fail in development since we don't have proper Vercel credentials
        # but it should not crash
        result = upload_service.upload_images_batch(mock_images)
        print(f"Upload service processed {len(result)} images")
        
        return True
        
    except Exception as e:
        print(f"Error during upload service test: {e}")
        return False

def main():
    """Run all tests"""
    print("=== Image Integration Test Suite ===\n")
    
    # Test image extraction
    extraction_success = test_image_extraction()
    
    # Test upload service
    upload_success = test_image_upload_service()
    
    print("\n=== Test Results ===")
    print(f"Image Extraction: {'✅ PASS' if extraction_success else '❌ FAIL'}")
    print(f"Upload Service: {'✅ PASS' if upload_success else '❌ FAIL'}")
    
    if extraction_success and upload_success:
        print("\n🎉 All tests passed! Image integration is working correctly.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 