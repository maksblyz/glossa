#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from embedding_service import EmbeddingService

def test_hierarchical_embedding_service():
    print("Testing Hierarchical Embedding Service...")
    
    # Initialize the service
    embedding_service = EmbeddingService()
    
    # Test HTML content with proper structure
    test_html = """
    <div class="academic-paper">
        <h2>1.2 Supervised Learning</h2>
        <p><span class="clickable-sentence">Supervised learning is a type of machine learning where the algorithm learns from labeled training data.</span></p>
        <p><span class="clickable-sentence">The goal is to learn a mapping from inputs to outputs based on example input-output pairs.</span></p>
        <span class="equation clickable-sentence">
            <span class="equation-content">$$ f(x) = \\theta^T x + b $$</span>
            <span class="equation-number">(1.1)</span>
        </span>
        <p><span class="clickable-sentence">This linear function represents the simplest form of supervised learning.</span></p>
        <h3>1.2.1 Classification</h3>
        <p><span class="clickable-sentence">In classification tasks, the output is a discrete category or class label.</span></p>
        <p><span class="clickable-sentence">Common examples include spam detection and image classification.</span></p>
        <h3>1.2.2 Regression</h3>
        <p><span class="clickable-sentence">Regression tasks predict continuous numerical values.</span></p>
        <p><span class="clickable-sentence">Examples include predicting house prices or stock market values.</span></p>
    </div>
    """
    
    # Test file name
    test_file = "test_hierarchical_document.pdf"
    
    print("Creating hierarchical embeddings...")
    result = embedding_service.create_embeddings(test_file, test_html)
    print(f"Created {result['chunk_count']} chunks")
    print(f"Collection name: {result['collection_name']}")
    
    # Print document structure
    print(f"\nDocument structure:")
    print(f"Number of sections: {len(result['document_structure']['sections'])}")
    for section in result['document_structure']['sections']:
        print(f"  Section: {section['title']} (Level {section['level']})")
        print(f"    Paragraphs: {len(section['paragraphs'])}")
        for para in section['paragraphs']:
            print(f"      Paragraph: {para['text'][:50]}...")
            print(f"        Sentences: {len(para['sentences'])}")
    
    # Test search with hierarchical context
    print("\nTesting hierarchical context retrieval...")
    context = embedding_service.get_context_for_sentence(test_file, "Supervised learning is a type of machine learning")
    print(f"Context for sentence: {context['clicked_sentence']}")
    
    if context['hierarchical_context']:
        print(f"Section title: {context['hierarchical_context']['section_title']}")
        print(f"Paragraph text: {context['hierarchical_context']['paragraph_text'][:100]}...")
        print(f"Similar chunks with context: {len(context['hierarchical_context']['similar_chunks_with_context'])}")
        
        for i, similar in enumerate(context['hierarchical_context']['similar_chunks_with_context']):
            print(f"  Similar {i+1}:")
            print(f"    Section: {similar['section_title']}")
            print(f"    Paragraph: {similar['paragraph_text'][:80]}...")
    
    if context['immediate_context']:
        print(f"Previous: {context['immediate_context']['previous']}")
        print(f"Next: {context['immediate_context']['next']}")
    
    print("\nTest completed successfully!")

if __name__ == "__main__":
    test_hierarchical_embedding_service() 