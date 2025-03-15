const express = require("express");
const cors = require("cors");
const { YoutubeTranscript } = require("youtube-transcript");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to extract video ID from YouTube URL
function extractVideoId(url) {
  let videoId = null;

  try {
    if (url.includes("youtube.com/watch")) {
      const urlParams = new URLSearchParams(new URL(url).search);
      videoId = urlParams.get("v");
    } else if (url.includes("youtu.be")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0];
    } else if (url.includes("youtube.com/embed")) {
      videoId = url.split("youtube.com/embed/")[1]?.split("?")[0];
    } else if (url.includes("youtube.com/shorts")) {
      videoId = url.split("youtube.com/shorts/")[1]?.split("?")[0];
    }
  } catch (error) {
    console.error("Error extracting video ID:", error);
  }

  return videoId;
}

// Helper function to parse ISO 8601 duration to seconds
function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) return 0;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
}

// Function to fetch video metadata from YouTube API
async function fetchVideoMetadata(videoId) {
  try {
    const apiKey =
      process.env.YOUTUBE_API_KEY || "AIzaSyBc_9DZAQrhUsbPvGa6WkGO3mUWprHGjj0";
    const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;

    const response = await axios.get(videoDetailsUrl);
    const videoDetails = response.data;

    if (videoDetails?.items?.length > 0) {
      const durationISO = videoDetails.items[0].contentDetails.duration;
      const durationSeconds = parseDuration(durationISO);

      return {
        title: videoDetails.items[0].snippet.title || "Video Title",
        author_name:
          videoDetails.items[0].snippet.channelTitle || "Unknown Creator",
        thumbnail_url:
          videoDetails.items[0].snippet.thumbnails?.high?.url ||
          `https://img.youtube.com/vi/${videoId}/0.jpg`,
        duration: durationSeconds,
        isTooLong: durationSeconds > 120,
      };
    }

    throw new Error("Video details not found");
  } catch (error) {
    console.error("Error fetching video metadata:", error);
    return {
      title: "Video Information Unavailable",
      author_name: "Unknown Creator",
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/0.jpg`,
      duration: 0,
      isTooLong: false,
    };
  }
}

// Main transcript endpoint
app.get("/api/transcript", async (req, res) => {
  const startTime = Date.now();
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "YouTube URL is required" });
  }

  try {
    const videoId = extractVideoId(url);
    if (!videoId) {
      return res
        .status(400)
        .json({ error: "Could not extract video ID from URL" });
    }

    // Fetch video metadata
    const metadata = await fetchVideoMetadata(videoId);
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;

    // Check video duration
    if (metadata.isTooLong) {
      return res.status(413).json({
        error: "Video is too long (maximum 2 minutes allowed)",
        data: {
          videoId,
          ...metadata,
          embedUrl,
        },
      });
    }

    // Fetch transcript
    let transcript = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcript || transcript.length === 0) {
      // Try with language parameter if first attempt fails
      transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: "en",
      });
    }

    // Process transcript into dialogue segments
    const segments = transcript.map((item, index) => ({
      id: uuidv4(),
      speakerName: index % 2 === 0 ? "Speaker A" : "Speaker B",
      text: item.text,
      startTime: item.offset / 1000,
      endTime: (item.offset + item.duration) / 1000,
      vocabularyItems: [],
    }));

    const responseTime = Date.now() - startTime;
    console.log(`Request completed in ${responseTime}ms`);

    return res.json({
      data: {
        videoId,
        title: metadata.title,
        author: metadata.author_name,
        thumbnailUrl: metadata.thumbnail_url,
        embedUrl,
        segments,
        transcriptSource: "transcript",
        duration: metadata.duration,
      },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Failed to process YouTube URL",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
