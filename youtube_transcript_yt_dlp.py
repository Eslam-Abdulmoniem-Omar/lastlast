import sys
import json
import subprocess
import os
import tempfile
import shutil

def get_transcript(video_id):
    """
    Fetch YouTube video transcript using yt-dlp
    
    Args:
        video_id: YouTube video ID
        
    Returns:
        The transcript text or error message
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
        print("Available subtitle languages:")
        print(result.stdout)
        
        # Try to download English subtitles first, fallback to auto-generated if needed
        languages = ["en", "en-US", "en-GB", "en-CA", "en-AU"]
        
        for lang in languages:
            try:
                # Try to download subtitles in the current language
                download_cmd = [
                    "python", "-m", "yt_dlp", 
                    "--skip-download",  # Don't download the video
                    "--write-auto-sub",  # Include auto-generated subs
                    f"--sub-lang={lang}",  # Specify language
                    "--write-sub",  # Write subtitles to disk
                    "--sub-format=vtt",  # Format as WebVTT
                    video_url
                ]
                
                print(f"Trying to download {lang} subtitles...")
                result = subprocess.run(download_cmd, capture_output=True, text=True)
                print(f"Command output: {result.stdout}")
                
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
                    # List files in the directory to debug
                    print(f"Files in directory: {os.listdir('.')}")
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

if __name__ == "__main__":
    if len(sys.argv) > 1:
        video_id = sys.argv[1]
    else:
        video_id = "w8rYQ40C9xo"  # Default to the video ID from your original error
        
    transcript = get_transcript(video_id)
    print("\nTranscript content:")
    print(transcript) 