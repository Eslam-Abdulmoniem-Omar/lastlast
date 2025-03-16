from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig
import re
import sys
import json
import os

def extract_video_id(url):
    """Extract YouTube Video ID from URL"""
    # Handle various YouTube URL formats
    patterns = [
        r"v=([a-zA-Z0-9_-]{11})",  # Standard YouTube URL
        r"youtu\.be/([a-zA-Z0-9_-]{11})",  # Shortened YouTube URL
        r"youtube\.com/embed/([a-zA-Z0-9_-]{11})",  # Embedded YouTube URL
        r"youtube\.com/shorts/([a-zA-Z0-9_-]{11})"  # YouTube Shorts URL
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None

def get_transcript_with_timestamps(video_id):
    """Get transcript with timestamps for a YouTube video"""
    try:
        # Get proxy credentials from environment variables
        proxy_username = os.environ.get('WEBSHARE_PROXY_USERNAME', '')
        proxy_password = os.environ.get('WEBSHARE_PROXY_PASSWORD', '')
        proxy_host = os.environ.get('WEBSHARE_PROXY_HOST', 'proxy.webshare.io')
        proxy_port = int(os.environ.get('WEBSHARE_PROXY_PORT', '80'))
        
        # Debug environment variables
        print(json.dumps({
            "debug": {
                "env_check": {
                    "has_proxy_username": bool(proxy_username),
                    "username_length": len(proxy_username) if proxy_username else 0,
                    "has_proxy_password": bool(proxy_password),
                    "password_length": len(proxy_password) if proxy_password else 0,
                    "proxy_host": proxy_host,
                    "proxy_port": proxy_port,
                    "env_keys": list(os.environ.keys())
                }
            }
        }))
        
        # Configure proxy if credentials are available
        if proxy_username and proxy_password:
            print(json.dumps({"debug": {"using_proxy": True, "proxy_username": proxy_username, "proxy_host": proxy_host}}))
            
            # Use explicit hardcoded credentials if env vars aren't working in production
            proxy_config = WebshareProxyConfig(
                proxy_username=proxy_username or "iacqerjk",
                proxy_password=proxy_password or "fijay69twvxo",
                proxy_host=proxy_host,
                proxy_port=proxy_port
            )
            
            # Create instance with proxy config
            ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config)
            try:
                transcript = ytt_api.get_transcript(video_id)
                print(json.dumps({"debug": {"transcript_success": True, "transcript_length": len(transcript)}}))
            except Exception as transcript_error:
                print(json.dumps({"debug": {"transcript_error": str(transcript_error)}}))
                # Try with default English language parameter
                transcript = ytt_api.get_transcript(video_id, languages=['en'])
                print(json.dumps({"debug": {"transcript_with_lang_success": True, "transcript_length": len(transcript)}}))
        else:
            print(json.dumps({"debug": {"using_proxy": False, "reason": "No credentials found in environment"}}))
            # Fallback to standard method if no proxy credentials
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            
        return transcript
    except Exception as e:
        error_message = str(e)
        print(json.dumps({"debug": {"error": error_message}}))
        return {"error": error_message}

def convert_to_dialogue_segments(transcript):
    """Convert transcript to dialogue segments"""
    if not transcript or isinstance(transcript, dict) and "error" in transcript:
        return []
    
    segments = []
    current_group = []
    current_start_time = transcript[0]['start']
    current_text = ""
    MAX_GROUP_DURATION = 10  # Maximum duration for a segment in seconds
    
    # Process transcript entries
    for i, entry in enumerate(transcript):
        start_time = entry['start']
        duration = entry['duration']
        end_time = start_time + duration
        
        # If this entry would make the group too long, or if it's far from the previous entry,
        # finish the current group and start a new one
        if (current_group and 
            (end_time - current_start_time > MAX_GROUP_DURATION or 
             start_time - (current_group[-1]['start'] + current_group[-1]['duration']) > 1.5)):
            
            # Add the current group as a segment
            last_entry = current_group[-1]
            segment = {
                "speakerName": "Speaker A" if len(segments) % 2 == 0 else "Speaker B",
                "text": current_text.strip(),
                "startTime": current_start_time,
                "endTime": last_entry['start'] + last_entry['duration'],
                "vocabularyItems": []
            }
            segments.append(segment)
            
            # Start a new group
            current_group = [entry]
            current_start_time = start_time
            current_text = entry['text']
        else:
            # Add to the current group
            current_group.append(entry)
            current_text += " " + entry['text']
        
        # If this is the last entry, add the final group
        if i == len(transcript) - 1 and current_group:
            segment = {
                "speakerName": "Speaker A" if len(segments) % 2 == 0 else "Speaker B",
                "text": current_text.strip(),
                "startTime": current_start_time,
                "endTime": end_time,
                "vocabularyItems": []
            }
            segments.append(segment)
    
    return segments

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No video ID provided"}))
        sys.exit(1)
    
    video_id = sys.argv[1]
    transcript = get_transcript_with_timestamps(video_id)
    
    if isinstance(transcript, dict) and "error" in transcript:
        print(json.dumps({"error": transcript["error"]}))
        sys.exit(1)
    
    segments = convert_to_dialogue_segments(transcript)
    print(json.dumps({"segments": segments})) 