import os
import requests
import json
from typing import Dict, List, Optional
import tempfile

class ImageUploadService:
    def __init__(self):
        self.vercel_token = os.environ.get("VERCEL_TOKEN")
        self.team_id = os.environ.get("VERCEL_TEAM_ID")
        self.project_id = os.environ.get("VERCEL_PROJECT_ID")
        
    def upload_to_vercel_blob(self, file_path: str, filename: str) -> Optional[str]:
        """Upload an image to Vercel Blob storage and return the public URL"""
        try:
            # First, get a presigned URL for upload
            presigned_url = self._get_presigned_url(filename)
            if not presigned_url:
                print(f"Failed to get presigned URL for {filename}")
                return None
            
            # Upload the file using the presigned URL
            with open(file_path, 'rb') as f:
                response = requests.put(presigned_url, data=f, headers={
                    'Content-Type': 'image/png'
                })
            
            if response.status_code == 200:
                # Extract the blob URL from the response
                blob_data = response.json()
                return blob_data.get('url')
            else:
                print(f"Upload failed for {filename}: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Error uploading {filename}: {e}")
            return None
    
    def _get_presigned_url(self, filename: str) -> Optional[str]:
        """Get a presigned URL for uploading to Vercel Blob"""
        try:
            # Create a temporary token for this upload
            token_data = {
                "allowedContentTypes": ["image/png", "image/jpeg", "image/gif"],
                "addRandomSuffix": True,
                "tokenPayload": json.dumps({"filename": filename})
            }
            
            # This would typically be done through Vercel's API
            # For now, we'll use a simplified approach
            # In production, you'd want to use Vercel's official SDK
            
            # For development, we'll return a placeholder
            # In production, implement proper Vercel Blob API calls
            return None
            
        except Exception as e:
            print(f"Error getting presigned URL: {e}")
            return None
    
    def upload_images_batch(self, image_objects: List[Dict]) -> List[Dict]:
        """Upload multiple images and tables and return updated objects with CDN URLs or local fallback URLs"""
        uploaded_objects = []
        
        for obj in image_objects:
            if obj.get("type") in ["image", "table"] and "filepath" in obj:
                filepath = obj["filepath"]
                filename = obj["filename"]
                obj_type = obj.get("type", "image")
                
                # Upload to CDN
                cdn_url = self.upload_to_vercel_blob(filepath, filename)
                
                if cdn_url:
                    # Update the object with CDN URL
                    updated_obj = obj.copy()
                    updated_obj["cdn_url"] = cdn_url
                    uploaded_objects.append(updated_obj)
                    print(f"Successfully uploaded {obj_type} {filename} to {cdn_url}")
                else:
                    # Local fallback: if file exists, set local static URL
                    if os.path.exists(filepath):
                        # The public path should match your Next.js static serving
                        # e.g. /pdf-assets/{pdf_name}/{filename}
                        pdf_name = os.path.basename(os.path.dirname(filepath))
                        local_url = f"/pdf-assets/{pdf_name}/{filename}"
                        obj["cdn_url"] = local_url
                        print(f"Using local fallback for {obj_type} {filename}: {local_url}")
                    else:
                        obj["upload_failed"] = True
                        print(f"Failed to upload {obj_type} {filename} and no local fallback found")
                    uploaded_objects.append(obj)
            else:
                uploaded_objects.append(obj)
        
        return uploaded_objects
    
    def cleanup_local_files(self, image_objects: List[Dict]):
        """Clean up local image and table files after upload"""
        for obj in image_objects:
            if obj.get("type") in ["image", "table"] and "filepath" in obj:
                filepath = obj["filepath"]
                obj_type = obj.get("type", "image")
                try:
                    if os.path.exists(filepath):
                        os.remove(filepath)
                        print(f"Cleaned up {obj_type} {filepath}")
                except Exception as e:
                    print(f"Error cleaning up {obj_type} {filepath}: {e}") 