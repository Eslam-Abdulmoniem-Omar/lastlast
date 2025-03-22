#!/usr/bin/env python3
"""
Example usage of youtube_transcript_grabber as a module
"""

from youtube_transcript_grabber import get_transcript, save_transcript

def main():
    # Example 1: Get transcript and print it
    video_id = "w8rYQ40C9xo"
    print(f"Example 1: Getting transcript for video {video_id}")
    transcript = get_transcript(video_id)
    print(f"Transcript preview: {transcript[:150]}...\n")
    
    # Example 2: Get transcript in a specific language
    video_id = "dQw4w9WgXcQ"  # A popular video with multiple language subtitles
    print(f"Example 2: Getting Spanish transcript for video {video_id}")
    try:
        transcript = get_transcript(video_id, language="es")
        print(f"Spanish transcript preview: {transcript[:150]}...\n")
    except Exception as e:
        print(f"Error getting Spanish transcript: {e}\n")
    
    # Example 3: Save transcript to a file
    video_id = "w8rYQ40C9xo"
    print(f"Example 3: Saving transcript for video {video_id}")
    transcript = get_transcript(video_id)
    
    # Save as text
    txt_file = save_transcript(video_id, transcript, output_format="txt")
    print(f"Saved transcript as text: {txt_file}")
    
    # Save as JSON
    json_file = save_transcript(video_id, transcript, output_format="json")
    print(f"Saved transcript as JSON: {json_file}")

if __name__ == "__main__":
    main() 