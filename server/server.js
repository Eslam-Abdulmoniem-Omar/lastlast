const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const HttpsProxyAgent = require("https-proxy-agent");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Webshare proxy configuration
class WebshareProxyConfig {
  constructor(username, password, domain = "p.webshare.io", port = 80) {
    this.username = username;
    this.password = password;
    this.domain = domain;
    this.port = port;
  }

  getProxyUrl() {
    return `http://${this.username}-rotate:${this.password}@${this.domain}:${this.port}`;
  }

  getAxiosConfig() {
    const proxyUrl = this.getProxyUrl();
    return {
      httpsAgent: new HttpsProxyAgent(proxyUrl),
      proxy: false, // Disable axios's default proxy handling
      headers: {
        Connection: "close", // Prevent keeping connections alive for rotating proxies
      },
    };
  }
}

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

// YouTube transcript fetcher class
class YouTubeTranscriptFetcher {
  constructor(proxyConfig = null) {
    this.proxyConfig = proxyConfig;
    this.axiosConfig = proxyConfig ? proxyConfig.getAxiosConfig() : {};
  }

  async fetchTranscript(videoId, lang = "en") {
    try {
      // First, get the video info to check if transcripts are available
      const videoInfoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await axios.get(videoInfoUrl, this.axiosConfig);

      // Extract transcript data from the response
      const html = response.data;
      const captionTracks = this.extractCaptionTracks(html);

      if (!captionTracks || captionTracks.length === 0) {
        throw new Error("No transcripts available for this video");
      }

      // Find the requested language or fallback to first available
      const track =
        this.findLanguageTrack(captionTracks, lang) || captionTracks[0];

      // Fetch the actual transcript data
      const transcriptResponse = await axios.get(
        track.baseUrl,
        this.axiosConfig
      );
      const transcript = this.parseTranscriptData(transcriptResponse.data);

      return transcript;
    } catch (error) {
      console.error("Error fetching transcript:", error);
      throw error;
    }
  }

  extractCaptionTracks(html) {
    try {
      const playerResponse = JSON.parse(
        html.match(/"playerResponse":({.*?});/)[1]
      );
      return (
        playerResponse.captions?.playerCaptionsTracklistRenderer
          ?.captionTracks || []
      );
    } catch (error) {
      console.error("Error extracting caption tracks:", error);
      return [];
    }
  }

  findLanguageTrack(tracks, langCode) {
    return tracks.find((track) => track.languageCode === langCode);
  }

  parseTranscriptData(xmlData) {
    // Parse the XML transcript data and convert to our format
    const segments = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlData, "text/xml");
    const textNodes = doc.getElementsByTagName("text");

    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      segments.push({
        id: uuidv4(),
        text: node.textContent,
        startTime: parseFloat(node.getAttribute("start")),
        duration: parseFloat(node.getAttribute("dur")),
        speakerName: i % 2 === 0 ? "Speaker A" : "Speaker B",
        vocabularyItems: [],
      });
    }

    return segments;
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

    // Initialize the transcript fetcher with Webshare proxy config
    const proxyConfig = new WebshareProxyConfig(
      process.env.WEBSHARE_USERNAME,
      process.env.WEBSHARE_PASSWORD
    );

    const transcriptFetcher = new YouTubeTranscriptFetcher(proxyConfig);

    // Fetch transcript
    const segments = await transcriptFetcher.fetchTranscript(videoId);

    const responseTime = Date.now() - startTime;
    console.log(`Request completed in ${responseTime}ms`);

    return res.json({
      data: {
        videoId,
        segments,
        transcriptSource: "youtube-transcript-api",
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
