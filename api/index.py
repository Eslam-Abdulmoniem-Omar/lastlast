from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import json
import sys
import os

# Add the parent directory to the path so we can import the YouTube transcript grabber
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the transcript grabber function
from youtube_transcript_grabber import get_transcript

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests to the API"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        # Parse query parameters
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)
        
        # Check if video_id is provided
        if 'video_id' not in query_params:
            response = {
                'error': 'Missing required parameter: video_id',
                'usage': 'GET /?video_id=VIDEO_ID&language=LANGUAGE_CODE'
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        video_id = query_params['video_id'][0]
        language = query_params.get('language', ['en'])[0]
        
        try:
            # Get the transcript
            transcript = get_transcript(video_id, language)
            
            # Return the transcript
            response = {
                'video_id': video_id,
                'language': language,
                'transcript': transcript
            }
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            response = {
                'error': str(e),
                'video_id': video_id,
                'language': language
            }
            self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):
        """Handle POST requests to the API"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            # Parse the JSON request body
            data = json.loads(post_data)
            
            # Check if video_id is provided
            if 'video_id' not in data:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = {
                    'error': 'Missing required parameter: video_id',
                    'usage': 'POST with JSON body: {"video_id": "VIDEO_ID", "language": "LANGUAGE_CODE"}'
                }
                self.wfile.write(json.dumps(response).encode())
                return
            
            video_id = data['video_id']
            language = data.get('language', 'en')
            
            # Get the transcript
            transcript = get_transcript(video_id, language)
            
            # Return the transcript
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                'video_id': video_id,
                'language': language,
                'transcript': transcript
            }
            self.wfile.write(json.dumps(response).encode())
            
        except json.JSONDecodeError:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                'error': 'Invalid JSON in request body'
            }
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                'error': str(e)
            }
            self.wfile.write(json.dumps(response).encode()) 