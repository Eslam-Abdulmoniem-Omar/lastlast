# Video Transcript API

A simple API for extracting transcripts from YouTube and TikTok videos.

## Features

- Extract transcripts from YouTube videos
- Extract captions, descriptions, or titles from TikTok videos (with limitations)
- Support for both GET and POST requests
- Flexible URL or video ID input

## Endpoints

### YouTube Transcript

```
GET /?video_id=VIDEO_ID&language=LANGUAGE_CODE
```

Example:

```
GET /?video_id=Hc79sDi3f0U&language=en
```

### TikTok Transcript

```
GET /tiktok?video_id=VIDEO_ID_OR_URL
```

Example:

```
GET /tiktok?video_id=7123456789012345678
```

**Note:** Due to TikTok's anti-scraping measures, transcript extraction may not always work. The API will attempt to extract text from the video description or title if captions are not available.

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Deploy to Vercel:
   ```
   vercel
   ```

## Local Development

To run the API locally:

```
vercel dev
```

## Dependencies

- requests: For making HTTP requests
- beautifulsoup4: For web scraping
- yt-dlp: For YouTube and TikTok video processing
- vercel: For deployment

## Limitations

- TikTok has strong anti-scraping measures that may prevent automated transcript extraction
- YouTube transcripts may not be available for all videos
- The API relies on third-party services that may change their APIs or terms of service

## License

MIT
