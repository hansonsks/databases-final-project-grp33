from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Example route
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "API is running"})

# Example of how a movie route might look
@app.route('/api/actors/top', methods=['GET'])
def get_top_actors():
    sort_by = request.args.get('sortBy', 'boxOffice')
    limit = request.args.get('limit', 10, type=int)
    
    # This is just a placeholder - you'd implement the actual database query later
    return jsonify({"message": f"Would return top {limit} actors sorted by {sort_by}"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)