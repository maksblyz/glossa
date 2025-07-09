#!/usr/bin/env python3
import sys
import json
from embedding_service import EmbeddingService

def main():
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Usage: python get_context.py <file_name> <sentence>"}))
        sys.exit(1)
    
    file_name = sys.argv[1]
    sentence = sys.argv[2]
    
    try:
        # Initialize embedding service
        embedding_service = EmbeddingService()
        
        # Get context for the sentence
        context = embedding_service.get_context_for_sentence(file_name, sentence, n_results=3)
        
        # Output as JSON
        print(json.dumps(context, ensure_ascii=False))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main() 