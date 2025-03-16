#!/usr/bin/env python3
"""
Test script for the TikTok Transcript API

This script tests the TikTok transcript grabber functionality
by fetching a transcript for a sample TikTok video.

Usage:
    python test_tiktok_api.py
"""

import os
import json
import subprocess
from tiktok_transcript_grabber import get_transcript, extract_tiktok_id

def test_extract_tiktok_id():
    """Test the TikTok ID extraction function"""
    test_cases = [
        # Direct ID
        {"input": "7123456789012345678", "expected": "7123456789012345678"},
        # Standard URL
        {"input": "https://www.tiktok.com/@username/video/7123456789012345678", "expected": "7123456789012345678"},
        # URL with parameters
        {"input": "https://www.tiktok.com/@username/video/7123456789012345678?is_copy_url=1&is_from_webapp=v1", "expected": "7123456789012345678"},
    ]
    
    print("Testing TikTok ID extraction...")
    for i, test in enumerate(test_cases):
        result = extract_tiktok_id(test["input"])
        if result == test["expected"]:
            print(f"✅ Test {i+1} passed: {test['input']} -> {result}")
        else:
            print(f"❌ Test {i+1} failed: {test['input']} -> {result} (expected {test['expected']})")

def check_yt_dlp_installed():
    """Check if yt-dlp is installed as a Python module"""
    try:
        import yt_dlp
        print(f"✅ yt-dlp module is installed (version: {yt_dlp.version.__version__})")
        return True
    except ImportError:
        print("❌ yt-dlp module is not installed. Please install it with: pip install yt-dlp")
        return False

def test_get_transcript():
    """Test the TikTok transcript grabber function"""
    # Check if yt-dlp is installed
    if not check_yt_dlp_installed():
        return
    
    # Try multiple TikTok video URLs
    video_urls = [
        "https://www.tiktok.com/@tiktok/video/7341581548993555755",  # Official TikTok account
        "https://www.tiktok.com/@khaby.lame/video/7305282118916517166",  # Popular creator
        "https://www.tiktok.com/@charlidamelio/video/7341581548993555755"  # Another popular creator
    ]
    
    for video_url in video_urls:
        print(f"\nTesting TikTok transcript grabber with video URL: {video_url}")
        try:
            transcript_data = get_transcript(video_url)
            
            if "error" in transcript_data:
                print(f"❌ Error: {transcript_data['error']}")
            else:
                print("✅ Successfully retrieved data:")
                print(f"Video ID: {transcript_data['video_id']}")
                print(f"Source: {transcript_data.get('source', 'Unknown')}")
                
                transcript = transcript_data.get("transcript", "No transcript available")
                if len(transcript) > 100:
                    print(f"Transcript: {transcript[:100]}...")
                else:
                    print(f"Transcript: {transcript}")
                
                # Save the full response for inspection
                with open(f"tiktok_transcript_{transcript_data['video_id']}_response.json", "w", encoding="utf-8") as f:
                    json.dump(transcript_data, f, indent=2)
                print(f"Full response saved to tiktok_transcript_{transcript_data['video_id']}_response.json")
                
                # If we got a successful response, no need to try more URLs
                if transcript and transcript != "No captions available for this video.":
                    break
        
        except Exception as e:
            print(f"❌ Exception: {str(e)}")

if __name__ == "__main__":
    print("=== TikTok Transcript API Test ===\n")
    
    # Test ID extraction
    test_extract_tiktok_id()
    
    # Test transcript grabbing
    test_get_transcript()
    
    print("\n=== Test Complete ===") 