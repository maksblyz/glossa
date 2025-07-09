#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from embedding_service import EmbeddingService

def test_embedding_service():
    print("Testing Embedding Service...")
    
    # Initialize the service
    embedding_service = EmbeddingService()
    
    # Test HTML content
    test_html = """
    <div class="academic-paper">
        <h2>1.2 Supervised Learning</h2>
        <p><span class="clickable-sentence">One way to define the problem of supervised learning is to assume that we have a training set of examples.</span></p>
        <span class="equation clickable-sentence">
            <span class="equation-content">$$ \\theta = \\underset{{\\theta}}{{\\mathrm{{argmin}}}} \\, \\mathcal{{L}}(\\theta) $$</span>
            <span class="equation-number">(1.6)</span>
        </span>
        <p><span class="clickable-sentence">This is called empirical risk minimization.</span></p>
    </div>
    """
    
    # Test file name
    test_file = "test_document.pdf"
    
    print("Creating embeddings...")
    result = embedding_service.create_embeddings(test_file, test_html)
    print(f"Created {result['chunk_count']} chunks")
    print(f"Collection name: {result['collection_name']}")
    
    # Test search
    print("\nTesting search...")
    search_results = embedding_service.search_similar(test_file, "supervised learning", n_results=3)
    print(f"Found {len(search_results)} similar chunks:")
    for i, result in enumerate(search_results):
        print(f"{i+1}. {result['content'][:100]}...")
    
    # Test context retrieval
    print("\nTesting context retrieval...")
    context = embedding_service.get_context_for_sentence(test_file, "One way to define the problem of supervised learning")
    print(f"Context for sentence: {context['clicked_sentence']}")
    if context['immediate_context']:
        print(f"Previous: {context['immediate_context']['previous']}")
        print(f"Next: {context['immediate_context']['next']}")
    print(f"Similar chunks: {len(context['similar_chunks'])}")
    
    print("\nTest completed successfully!")

if __name__ == "__main__":
    test_embedding_service() 