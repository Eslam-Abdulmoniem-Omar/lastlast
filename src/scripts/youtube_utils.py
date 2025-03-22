import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi
import json
import os
import sys
import re
import traceback

def clean_video_id(video_id):
    """Cleans the video ID by removing any extra parts."""
    if not video_id:
        return None
    # Remove any extra parameters
    if '&' in video_id:
        video_id = video_id.split('&')[0]
    if '?' in video_id:
        video_id = video_id.split('?')[0]
    return video_id

def extract_video_id(video_url):
    """Extract video ID from various YouTube URL formats."""
    try:
        if not video_url:
            print(json.dumps({"error": "Empty video URL provided"}))
            return None
            
        print(f"Attempting to extract video ID from: {video_url}")
        
        # For youtube.com/shorts links
        if "youtube.com/shorts/" in video_url:
            video_id = video_url.split("youtube.com/shorts/")[-1]
            return clean_video_id(video_id)
            
        # For youtu.be links
        elif "youtu.be/" in video_url:
            video_id = video_url.split("youtu.be/")[-1].split("?")[0]
            return clean_video_id(video_id)
            
        # For youtube.com/watch links
        elif "youtube.com/watch" in video_url:
            match = re.search(r'[?&]v=([^&]+)', video_url)
            if match:
                return clean_video_id(match.group(1))
            else:
                print(json.dumps({"error": "Could not find video ID in watch URL"}))
                return None
        
        # For direct video IDs
        elif re.match(r'^[a-zA-Z0-9_-]{11}$', video_url):
            return video_url
            
        print(json.dumps({"error": f"Could not extract video ID from URL: {video_url}"}))
        return None
    except Exception as e:
        print(json.dumps({"error": f"Error extracting video ID: {str(e)}"}))
        return None

def get_video_url(video_id):
    """Get the direct video URL using yt-dlp."""
    if not video_id:
        print(json.dumps({"error": "No video ID provided"}))
        return None
        
    try:
        print(f"Fetching video URL for ID: {video_id}")
        
        ydl_opts = {
            'format': 'best[ext=mp4]',
            'quiet': False,
            'no_warnings': False,
            'extract_flat': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(f"https://www.youtube.com/shorts/{video_id}", download=False)
                if not info:
                    # Try regular video URL if shorts URL fails
                    info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
                
                if info:
                    print("Successfully retrieved video information")
                    return {
                        "url": info.get('url'),
                        "title": info.get('title'),
                        "duration": info.get('duration'),
                        "thumbnail": info.get('thumbnail'),
                        "webpage_url": info.get('webpage_url'),
                        "description": info.get('description'),
                    }
                print(json.dumps({"error": "No video information retrieved"}))
                return None
            except Exception as ydl_error:
                print(json.dumps({"error": f"yt-dlp error: {str(ydl_error)}"}))
                return None
    except Exception as e:
        print(json.dumps({"error": f"Error in get_video_url: {str(e)}"}))
        return None

def get_video_transcript(video_url, lang="en"):
    """Fetches the transcript for a given YouTube video URL."""
    try:
        if not video_url:
            return {"error": "No video URL provided"}
            
        print(f"Fetching transcript for URL: {video_url}")
        
        # Extract video ID
        video_id = extract_video_id(video_url)
        if not video_id:
            error_msg = f"Failed to extract video ID from URL: {video_url}"
            print(json.dumps({"error": error_msg}))
            return {"error": error_msg}
        
        print(f"Extracted video ID: {video_id}")
        
        # First try to get transcript in specified language
        try:
            print(f"Attempting to get transcript in {lang}")
            transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
            print(f"Successfully retrieved transcript in {lang} with {len(transcript)} segments")
            
            # Get video URL and metadata
            video_data = get_video_url(video_id)
            if not video_data:
                print(json.dumps({"error": "Failed to fetch video data"}))
                return {"error": "Failed to fetch video data"}
            
            return {
                "success": True,
                "transcript": transcript,
                "language": lang,
                "video_data": video_data
            }
        except Exception as lang_e:
            print(f"Failed to get transcript in {lang}: {str(lang_e)}")
            
            # If specified language fails, try to list available languages
            try:
                print(f"Listing available transcripts for video: {video_id}")
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                available_langs = [t.language_code for t in transcript_list]
                
                print(f"Found {len(available_langs)} available languages: {', '.join(available_langs)}")
                
                if available_langs:
                    # Try to get the first available transcript
                    first_lang = available_langs[0]
                    print(f"Attempting to get transcript in first available language: {first_lang}")
                    transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[first_lang])
                    
                    # Get video URL and metadata
                    video_data = get_video_url(video_id)
                    if not video_data:
                        print(json.dumps({"error": "Failed to fetch video data"}))
                        return {"error": "Failed to fetch video data"}
                    
                    print(f"Successfully retrieved transcript in {first_lang}")
                    return {
                        "success": True, 
                        "transcript": transcript, 
                        "language": first_lang,
                        "note": f"Used {first_lang} transcript instead of requested {lang}",
                        "available_languages": available_langs,
                        "video_data": video_data
                    }
                else:
                    error_msg = "No transcripts available for this video"
                    print(json.dumps({"error": error_msg}))
                    return {"error": error_msg}
            except Exception as list_e:
                error_msg = f"Failed to list available transcripts: {str(list_e)}"
                print(json.dumps({"error": error_msg}))
                return {"error": error_msg}
    except Exception as e:
        error_msg = f"Error fetching transcript: {str(e)}"
        print(json.dumps({"error": error_msg}))
        return {"error": error_msg}

def get_available_languages(video_url):
    """Gets a list of available transcript languages for a video."""
    try:
        # Extract video ID
        video_id = extract_video_id(video_url)
        if not video_id:
            return {"error": "Invalid YouTube URL format or couldn't extract video ID"}
        
        print(f"Getting available languages for video ID: {video_id}")
        
        # Get list of available transcripts
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        languages = []
        
        for transcript in transcript_list:
            languages.append({
                "code": transcript.language_code,
                "name": transcript.language,
                "is_generated": transcript.is_generated
            })
            
        # Get video URL and metadata
        video_data = get_video_url(video_id)
            
        print(f"Found {len(languages)} available languages")
        return {
            "success": True,
            "languages": languages,
            "video_data": video_data
        }
    except Exception as e:
        error_msg = f"Error getting available languages: {str(e)}"
        print(json.dumps({"error": error_msg}))
        return {"error": error_msg}

def get_video_metadata(video_url):
    """Extracts metadata from a YouTube video."""
    try:
        # Extract video ID for validation
        video_id = extract_video_id(video_url)
        if not video_id:
            return {"error": "Invalid YouTube URL format or couldn't extract video ID"}
            
        print(f"Getting metadata for video ID: {video_id}")
        
        ydl_opts = {
            'format': 'best',
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            
        metadata = {
            "title": info.get("title", "Unknown Title"),
            "author": info.get("uploader", "Unknown Author"),
            "authorUrl": info.get("uploader_url", ""),
            "thumbnailUrl": info.get("thumbnail", ""),
            "embedUrl": f"https://www.youtube.com/embed/{info.get('id', '')}",
            "duration": info.get("duration", 0)
        }
        
        print(f"Successfully retrieved metadata: {metadata['title']}")
        return {"success": True, "metadata": metadata}
    except Exception as e:
        print(f"Error fetching metadata: {str(e)}")
        return {"error": f"Error fetching metadata: {str(e)}"}

def download_video(video_url, output_path="video.mp4"):
    """Downloads the YouTube video."""
    try:
        ydl_opts = {
            "format": "best",
            "outtmpl": output_path,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])
        return {"success": True, "message": f"Video downloaded successfully as {output_path}"}
    except Exception as e:
        return {"error": f"Error downloading video: {str(e)}"}

if __name__ == "__main__":
    try:
        # Print Python version and working directory for debugging
        print(f"Python version: {sys.version}")
        print(f"Current working directory: {os.getcwd()}")
        
        # This script can be called from Node.js with arguments
        if len(sys.argv) < 3:
            error_msg = "Not enough arguments. Usage: python youtube_utils.py [action] [url] [optional_args]"
            print(json.dumps({"error": error_msg}))
            sys.exit(1)
        
        action = sys.argv[1]
        url = sys.argv[2]
        
        print(f"Running action: {action} for URL: {url}")
        
        if action == "transcript":
            lang = sys.argv[3] if len(sys.argv) > 3 else "en"
            result = get_video_transcript(url, lang)
            print(json.dumps(result))
            sys.stdout.flush()
        elif action == "languages":
            result = get_available_languages(url)
            print(json.dumps(result))
        elif action == "metadata":
            result = get_video_metadata(url)
            print(json.dumps(result))
        elif action == "download":
            output_path = sys.argv[3] if len(sys.argv) > 3 else "video.mp4"
            result = download_video(url, output_path)
            print(json.dumps(result))
        else:
            error_msg = f"Unknown action: {action}"
            print(json.dumps({"error": error_msg}))
            sys.exit(1)
            
    except Exception as e:
        error_msg = f"Script execution error: {str(e)}"
        print(json.dumps({"error": error_msg}))
        sys.exit(1) 