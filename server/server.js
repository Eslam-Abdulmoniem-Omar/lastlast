const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const { DOMParser } = require("xmldom");
const HttpsProxyAgent = require("https-proxy-agent");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Webshare proxy configuration - follows the Python library's implementation
class WebshareProxyConfig {
  constructor(
    proxyUsername,
    proxyPassword,
    domainName = "p.webshare.io",
    proxyPort = 80
  ) {
    this.proxyUsername = proxyUsername;
    this.proxyPassword = proxyPassword;
    this.domainName = domainName;
    this.proxyPort = proxyPort;
  }

  // Return URL in the same format as the Python implementation
  get url() {
    return `http://${this.proxyUsername}-rotate:${this.proxyPassword}@${this.domainName}:${this.proxyPort}/`;
  }

  // Convert to requests library format (used by axios)
  toRequestsDict() {
    return {
      http: this.url,
      https: this.url,
    };
  }

  // Should we prevent keeping connections alive?
  preventKeepingConnectionsAlive() {
    return true; // For rotating proxies, don't keep connections alive
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

// YouTube Transcript API implementation - follows the Python library's structure
class YouTubeTranscriptApi {
  constructor(cookiePath = null, proxyConfig = null, httpClient = null) {
    // Set up HTTP client (axios) with proxies if provided
    this.axiosConfig = {};

    if (proxyConfig) {
      const proxies = proxyConfig.toRequestsDict();

      // Configure axios to use the proxy
      this.axiosConfig.proxy = false; // Disable axios automatic proxy
      this.axiosConfig.httpsAgent = new HttpsProxyAgent(proxies.https);

      // If we should prevent keeping connections alive
      if (proxyConfig.preventKeepingConnectionsAlive()) {
        this.axiosConfig.headers = {
          Connection: "close",
        };
      }
    }

    // Set additional headers like the Python library
    this.axiosConfig.headers = {
      ...(this.axiosConfig.headers || {}),
      "Accept-Language": "en-US",
    };
  }

  async fetchTranscript(videoId, languages = ["en"]) {
    const videoInfoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`Fetching video info from ${videoInfoUrl}`);
    console.log("Using axios config:", JSON.stringify(this.axiosConfig));

    try {
      // Get the video page
      const response = await axios.get(videoInfoUrl, this.axiosConfig);
      const html = response.data;

      // Extract player response data
      const playerResponseMatch = html.match(/"playerResponse":(\{.*?\}\});/);
      if (!playerResponseMatch) {
        throw new Error("Could not extract playerResponse from YouTube page");
      }

      const playerResponse = JSON.parse(playerResponseMatch[1]);

      // Extract caption tracks
      const captionTracks =
        playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!captionTracks || captionTracks.length === 0) {
        throw new Error("No captions available for this video");
      }

      // Find the required language
      let selectedTrack = null;
      for (const langCode of languages) {
        selectedTrack = captionTracks.find(
          (track) => track.languageCode === langCode
        );
        if (selectedTrack) break;
      }

      // If no matching language found, use the first available
      if (!selectedTrack) {
        selectedTrack = captionTracks[0];
      }

      // Fetch the transcript XML
      console.log(`Fetching transcript from ${selectedTrack.baseUrl}`);
      const transcriptResponse = await axios.get(
        selectedTrack.baseUrl,
        this.axiosConfig
      );
      const transcriptXml = transcriptResponse.data;

      // Parse the transcript XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(transcriptXml, "text/xml");
      const textElements = xmlDoc.getElementsByTagName("text");

      // Convert to the required format
      const segments = [];
      for (let i = 0; i < textElements.length; i++) {
        const element = textElements[i];
        const text = element.textContent;
        const startTime = parseFloat(element.getAttribute("start") || 0);
        const duration = parseFloat(element.getAttribute("dur") || 0);

        segments.push({
          id: uuidv4(),
          speakerName: i % 2 === 0 ? "Speaker A" : "Speaker B",
          text,
          startTime,
          endTime: startTime + duration,
          vocabularyItems: [],
        });
      }

      return {
        segments,
        language: selectedTrack.languageCode,
        language_name:
          selectedTrack.name?.simpleText || selectedTrack.languageCode,
      };
    } catch (error) {
      console.error("Error fetching transcript:", error.message);
      throw error;
    }
  }
}

// Main transcript endpoint
app.get("/api/transcript", async (req, res) => {
  const startTime = Date.now();
  const { url } = req.query;
  const debug = req.query.debug === "true";

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

    // Initialize the proxy with Webshare credentials
    const proxyConfig = new WebshareProxyConfig(
      process.env.WEBSHARE_USERNAME,
      process.env.WEBSHARE_PASSWORD
    );

    // Initialize the API with the proxy config
    const api = new YouTubeTranscriptApi(null, proxyConfig);

    console.log(`Fetching transcript for video ID: ${videoId}`);
    console.log(`Proxy URL: ${proxyConfig.url}`);

    // Fetch the transcript
    const transcript = await api.fetchTranscript(videoId);

    const responseTime = Date.now() - startTime;
    console.log(`Request completed in ${responseTime}ms`);

    // Return the transcript data
    return res.json({
      data: {
        videoId,
        segments: transcript.segments,
        transcriptSource: "youtube-transcript-api",
        language: transcript.language,
        language_name: transcript.language_name,
      },
    });
  } catch (error) {
    console.error("Error processing request:", error);

    // More detailed error response for debugging
    return res.status(500).json({
      error: "Failed to process YouTube URL",
      details: error.message,
      stack: debug ? error.stack : undefined,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    proxyConfig: {
      username: process.env.WEBSHARE_USERNAME ? "✓ configured" : "✗ missing",
      password: process.env.WEBSHARE_PASSWORD ? "✓ configured" : "✗ missing",
    },
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(
    `Webshare proxy credentials: ${
      process.env.WEBSHARE_USERNAME ? "✓ configured" : "✗ missing"
    }`
  );
});
