from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests to the test API"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        # Return a test response
        response = {
            'message': 'This is a test endpoint for the YouTube API',
            'status': 'success',
            'timestamp': 'Updated at ' + __import__('datetime').datetime.now().isoformat(),
            'usage': [
                '/api/index.py?video_id=YOUR_VIDEO_ID',
                '/api/youtube/YOUR_VIDEO_ID'
            ]
        }
        
        self.wfile.write(json.dumps(response, indent=2).encode()) 