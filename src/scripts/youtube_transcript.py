from youtube_transcript_api import YouTubeTranscriptApi
import re
import sys
import json

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
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        return transcript
    except Exception as e:
        return {"error": str(e)}

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