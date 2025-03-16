#!/usr/bin/env python3
"""
TikTok Transcript Grabber

A solution for extracting transcripts from TikTok videos
using yt-dlp to download subtitles or extract audio for processing.
Falls back to web scraping if yt-dlp fails.

Usage:
    python tiktok_transcript_grabber.py VIDEO_ID_OR_URL
    
Example:
    python tiktok_transcript_grabber.py https://www.tiktok.com/@username/video/7123456789012345678
"""

import sys
import json
import os
import requests
import argparse
import tempfile
import shutil
import subprocess
import re
from urllib.parse import urlparse, parse_qs
from bs4 import BeautifulSoup

# Try to import yt-dlp as a module
try:
    import yt_dlp
    YT_DLP_AVAILABLE = True
except ImportError:
    YT_DLP_AVAILABLE = False
    print("Warning: yt-dlp module not found. Falling back to web scraping.")

def extract_tiktok_id(url_or_id):
    """
    Extract TikTok video ID from a URL or return the ID if already provided
    
    Args:
        url_or_id (str): TikTok video URL or ID
        
    Returns:
        str: The extracted TikTok video ID
    """
    # Check if it's already just an ID (numeric)
    if url_or_id.isdigit():
        return url_or_id
    
    # Try to extract from URL
    try:
        # Parse the URL
        parsed_url = urlparse(url_or_id)
        
        # TikTok URLs can be in different formats
        # Format 1: https://www.tiktok.com/@username/video/1234567890123456789
        if 'tiktok.com' in parsed_url.netloc:
            path_parts = parsed_url.path.split('/')
            for i, part in enumerate(path_parts):
                if part == 'video' and i+1 < len(path_parts):
                    return path_parts[i+1]
        
        # Format 2: https://vm.tiktok.com/1234567890123456789/
        if 'vm.tiktok.com' in parsed_url.netloc:
            # This is a shortened URL, we need to follow redirects
            response = requests.head(url_or_id, allow_redirects=True)
            final_url = response.url
            return extract_tiktok_id(final_url)
            
    except Exception as e:
        print(f"Error extracting TikTok ID: {str(e)}")
    
    # If we couldn't extract an ID, return the original input
    # (it might be an ID in a format we don't recognize)
    return url_or_id

def get_transcript_with_web_scraping(video_url):
    """
    Fetch TikTok video transcript using web scraping
    
    Args:
        video_url (str): TikTok video URL
        
    Returns:
        dict: The transcript data or error message
    """
    video_id = extract_tiktok_id(video_url)
    
    # Ensure we have a full URL
    if video_id.isdigit():
        video_url = f"https://www.tiktok.com/@username/video/{video_id}"
    
    try:
        # Set up headers to mimic a browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        }
        
        # Make the request
        response = requests.get(video_url, headers=headers)
        response.raise_for_status()
        
        # Parse the HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Try to find the video description
        description = None
        
        # Look for meta tags that might contain the description
        meta_description = soup.find('meta', attrs={'name': 'description'})
        if meta_description and 'content' in meta_description.attrs:
            description = meta_description['content']
        
        # Look for the video title
        title = None
        meta_title = soup.find('meta', attrs={'property': 'og:title'})
        if meta_title and 'content' in meta_title.attrs:
            title = meta_title['content']
        
        # Look for any text that might be captions
        # This is a best-effort approach as TikTok doesn't expose captions in the HTML
        captions = []
        
        # Look for script tags that might contain captions data
        scripts = soup.find_all('script')
        for script in scripts:
            if script.string and '"captions":' in script.string:
                # Try to extract captions from the script
                captions_match = re.search(r'"captions":\s*\[(.*?)\]', script.string)
                if captions_match:
                    captions_data = captions_match.group(1)
                    # Parse the captions data
                    captions = [c.strip() for c in captions_data.split(',') if c.strip()]
        
        # If we found captions, use them
        if captions:
            return {
                "video_id": video_id,
                "transcript": ' '.join(captions),
                "source": "web_scraping_captions"
            }
        
        # If we found a description, use it
        if description:
            return {
                "video_id": video_id,
                "transcript": description,
                "source": "web_scraping_description",
                "note": "This transcript is extracted from the video description and may not be an actual transcript."
            }
        
        # If we found a title, use it
        if title:
            return {
                "video_id": video_id,
                "transcript": title,
                "source": "web_scraping_title",
                "note": "This transcript is just the video title, not an actual transcript."
            }
        
        # If we couldn't find any text, return an error
        return {
            "error": "Could not extract any text from the TikTok video page",
            "video_id": video_id,
            "source": "web_scraping_failed"
        }
        
    except Exception as e:
        return {
            "error": f"Web scraping error: {str(e)}",
            "video_id": video_id,
            "source": "web_scraping_error"
        }

def get_transcript_with_module(video_url):
    """
    Fetch TikTok video transcript using yt-dlp Python module
    
    Args:
        video_url (str): TikTok video URL
        
    Returns:
        dict: The transcript data or error message
    """
    video_id = extract_tiktok_id(video_url)
    
    # Create a temporary directory for downloads
    temp_dir = tempfile.mkdtemp()
    original_dir = os.getcwd()
    
    try:
        # Change to temp directory
        os.chdir(temp_dir)
        
        # First, try to get subtitles
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['all'],
            'subtitlesformat': 'vtt',
            'quiet': True,
            'no_warnings': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(video_url, download=False)
                
                # Check if subtitles were found
                if info.get('subtitles') or info.get('automatic_captions'):
                    # Download the subtitles
                    ydl.download([video_url])
                    
                    # Look for subtitle files
                    subtitle_files = [f for f in os.listdir('.') if f.endswith('.vtt')]
                    
                    if subtitle_files:
                        # Process the first subtitle file found
                        with open(subtitle_files[0], 'r', encoding='utf-8') as f:
                            content = f.read()
                            
                        # Process WebVTT to plain text
                        lines = content.split('\n')
                        transcript_lines = []
                        
                        for line in lines:
                            # Skip WebVTT headers, timing info, etc.
                            if (line.strip() and 
                                not line.startswith('WEBVTT') and 
                                not '-->' in line and 
                                not line.strip().replace(':', '').isdigit()):
                                transcript_lines.append(line.strip())
                        
                        transcript = ' '.join(transcript_lines)
                        
                        return {
                            "video_id": video_id,
                            "transcript": transcript,
                            "source": "yt-dlp_subtitles"
                        }
                
                # If no subtitles, try to get metadata
                if info.get('description'):
                    return {
                        "video_id": video_id,
                        "transcript": info['description'],
                        "source": "yt-dlp_description",
                        "note": "This transcript is extracted from the video description and may not be an actual transcript."
                    }
                
                # If we have metadata but no description with captions
                return {
                    "video_id": video_id,
                    "transcript": "No captions available for this video.",
                    "source": "yt-dlp_metadata_only",
                    "metadata": {
                        "title": info.get('title', 'Unknown'),
                        "uploader": info.get('uploader', 'Unknown'),
                        "duration": info.get('duration', 0)
                    }
                }
                
            except Exception as e:
                # If yt-dlp fails, try web scraping
                print(f"yt-dlp error: {str(e)}. Falling back to web scraping.")
                return get_transcript_with_web_scraping(video_url)
    
    finally:
        # Change back to original directory
        os.chdir(original_dir)
        # Clean up temporary directory
        shutil.rmtree(temp_dir, ignore_errors=True)

def get_transcript_with_command(video_url):
    """
    Fetch TikTok video transcript using yt-dlp command-line tool
    
    Args:
        video_url (str): TikTok video URL
        
    Returns:
        dict: The transcript data or error message
    """
    video_id = extract_tiktok_id(video_url)
    
    # Create a temporary directory for downloads
    temp_dir = tempfile.mkdtemp()
    original_dir = os.getcwd()
    
    try:
        # Change to temp directory
        os.chdir(temp_dir)
        
        # First, try to download subtitles directly using yt-dlp
        print("Attempting to download subtitles with yt-dlp...")
        subtitle_cmd = [
            "python", "-m", "yt_dlp",  # Use Python module instead of command
            "--skip-download",         # Don't download the video
            "--write-auto-sub",        # Include auto-generated subs
            "--write-sub",             # Write subtitles to disk
            "--sub-format", "vtt",     # Format as WebVTT
            "--sub-langs", "all",      # Try all available languages
            video_url
        ]
        
        subtitle_result = subprocess.run(subtitle_cmd, capture_output=True, text=True)
        
        # Check for subtitle files
        subtitle_files = [f for f in os.listdir('.') if f.endswith('.vtt')]
        
        if subtitle_files:
            print(f"Found subtitle files: {subtitle_files}")
            # Process the first subtitle file found
            with open(subtitle_files[0], 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Process WebVTT to plain text
            lines = content.split('\n')
            transcript_lines = []
            
            for line in lines:
                # Skip WebVTT headers, timing info, etc.
                if (line.strip() and 
                    not line.startswith('WEBVTT') and 
                    not '-->' in line and 
                    not line.strip().replace(':', '').isdigit()):
                    transcript_lines.append(line.strip())
            
            transcript = ' '.join(transcript_lines)
            
            return {
                "video_id": video_id,
                "transcript": transcript,
                "source": "yt-dlp_subtitles"
            }
        
        # If no subtitles found, try to extract metadata
        print("No subtitles found. Attempting to extract metadata...")
        metadata_cmd = [
            "python", "-m", "yt_dlp",  # Use Python module instead of command
            "--skip-download",         # Don't download the video
            "--dump-json",             # Output video metadata as JSON
            video_url
        ]
        
        metadata_result = subprocess.run(metadata_cmd, capture_output=True, text=True)
        
        try:
            metadata = json.loads(metadata_result.stdout)
            
            # Check if there's a description that might contain captions
            description = metadata.get('description', '')
            
            if description:
                return {
                    "video_id": video_id,
                    "transcript": description,
                    "source": "yt-dlp_description",
                    "note": "This transcript is extracted from the video description and may not be an actual transcript."
                }
            
            # If we have metadata but no description with captions
            return {
                "video_id": video_id,
                "transcript": "No captions available for this video.",
                "source": "yt-dlp_metadata_only",
                "metadata": {
                    "title": metadata.get('title', 'Unknown'),
                    "uploader": metadata.get('uploader', 'Unknown'),
                    "duration": metadata.get('duration', 0)
                }
            }
            
        except json.JSONDecodeError:
            # If we couldn't parse the metadata, try web scraping
            print("Failed to extract metadata. Falling back to web scraping.")
            return get_transcript_with_web_scraping(video_url)
        
    except Exception as e:
        # If yt-dlp fails, try web scraping
        print(f"yt-dlp error: {str(e)}. Falling back to web scraping.")
        return get_transcript_with_web_scraping(video_url)
    finally:
        # Change back to original directory
        os.chdir(original_dir)
        # Clean up temporary directory
        shutil.rmtree(temp_dir, ignore_errors=True)

def get_transcript(video_id_or_url):
    """
    Fetch TikTok video transcript using yt-dlp or web scraping
    
    Args:
        video_id_or_url (str): TikTok video ID or URL
        
    Returns:
        dict: The transcript data or error message
    """
    # Extract the video ID if a URL was provided
    video_id = extract_tiktok_id(video_id_or_url)
    print(f"Fetching transcript for TikTok video ID: {video_id}")
    
    # Construct the full TikTok URL if only an ID was provided
    if video_id.isdigit():
        video_url = f"https://www.tiktok.com/@username/video/{video_id}"
    else:
        video_url = video_id_or_url
    
    # Try using the yt-dlp module if available
    if YT_DLP_AVAILABLE:
        result = get_transcript_with_module(video_url)
    else:
        result = get_transcript_with_command(video_url)
    
    # If yt-dlp failed, try web scraping
    if "error" in result and ("yt-dlp" in result["error"] or "Failed to extract" in result["error"]):
        print("yt-dlp failed. Falling back to web scraping.")
        web_result = get_transcript_with_web_scraping(video_url)
        
        # If web scraping also failed, provide a clear message
        if "error" in web_result:
            return {
                "video_id": video_id,
                "error": "Unable to extract transcript from TikTok video",
                "details": "TikTok has strong anti-scraping measures that prevent automated transcript extraction. Consider using the official TikTok app or website to view captions.",
                "source": "failed",
                "yt_dlp_error": result.get("error", "Unknown error"),
                "web_scraping_error": web_result.get("error", "Unknown error")
            }
        
        return web_result
    
    return result

def save_transcript(video_id, transcript_data, output_format="txt"):
    """
    Save transcript to a file
    
    Args:
        video_id (str): TikTok video ID
        transcript_data (dict): Transcript data
        output_format (str): Output format (txt or json)
        
    Returns:
        str: Path to the saved file
    """
    if output_format == "json":
        filename = f"tiktok_{video_id}_transcript.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(transcript_data, f, indent=2)
    else:
        filename = f"tiktok_{video_id}_transcript.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            if "error" in transcript_data:
                f.write(f"Error: {transcript_data['error']}")
            else:
                f.write(transcript_data.get("transcript", "No transcript available"))
    
    return filename

def main():
    parser = argparse.ArgumentParser(description="Extract transcripts from TikTok videos")
    parser.add_argument("video_id", help="TikTok video ID or URL")
    parser.add_argument("--output", "-o", choices=["txt", "json"], default="txt", 
                        help="Output format (txt or json, default: txt)")
    parser.add_argument("--save", "-s", action="store_true", 
                        help="Save transcript to a file (default: False)")
    
    args = parser.parse_args()
    
    transcript_data = get_transcript(args.video_id)
    
    if args.save:
        saved_file = save_transcript(extract_tiktok_id(args.video_id), transcript_data, args.output)
        print(f"\nTranscript saved to: {saved_file}")
    
    print("\nTranscript content:")
    if "error" in transcript_data:
        print(f"Error: {transcript_data['error']}")
    else:
        print(transcript_data.get("transcript", "No transcript available"))

if __name__ == "__main__":
    main() 