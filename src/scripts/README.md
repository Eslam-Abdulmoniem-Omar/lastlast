# YouTube Video Processing Scripts

This directory contains Python scripts used by the Next.js application to process YouTube videos.

## Setup

1. Ensure you have Python 3.7+ installed on your system
2. Install the required dependencies:

```bash
pip install -r requirements.txt
```

## Usage

The main script is `youtube_utils.py` which provides three main functions:

1. **Get Video Transcript**

   - Extracts subtitles/transcript from YouTube videos
   - Supports multiple languages

2. **Get Video Metadata**

   - Extracts title, author, thumbnail, duration, etc.

3. **Download Video**
   - Downloads the video to a specified path

## How it Works with Next.js

The Next.js application calls these Python scripts using Node.js's `child_process` module. The scripts return JSON data that is then processed by the TypeScript API routes.

## Troubleshooting

If you encounter errors:

1. Make sure Python is in your PATH and can be run from any directory
2. Verify that all dependencies are installed
3. Check console logs for specific error messages
4. For permission issues, try running with administrator privileges

## Adding New Functionality

When adding new functionality:

1. Add your Python function to `youtube_utils.py`
2. Update the command-line interface in the `if __name__ == "__main__":` section
3. Add corresponding TypeScript code in the Next.js API routes
