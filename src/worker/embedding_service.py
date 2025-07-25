import re
import json
import uuid
from typing import List, Dict, Any, Tuple
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
import os
from bs4 import BeautifulSoup

# Always use the same absolute path for ChromaDB
CHROMA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "chroma_db"))

def sanitize_collection_name(file_name: str) -> str:
    """
    Sanitize a filename to create a valid ChromaDB collection name.
    ChromaDB collection names must:
    - Contain 3-512 characters
    - Only use [a-zA-Z0-9._-]
    - Start and end with alphanumeric characters
    """
    # Remove file extension
    name_without_ext = os.path.splitext(file_name)[0]
    
    # Replace invalid characters with underscores
    sanitized = re.sub(r'[^a-zA-Z0-9._-]', '_', name_without_ext)
    
    # Remove leading/trailing non-alphanumeric characters
    sanitized = re.sub(r'^[^a-zA-Z0-9]+', '', sanitized)
    sanitized = re.sub(r'[^a-zA-Z0-9]+$', '', sanitized)
    
    # Ensure it starts with a letter (ChromaDB requirement)
    if sanitized and not sanitized[0].isalpha():
        sanitized = 'pdf_' + sanitized
    
    # Ensure minimum length
    if len(sanitized) < 3:
        sanitized = 'pdf_' + sanitized
    
    # Ensure maximum length
    if len(sanitized) > 512:
        sanitized = sanitized[:512]
    
    # Add pdf_ prefix to ensure uniqueness
    if not sanitized.startswith('pdf_'):
        sanitized = 'pdf_' + sanitized
    
    return sanitized

class EmbeddingService:
    def __init__(self):
        # Initialize the sentence transformer model
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        # Initialize Chroma client with absolute path
        self.chroma_client = chromadb.PersistentClient(
            path=CHROMA_PATH,
            settings=Settings(anonymized_telemetry=False)
        )
    
    def parse_hierarchical_structure(self, content: str) -> Dict[str, Any]:
        """
        Parse content into a hierarchical structure with sections, paragraphs, and sentences.
        Handles both HTML and plain text content.
        Returns a structured representation of the document.
        """
        # Check if content looks like HTML
        if '<' in content and '>' in content:
            # Parse as HTML
            soup = BeautifulSoup(content, 'html.parser')
            
            # Find the academic-paper div
            paper_div = soup.find('div', class_='academic-paper')
            if not paper_div:
                # If no academic-paper div, use the whole content
                paper_div = soup
        else:
            # Parse as plain text
            paper_div = None
            text_content = content
        
        document_structure = {
            'sections': [],
            'chunks': []
        }
        
        current_section = None
        current_paragraph = None
        chunk_id_counter = 0
        
        # Handle plain text content
        if paper_div is None:
            # Process plain text content
            lines = text_content.split('\n')
            current_paragraph_text = ""
            
            for line in lines:
                line = line.strip()
                if not line:
                    # Empty line - end current paragraph
                    if current_paragraph_text:
                        # Process the accumulated paragraph
                        sentences = re.split(r'(?<=[.!?])\s+', current_paragraph_text)
                        for i, sentence in enumerate(sentences):
                            sentence = sentence.strip()
                            if sentence and len(sentence) >= 10:
                                sentence_id = str(uuid.uuid4())
                                document_structure['chunks'].append({
                                    'id': sentence_id,
                                    'content': sentence,
                                    'type': 'text',
                                    'section_id': None,
                                    'section_title': None,
                                    'paragraph_id': str(uuid.uuid4()),
                                    'paragraph_text': current_paragraph_text,
                                    'sentence_index': i,
                                    'chunk_index': chunk_id_counter,
                                    'element_type': 'sentence'
                                })
                                chunk_id_counter += 1
                        current_paragraph_text = ""
                else:
                    # Check if this looks like a heading (starts with number or is short)
                    if (re.match(r'^\d+\.?\s*[A-Z]', line) or 
                        (len(line) < 100 and line.isupper()) or
                        line in ['Abstract', 'Introduction', 'Conclusion', 'References']):
                        # This is likely a heading
                        heading_id = str(uuid.uuid4())
                        current_section = {
                            'id': heading_id,
                            'level': 2 if re.match(r'^\d+\.?\s*', line) else 1,
                            'title': line,
                            'paragraphs': []
                        }
                        document_structure['sections'].append(current_section)
                        
                        # Add heading as a chunk
                        document_structure['chunks'].append({
                            'id': heading_id,
                            'content': line,
                            'type': 'heading',
                            'section_id': current_section['id'],
                            'section_title': line,
                            'paragraph_id': None,
                            'paragraph_text': None,
                            'chunk_index': chunk_id_counter,
                            'element_type': 'heading'
                        })
                        chunk_id_counter += 1
                    else:
                        # This is paragraph text
                        if current_paragraph_text:
                            current_paragraph_text += " " + line
                        else:
                            current_paragraph_text = line
            
            # Process any remaining paragraph text
            if current_paragraph_text:
                sentences = re.split(r'(?<=[.!?])\s+', current_paragraph_text)
                for i, sentence in enumerate(sentences):
                    sentence = sentence.strip()
                    if sentence and len(sentence) >= 10:
                        sentence_id = str(uuid.uuid4())
                        document_structure['chunks'].append({
                            'id': sentence_id,
                            'content': sentence,
                            'type': 'text',
                            'section_id': current_section['id'] if current_section else None,
                            'section_title': current_section['title'] if current_section else None,
                            'paragraph_id': str(uuid.uuid4()),
                            'paragraph_text': current_paragraph_text,
                            'sentence_index': i,
                            'chunk_index': chunk_id_counter,
                            'element_type': 'sentence'
                        })
                        chunk_id_counter += 1
            
            return document_structure
        
        # Process HTML elements
        for element in paper_div.children:
            if element.name is None:  # Skip text nodes
                continue
                
            # Handle headings (sections)
            if element.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                heading_text = element.get_text().strip()
                if heading_text:
                    current_section = {
                        'id': str(uuid.uuid4()),
                        'level': int(element.name[1]),
                        'title': heading_text,
                        'paragraphs': []
                    }
                    document_structure['sections'].append(current_section)
                    
                    # Add heading as a chunk
                    chunk_id = str(uuid.uuid4())
                    document_structure['chunks'].append({
                        'id': chunk_id,
                        'content': heading_text,
                        'type': 'heading',
                        'section_id': current_section['id'],
                        'section_title': heading_text,
                        'paragraph_id': None,
                        'paragraph_text': None,
                        'chunk_index': chunk_id_counter,
                        'element_type': 'heading'
                    })
                    chunk_id_counter += 1
            
            # Handle paragraphs
            elif element.name == 'p':
                paragraph_text = element.get_text().strip()
                if paragraph_text:
                    paragraph_id = str(uuid.uuid4())
                    current_paragraph = {
                        'id': paragraph_id,
                        'text': paragraph_text,
                        'sentences': []
                    }
                    
                    if current_section:
                        current_section['paragraphs'].append(current_paragraph)
                    
                    # Extract sentences from paragraph
                    sentences = re.split(r'(?<=[.!?])\s+', paragraph_text)
                    for i, sentence in enumerate(sentences):
                        sentence = sentence.strip()
                        if sentence and len(sentence) >= 10:
                            sentence_id = str(uuid.uuid4())
                            current_paragraph['sentences'].append({
                                'id': sentence_id,
                                'text': sentence,
                                'index': i
                            })
                            
                            # Add sentence as a chunk
                            document_structure['chunks'].append({
                                'id': sentence_id,
                                'content': sentence,
                                'type': 'text',
                                'section_id': current_section['id'] if current_section else None,
                                'section_title': current_section['title'] if current_section else None,
                                'paragraph_id': paragraph_id,
                                'paragraph_text': paragraph_text,
                                'sentence_index': i,
                                'chunk_index': chunk_id_counter,
                                'element_type': 'sentence'
                            })
                            chunk_id_counter += 1
            
            # Handle equations
            elif element.name == 'span' and 'equation' in element.get('class', []):
                equation_content_elem = element.find('span', class_='equation-content')
                equation_number_elem = element.find('span', class_='equation-number')
                
                if equation_content_elem and equation_number_elem:
                    equation_content = equation_content_elem.get_text().strip()
                    equation_number = equation_number_elem.get_text().strip()
                    
                    # Clean up equation content
                    equation_content = re.sub(r'^\$\$|\$\$$', '', equation_content)
                    
                    if equation_content:
                        equation_id = str(uuid.uuid4())
                        document_structure['chunks'].append({
                            'id': equation_id,
                            'content': f"Equation {equation_number}: {equation_content}",
                            'type': 'equation',
                            'equation_number': equation_number,
                            'equation_content': equation_content,
                            'section_id': current_section['id'] if current_section else None,
                            'section_title': current_section['title'] if current_section else None,
                            'paragraph_id': current_paragraph['id'] if current_paragraph else None,
                            'paragraph_text': current_paragraph['text'] if current_paragraph else None,
                            'chunk_index': chunk_id_counter,
                            'element_type': 'equation'
                        })
                        chunk_id_counter += 1
        
        return document_structure
    
    def create_embeddings(self, file_name: str, content: str) -> Dict[str, Any]:
        """
        Create embeddings for all chunks in a document with hierarchical structure.
        Returns metadata about the embedding collection.
        """
        # Use the same absolute path client
        # Create a unique collection name for this file
        collection_name = sanitize_collection_name(file_name)
        # Get or create collection
        try:
            collection = self.chroma_client.get_collection(collection_name)
            self.chroma_client.delete_collection(collection_name)
        except Exception as e:
            print("Exception during collection deletion:", e)
            pass
        print("About to create collection:", collection_name)
        collection = self.chroma_client.create_collection(collection_name)
        print("Created collection:", collection_name)
        # Parse hierarchical structure
        document_structure = self.parse_hierarchical_structure(content)
        chunks = document_structure['chunks']
        if not chunks:
            return {
                'collection_name': collection_name,
                'chunk_count': 0,
                'chunks': [],
                'document_structure': document_structure
            }
        # Prepare data for Chroma
        documents = []
        metadatas = []
        ids = []
        for chunk in chunks:
            documents.append(chunk['content'])
            # Create metadata with hierarchical information (filter out None values)
            metadata = {
                'file_name': file_name,
                'chunk_type': chunk['type'],
                'chunk_id': chunk['id'],
                'element_type': chunk['element_type'],
                'chunk_index': chunk['chunk_index']
            }
            # Add optional fields only if they're not None
            if chunk['section_id'] is not None:
                metadata['section_id'] = chunk['section_id']
            if chunk['section_title'] is not None:
                metadata['section_title'] = chunk['section_title']
            if chunk['paragraph_id'] is not None:
                metadata['paragraph_id'] = chunk['paragraph_id']
            if chunk['paragraph_text'] is not None:
                metadata['paragraph_text'] = chunk['paragraph_text']
            # Add type-specific metadata
            if chunk['type'] == 'equation':
                metadata.update({
                    'equation_number': chunk['equation_number'],
                    'equation_content': chunk['equation_content']
                })
            elif chunk['type'] == 'text':
                metadata.update({
                    'sentence_index': chunk['sentence_index']
                })
            elif chunk['type'] == 'heading':
                metadata.update({
                    'heading_level': chunk.get('level', 1)
                })
            metadatas.append(metadata)
            ids.append(chunk['id'])
        # Generate embeddings and add to collection
        embeddings = self.model.encode(documents)
        collection.add(
            embeddings=embeddings.tolist(),
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        print("Collections after add:", [c.name for c in self.chroma_client.list_collections()])
        return {
            'collection_name': collection_name,
            'chunk_count': len(chunks),
            'chunks': chunks,
            'document_structure': document_structure
        }
    
    def search_similar(self, file_name: str, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """
        Search for semantically similar chunks in a document.
        """
        collection_name = sanitize_collection_name(file_name)
        
        try:
            collection = self.chroma_client.get_collection(collection_name)
        except:
            return []
        
        # Generate embedding for the query
        query_embedding = self.model.encode([query])
        
        # Search for similar chunks
        results = collection.query(
            query_embeddings=query_embedding.tolist(),
            n_results=n_results
        )
        
        # Format results
        formatted_results = []
        for i in range(len(results['ids'][0])):
            formatted_results.append({
                'id': results['ids'][0][i],
                'content': results['documents'][0][i],
                'metadata': results['metadatas'][0][i],
                'distance': results['distances'][0][i] if 'distances' in results else None
            })
        
        return formatted_results
    
    def get_context_for_sentence(self, file_name: str, sentence: str, n_results: int = 3) -> Dict[str, Any]:
        """
        Get comprehensive context for a clicked sentence with hierarchical information.
        """
        # Search for semantically similar content
        similar_chunks = self.search_similar(file_name, sentence, n_results)
        
        # Get the collection to find immediate context
        collection_name = sanitize_collection_name(file_name)
        
        try:
            collection = self.chroma_client.get_collection(collection_name)
            all_results = collection.get()
            
            # Find the clicked sentence in the collection
            clicked_chunk = None
            for i, doc in enumerate(all_results['documents']):
                if sentence.strip() in doc:
                    clicked_chunk = {
                        'id': all_results['ids'][i],
                        'content': doc,
                        'metadata': all_results['metadatas'][0][i]
                    }
                    break
            
            if not clicked_chunk:
                return {
                    'clicked_sentence': sentence,
                    'similar_chunks': similar_chunks,
                    'immediate_context': None,
                    'hierarchical_context': None
                }
            
            # Find immediate context (previous and next chunks)
            chunk_index = all_results['ids'].index(clicked_chunk['id'])
            immediate_context = {
                'previous': all_results['documents'][chunk_index - 1] if chunk_index > 0 else None,
                'current': clicked_chunk['content'],
                'next': all_results['documents'][chunk_index + 1] if chunk_index < len(all_results['documents']) - 1 else None
            }
            
            # Build hierarchical context
            hierarchical_context = {
                'clicked_chunk': clicked_chunk,
                'section_title': clicked_chunk['metadata'].get('section_title'),
                'paragraph_text': clicked_chunk['metadata'].get('paragraph_text'),
                'similar_chunks_with_context': []
            }
            
            # Add context for similar chunks
            for similar_chunk in similar_chunks:
                similar_context = {
                    'chunk': similar_chunk,
                    'section_title': similar_chunk['metadata'].get('section_title'),
                    'paragraph_text': similar_chunk['metadata'].get('paragraph_text')
                }
                hierarchical_context['similar_chunks_with_context'].append(similar_context)
            
            return {
                'clicked_sentence': sentence,
                'similar_chunks': similar_chunks,
                'immediate_context': immediate_context,
                'hierarchical_context': hierarchical_context,
                'clicked_chunk_metadata': clicked_chunk['metadata']
            }
            
        except Exception as e:
            print(f"Error getting context: {e}")
            return {
                'clicked_sentence': sentence,
                'similar_chunks': similar_chunks,
                'immediate_context': None,
                'hierarchical_context': None
            } 