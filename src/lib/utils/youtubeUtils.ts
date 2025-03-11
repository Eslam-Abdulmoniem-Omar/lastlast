/**
 * YouTube utility functions for handling videos and transcripts
 */

/**
 * Extract YouTube video ID from various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  // Handle different YouTube URL formats
  const regexPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
    /youtube\.com\/watch\?.*v=([^&]+)/,
    /youtube\.com\/shorts\/([^?&/]+)/
  ];

  for (const pattern of regexPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Convert a regular YouTube URL to an embed URL
 */
export function convertToEmbedUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Fetch transcript for a YouTube video using the YouTube API
 * Note: This requires a YouTube Data API key and the video must have captions
 */
export async function fetchYouTubeTranscript(videoId: string, apiKey: string): Promise<string | null> {
  try {
    // First, get the caption tracks available for the video
    const captionResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`
    );
    
    if (!captionResponse.ok) {
      throw new Error('Failed to fetch caption information');
    }
    
    const captionData = await captionResponse.json();
    
    // Find an English caption track if available
    const captionTracks = captionData.items || [];
    const englishTrack = captionTracks.find(
      (track: any) => track.snippet.language === 'en' || track.snippet.language.startsWith('en-')
    );
    
    if (!englishTrack) {
      throw new Error('No English captions found');
    }
    
    // Get the actual transcript content
    const transcriptResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/captions/${englishTrack.id}?key=${apiKey}`
    );
    
    if (!transcriptResponse.ok) {
      throw new Error('Failed to fetch transcript content');
    }
    
    const transcriptData = await transcriptResponse.text();
    return transcriptData;
  } catch (error) {
    console.error('Error fetching YouTube transcript:', error);
    return null;
  }
}

/**
 * Generate a transcript URL for a YouTube video
 * This creates a URL that can be used to fetch the transcript later
 */
export function generateTranscriptUrl(videoId: string): string {
  // This is a placeholder URL format that our API will understand
  return `/api/youtube/transcript/${videoId}`;
} 