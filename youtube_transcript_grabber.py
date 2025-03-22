#!/usr/bin/env python3
"""
YouTube Transcript Grabber

A reliable solution for extracting transcripts from YouTube videos
using yt-dlp, which works even when the youtube-transcript-api fails
due to IP blocking on cloud/server environments.

Usage:
    python youtube_transcript_grabber.py VIDEO_ID
    
Example:
    python youtube_transcript_grabber.py w8rYQ40C9xo
"""

import sys
import json
import subprocess
import os
import tempfile
import shutil
import argparse

def get_transcript(video_id, language="en", clean_output=True):
    """
    Fetch YouTube video transcript using yt-dlp
    
    Args:
        video_id (str): YouTube video ID
        language (str): Preferred language for transcript (default: "en")
        clean_output (bool): Whether to clean the output by removing unnecessary text
        
    Returns:
        str: The transcript text or error message
    """
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    print(f"Fetching transcript for: {video_url}")
    
    # Create a temporary directory for storing subtitle files
    temp_dir = tempfile.mkdtemp()
    original_dir = os.getcwd()
    
    try:
        # Change to temp directory for subtitle downloads
        os.chdir(temp_dir)
        
        # Run yt-dlp as a module to list available subtitles
        list_subs_cmd = ["python", "-m", "yt_dlp", "--list-subs", video_url]
        result = subprocess.run(list_subs_cmd, capture_output=True, text=True)
        
        if "has no subtitles" in result.stdout:
            return "This video has no subtitles available."
        
        # Get available languages
        print(f"Checking for available subtitles in {language}...")
        
        # Try to download the specified language, then fallback to variants
        language_variants = [language]
        if language == "en":
            language_variants.extend(["en-US", "en-GB", "en-CA", "en-AU"])
        
        for lang in language_variants:
            try:
                # Try to download subtitles in the current language
                download_cmd = [
                    "python", "-m", "yt_dlp", 
                    "--skip-download",         # Don't download the video
                    "--write-auto-sub",        # Include auto-generated subs
                    f"--sub-lang={lang}",      # Specify language
                    "--write-sub",             # Write subtitles to disk
                    "--sub-format=vtt",        # Format as WebVTT
                    video_url
                ]
                
                print(f"Attempting to download {lang} subtitles...")
                result = subprocess.run(download_cmd, capture_output=True, text=True)
                
                # Check for subtitle files
                subtitle_files = [f for f in os.listdir('.') if f.endswith(f'.{lang}.vtt')]
                
                if subtitle_files:
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
                    return transcript
                else:
                    print(f"No subtitle files found for language {lang}")
                    continue  # Try next language
                    
            except Exception as e:
                print(f"Error with {lang}: {str(e)}")
                continue  # Try next language
        
        # If we get here, all languages failed
        return "Could not retrieve transcript in any of the specified languages."
        
    except Exception as e:
        return f"Error: {str(e)}"
    finally:
        # Change back to original directory
        os.chdir(original_dir)
        # Clean up temporary directory
        shutil.rmtree(temp_dir, ignore_errors=True)

def save_transcript(video_id, transcript, output_format="txt"):
    """
    Save transcript to a file
    
    Args:
        video_id (str): YouTube video ID
        transcript (str): Transcript text
        output_format (str): Output format (txt or json)
        
    Returns:
        str: Path to the saved file
    """
    if output_format == "json":
        filename = f"{video_id}_transcript.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump({"video_id": video_id, "transcript": transcript}, f, indent=2)
    else:
        filename = f"{video_id}_transcript.txt"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(transcript)
    
    return filename

def main():
    parser = argparse.ArgumentParser(description="Extract transcripts from YouTube videos using yt-dlp")
    parser.add_argument("video_id", help="YouTube video ID (e.g., 'w8rYQ40C9xo')")
    parser.add_argument("--language", "-l", default="en", help="Preferred language for transcript (default: en)")
    parser.add_argument("--output", "-o", choices=["txt", "json"], default="txt", 
                        help="Output format (txt or json, default: txt)")
    parser.add_argument("--save", "-s", action="store_true", 
                        help="Save transcript to a file (default: False)")
    
    args = parser.parse_args()
    
    transcript = get_transcript(args.video_id, args.language)
    
    if args.save:
        saved_file = save_transcript(args.video_id, transcript, args.output)
        print(f"\nTranscript saved to: {saved_file}")
    
    print("\nTranscript content:")
    print(transcript)

if __name__ == "__main__":
    main() 