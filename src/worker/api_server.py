# api_server.py

from flask import Flask, request, jsonify
from flask_cors import CORS
from embedding_service import EmbeddingService

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests

embedding_service = EmbeddingService()

@app.route('/context', methods=['POST'])
def get_context():
    data = request.get_json()
    if not data or 'fileName' not in data or 'content' not in data:
        return jsonify({"error": "Missing fileName or content"}), 400

    file_name = data['fileName']
    query = data['content']
    
    try:
        # Use your existing search function to find similar chunks
        similar_chunks = embedding_service.search_similar(file_name, query, n_results=3)
        
        # Format the context for the LLM prompt
        context = "\n".join([chunk['content'] for chunk in similar_chunks])
        
        return jsonify({"context": context})
    except Exception as e:
        print(f"Error fetching context: {e}")
        return jsonify({"error": "Failed to fetch context"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5328)