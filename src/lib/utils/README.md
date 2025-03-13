# YouTube Utility Functions

This directory contains utility functions that handle YouTube-related functionality in the application. These functions have been extracted to ensure they remain stable and don't get accidentally modified during future development.

## Available Functions

### URL Handling

- `validateYoutubeUrl(url: string): boolean` - Validates if a string is a valid YouTube URL (regular or shorts format)
- `extractVideoId(url: string): string | null` - Extracts the video ID from various YouTube URL formats
- `convertToEmbedUrl(url: string): string` - Converts a regular YouTube URL to an embed URL format

### Transcript and Segments

- `fetchTranscript(url: string, callbacks): Promise<any>` - Fetches transcript data from the YouTube API with callback options
- `createDefaultSegments(): DialogueSegment[]` - Creates default dialogue segments when a transcript is not available
- `getTranscriptSourceInfo(transcriptSource: string): { colorClass: string, message: string }` - Gets styling and message information for transcript sources

### Data Handling

- `saveTemporaryPracticeData(data: {...}): Object` - Creates and saves a temporary practice session in localStorage
- `formatTime(seconds: number): string` - Formats time in seconds to MM:SS format

## How to Use

Import the functions directly from the utility file:

```typescript
import {
  validateYoutubeUrl,
  convertToEmbedUrl,
} from "@/lib/utils/youtubeUtils";

// Example usage
const isValid = validateYoutubeUrl(
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
);
const embedUrl = convertToEmbedUrl(
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
);
```

## Fetching Transcripts

The `fetchTranscript` function accepts callbacks for different stages of the fetch process:

```typescript
import { fetchTranscript } from "@/lib/utils/youtubeUtils";

fetchTranscript(youtubeUrl, {
  onStart: () => {
    // Handle start of fetching (e.g., show loading indicator)
    setIsLoading(true);
  },
  onSuccess: (data) => {
    // Handle successful fetch (data contains title, embedUrl, segments, transcriptSource)
    setTitle(data.title);
    setDialogueSegments(data.segments);
  },
  onError: (error) => {
    // Handle error
    setError(error.message);
  },
  onComplete: () => {
    // Always runs after success or error
    setIsLoading(false);
  },
});
```

## Practice Data

Use `saveTemporaryPracticeData` to store practice data in localStorage:

```typescript
import { saveTemporaryPracticeData } from "@/lib/utils/youtubeUtils";

// Save practice data
const practiceData = saveTemporaryPracticeData({
  title: "My Video",
  embedUrl: embedUrl,
  youtubeUrl: youtubeUrl,
  dialogueSegments: segments,
  isTemporary: true, // optional, defaults to true
});
```

## Important Notes

1. These functions should remain consistent to ensure compatibility with existing components.
2. If you need to modify functionality, consider creating new utility functions with different names.
3. This approach helps maintain a stable core for YouTube functionality across the application.
