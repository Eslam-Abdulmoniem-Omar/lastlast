# YouTube Transcript Grabber

A reliable solution for extracting transcripts from YouTube videos using yt-dlp, which works even when the youtube-transcript-api fails due to IP blocking on cloud/server environments.

## Problem Statement

When using the popular `youtube-transcript-api` package on cloud/server environments (like AWS, DigitalOcean, or other cloud providers), you may encounter this error:

```
youtube_transcript_api._errors.TranscriptsDisabled:
Could not retrieve a transcript for the video https://www.youtube.com/watch?v=VIDEO_ID! This is most likely caused by:
Subtitles are disabled for this video
```

This happens even when the video clearly has subtitles available and the same code works fine on your local machine. This is because YouTube actively blocks IP addresses from cloud/server environments when accessing transcripts using unofficial methods.

## Solution

This tool uses `yt-dlp` instead of `youtube-transcript-api` to fetch YouTube transcripts. `yt-dlp` is more resilient against YouTube's blocking mechanisms and can reliably extract transcripts even from server environments.

## Requirements

- Python 3.6+
- yt-dlp (`pip install yt-dlp`)

## Installation

1. Clone this repository:

   ```
   git clone https://github.com/Eslam-Abdulmoniem-Omar/sayFlunetlastversion.git
   cd sayFlunetlastversion
   ```

2. Install requirements:
   ```
   pip install -r requirements.txt
   ```

## Usage

### Basic Usage

```bash
python youtube_transcript_grabber.py VIDEO_ID
```

For example:

```bash
python youtube_transcript_grabber.py w8rYQ40C9xo
```

### Advanced Usage

```bash
# Download specific language transcript (default is English)
python youtube_transcript_grabber.py VIDEO_ID --language es

# Save transcript to a file
python youtube_transcript_grabber.py VIDEO_ID --save

# Save transcript as JSON
python youtube_transcript_grabber.py VIDEO_ID --save --output json
```

### Command-line Arguments

- `video_id`: YouTube video ID (required)
- `--language`, `-l`: Preferred language for transcript (default: en)
- `--output`, `-o`: Output format (txt or json, default: txt)
- `--save`, `-s`: Save transcript to a file (default: False)

## Using as a Module

You can also use this as a module in your own Python code:

```python
from youtube_transcript_grabber import get_transcript

# Get transcript for a video
transcript = get_transcript("w8rYQ40C9xo")
print(transcript)

# Get transcript in a specific language
transcript = get_transcript("w8rYQ40C9xo", language="es")
print(transcript)
```

## API Endpoint (Vercel Deployment)

This repository includes a ready-to-deploy Vercel serverless function that provides an API endpoint for fetching YouTube transcripts.

### Deploying to Vercel

1. Fork or clone this repository
2. Connect your GitHub repository to Vercel
3. Deploy without any special configuration (the included `vercel.json` handles everything)

### API Usage

Once deployed, you can use the API as follows:

#### GET Request

```
https://your-vercel-deployment.vercel.app/api/?video_id=w8rYQ40C9xo&language=en
```

#### POST Request

```bash
curl -X POST https://your-vercel-deployment.vercel.app/api/ \
  -H "Content-Type: application/json" \
  -d '{"video_id": "w8rYQ40C9xo", "language": "en"}'
```

#### Response Format

```json
{
  "video_id": "w8rYQ40C9xo",
  "language": "en",
  "transcript": "full transcript text here..."
}
```

### Vercel Environment Variables

No special environment variables are required for this deployment, but you can customize these function settings in Vercel:

- Function Memory: Recommended 1024MB (set in vercel.json)
- Maximum Duration: Recommended 60s (set in vercel.json)

## Why This Works

1. Uses `yt-dlp` instead of `youtube-transcript-api`
2. More resilient against YouTube's blocking mechanisms
3. Handles auto-generated captions properly
4. Works in both local and server environments

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
