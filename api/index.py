from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import json
import sys
import os

# Add the parent directory to the path so we can import the transcript grabbers
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the transcript grabber functions
from youtube_transcript_grabber import get_transcript as get_youtube_transcript
from tiktok_transcript_grabber import get_transcript as get_tiktok_transcript, extract_tiktok_id

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests to the API"""
        # Parse query parameters
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)
        
        # Debug information
        debug_info = {
            'path': self.path,
            'parsed_path': parsed_path.path,
            'query_string': parsed_path.query,
            'query_params': {k: v for k, v in query_params.items()},
            'headers': {k: v for k, v in self.headers.items()}
        }
        
        # Log the debug info
        print("Debug info:", json.dumps(debug_info))
        
        # Set response headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        # Check if this is a TikTok request
        if parsed_path.path.startswith('/tiktok'):
            return self.handle_tiktok_request(parsed_path, query_params, debug_info)
        
        # If this is the root path with no parameters, return API info
        if parsed_path.path == '/' and not query_params:
            response = {
                'api': 'Video Transcript API',
                'version': '1.1',
                'endpoints': {
                    'youtube': {
                        'usage': 'GET /?video_id=VIDEO_ID&language=LANGUAGE_CODE',
                        'example': '/?video_id=Hc79sDi3f0U&language=en',
                    },
                    'tiktok': {
                        'usage': 'GET /tiktok?video_id=VIDEO_ID_OR_URL',
                        'example': '/tiktok?video_id=7123456789012345678',
                        'note': 'The TikTok endpoint now uses yt-dlp to extract captions from videos. Due to TikTok\'s anti-scraping measures, this may not always work. The API will attempt to extract text from the video description or title if captions are not available.'
                    }
                },
                'note': 'This API requires a video_id parameter',
                'debug_info': debug_info
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        # Try to extract video_id from the path if it's not in query params
        if 'video_id' not in query_params and parsed_path.path != '/':
            path_parts = parsed_path.path.strip('/').split('/')
            if len(path_parts) > 0 and path_parts[-1]:
                # Assume the last part of the path might be the video_id
                potential_video_id = path_parts[-1]
                if len(potential_video_id) > 5:  # Basic validation for a video ID
                    query_params['video_id'] = [potential_video_id]
                    print(f"Extracted video_id from path: {potential_video_id}")
        
        # Check if video_id is provided
        if 'video_id' not in query_params:
            response = {
                'error': 'Missing required parameter: video_id',
                'usage': 'GET /?video_id=VIDEO_ID&language=LANGUAGE_CODE',
                'example': '/?video_id=Hc79sDi3f0U&language=en',
                'debug_info': debug_info
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        video_id = query_params['video_id'][0]
        language = query_params.get('language', ['en'])[0]
        
        try:
            # Get the transcript
            transcript = get_youtube_transcript(video_id, language)
            
            # Return the transcript
            response = {
                'video_id': video_id,
                'language': language,
                'transcript': transcript,
                'source': 'youtube'
            }
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            response = {
                'error': str(e),
                'video_id': video_id,
                'language': language,
                'debug_info': debug_info
            }
            self.wfile.write(json.dumps(response).encode())
    
    def handle_tiktok_request(self, parsed_path, query_params, debug_info):
        """Handle TikTok transcript requests"""
        # Try to extract video_id from the path if it's not in query params
        if 'video_id' not in query_params and parsed_path.path != '/tiktok':
            path_parts = parsed_path.path.strip('/').split('/')
            if len(path_parts) > 1 and path_parts[-1]:  # Skip the first part which is 'tiktok'
                # Assume the last part of the path might be the video_id
                potential_video_id = path_parts[-1]
                query_params['video_id'] = [potential_video_id]
                print(f"Extracted TikTok video_id from path: {potential_video_id}")
        
        # Check if video_id is provided
        if 'video_id' not in query_params:
            response = {
                'error': 'Missing required parameter: video_id',
                'usage': 'GET /tiktok?video_id=VIDEO_ID_OR_URL',
                'example': '/tiktok?video_id=7123456789012345678',
                'note': 'You can provide either a TikTok video ID or a full TikTok URL. Due to TikTok\'s anti-scraping measures, transcript extraction may not always work.',
                'debug_info': debug_info
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        video_id_or_url = query_params['video_id'][0]
        
        try:
            # Get the transcript using the updated method
            transcript_data = get_tiktok_transcript(video_id_or_url)
            
            # Add source information
            transcript_data['source'] = 'tiktok'
            
            # Return the transcript data
            self.wfile.write(json.dumps(transcript_data).encode())
            
        except Exception as e:
            response = {
                'error': str(e),
                'video_id': extract_tiktok_id(video_id_or_url),
                'debug_info': debug_info
            }
            self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):
        """Handle POST requests to the API"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        # Debug information
        debug_info = {
            'path': self.path,
            'method': 'POST',
            'content_length': content_length,
            'headers': {k: v for k, v in self.headers.items()}
        }
        
        try:
            # Parse the JSON request body
            data = json.loads(post_data)
            debug_info['data'] = data
            
            # Set response headers
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            # Check if this is a TikTok request
            if self.path.startswith('/tiktok'):
                return self.handle_tiktok_post(data, debug_info)
            
            # Check if video_id is provided for YouTube
            if 'video_id' not in data:
                response = {
                    'error': 'Missing required parameter: video_id',
                    'usage': 'POST with JSON body: {"video_id": "VIDEO_ID", "language": "LANGUAGE_CODE"}',
                    'debug_info': debug_info
                }
                self.wfile.write(json.dumps(response).encode())
                return
            
            video_id = data['video_id']
            language = data.get('language', 'en')
            
            # Get the transcript
            transcript = get_youtube_transcript(video_id, language)
            
            # Return the transcript
            response = {
                'video_id': video_id,
                'language': language,
                'transcript': transcript,
                'source': 'youtube'
            }
            self.wfile.write(json.dumps(response).encode())
            
        except json.JSONDecodeError:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            response = {
                'error': 'Invalid JSON in request body',
                'debug_info': debug_info
            }
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            response = {
                'error': str(e),
                'debug_info': debug_info
            }
            self.wfile.write(json.dumps(response).encode())
    
    def handle_tiktok_post(self, data, debug_info):
        """Handle TikTok transcript POST requests"""
        # Check if video_id is provided
        if 'video_id' not in data:
            response = {
                'error': 'Missing required parameter: video_id',
                'usage': 'POST to /tiktok with JSON body: {"video_id": "VIDEO_ID_OR_URL"}',
                'note': 'You can provide either a TikTok video ID or a full TikTok URL. Due to TikTok\'s anti-scraping measures, transcript extraction may not always work.',
                'debug_info': debug_info
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        video_id_or_url = data['video_id']
        
        try:
            # Get the transcript using the updated method
            transcript_data = get_tiktok_transcript(video_id_or_url)
            
            # Add source information
            transcript_data['source'] = 'tiktok'
            
            # Return the transcript data
            self.wfile.write(json.dumps(transcript_data).encode())
            
        except Exception as e:
            response = {
                'error': str(e),
                'video_id': extract_tiktok_id(video_id_or_url),
                'debug_info': debug_info
            }
            self.wfile.write(json.dumps(response).encode())
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers() 