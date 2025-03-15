const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const HttpsProxyAgent = require("https-proxy-agent");
const { DOMParser } = require("xmldom");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Webshare proxy configuration - matches Python WebshareProxyConfig
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

  getProxyUrl() {
    // Create the same format as Python implementation
    return `http://${this.proxyUsername}-rotate:${this.proxyPassword}@${this.domainName}:${this.proxyPort}`;
  }

  getAxiosConfig() {
    const proxyUrl = this.getProxyUrl();
    console.log(
      `Using proxy: ${proxyUrl.replace(
        /(http:\/\/)(.+?):(.+?)@/,
        "$1****:****@"
      )}`
    );

    return {
      httpsAgent: new HttpsProxyAgent(proxyUrl),
      proxy: false, // Disable axios's default proxy handling
      headers: {
        Connection: "close", // Prevent keeping connections alive for rotating proxies
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 30000, // 30 second timeout
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
class YouTubeTranscriptApi {
  constructor(proxyConfig = null, cookies = null) {
    this.proxyConfig = proxyConfig;
    this.cookies = cookies;
    this.axiosConfig = proxyConfig ? proxyConfig.getAxiosConfig() : {};
  }

  // Extract transcript data from the initial video page
  extractTranscriptData(html) {
    console.log("Extracting transcript data from HTML");

    try {
      // Find the ytInitialPlayerResponse JSON data
      const playerResponseMatch = html.match(
        /"playerResponse":\s*(\{.+?\}\}\})/s
      );
      if (!playerResponseMatch || !playerResponseMatch[1]) {
        console.error("Could not find player response data");
        return null;
      }

      // Clean up the JSON string to make it parseable
      const jsonStr = playerResponseMatch[1]
        .replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        )
        .replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        );

      let playerResponse;
      try {
        playerResponse = JSON.parse(jsonStr);
      } catch (err) {
        console.error("Failed to parse player response JSON:", err);

        // Try a different approach to extract the JSON
        const altMatch = html.match(
          /ytInitialPlayerResponse\s*=\s*(\{.+?\}\}\});/s
        );
        if (!altMatch || !altMatch[1]) {
          throw new Error("Could not extract player response data");
        }

        playerResponse = JSON.parse(altMatch[1]);
      }

      // Extract caption tracks
      if (
        playerResponse &&
        playerResponse.captions &&
        playerResponse.captions.playerCaptionsTracklistRenderer &&
        playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks
      ) {
        return playerResponse.captions.playerCaptionsTracklistRenderer;
      }

      return null;
    } catch (error) {
      console.error("Error parsing transcript data:", error);
      return null;
    }
  }

  // Find a transcript in the desired language
  findTranscript(captionTracks, languageCodes) {
    if (!captionTracks || !captionTracks.length) {
      return null;
    }

    // First try to find an exact match
    for (const langCode of languageCodes) {
      const exactMatch = captionTracks.find(
        (track) => track.languageCode === langCode
      );

      if (exactMatch) {
        return exactMatch;
      }
    }

    // If no exact match, return the first available track
    console.log("No exact language match found, using first available track");
    return captionTracks[0];
  }

  // Parse XML transcript data
  parseTranscriptXml(xmlData) {
    console.log("Parsing transcript XML data");

    try {
      const parser = new DOMParser({
        locator: {},
        errorHandler: {
          warning: function () {},
          error: function () {},
          fatalError: function (m) {
            console.error(m);
          },
        },
      });

      const xmlDoc = parser.parseFromString(xmlData, "text/xml");
      const textElements = xmlDoc.getElementsByTagName("text");

      const segments = [];

      for (let i = 0; i < textElements.length; i++) {
        const element = textElements[i];

        // Get text content, start time, and duration
        const text = element.textContent || "";
        const start = parseFloat(element.getAttribute("start") || "0");
        const duration = parseFloat(element.getAttribute("dur") || "0");

        if (text.trim()) {
          segments.push({
            id: uuidv4(),
            speakerName: i % 2 === 0 ? "Speaker A" : "Speaker B",
            text: text.trim(),
            startTime: start,
            endTime: start + duration,
            vocabularyItems: [],
          });
        }
      }

      return segments;
    } catch (error) {
      console.error("Error parsing XML transcript:", error);
      throw new Error("Failed to parse transcript data: " + error.message);
    }
  }

  // Main method to fetch transcript
  async fetch(videoId, languages = ["en"]) {
    console.log(
      `Fetching transcript for video ${videoId} with languages: ${languages.join(
        ", "
      )}`
    );

    try {
      // 1. Fetch the video page
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      console.log(`Fetching video page: ${videoUrl}`);

      const videoPageResponse = await axios.get(videoUrl, this.axiosConfig);

      // 2. Extract transcript data
      const transcriptData = this.extractTranscriptData(videoPageResponse.data);

      if (!transcriptData) {
        throw new Error("Could not extract transcript data from video");
      }

      // 3. Find caption track for requested language
      const { captionTracks } = transcriptData;

      if (!captionTracks || !captionTracks.length) {
        throw new Error("No caption tracks available for this video");
      }

      console.log(`Found ${captionTracks.length} caption tracks`);
      captionTracks.forEach((track) => {
        console.log(
          `- ${track.name?.simpleText || "Unknown"} (${track.languageCode})`
        );
      });

      // 4. Select the appropriate track
      const selectedTrack = this.findTranscript(captionTracks, languages);

      if (!selectedTrack) {
        throw new Error(
          `No transcript available in languages: ${languages.join(", ")}`
        );
      }

      console.log(
        `Selected track: ${selectedTrack.name?.simpleText || "Unknown"} (${
          selectedTrack.languageCode
        })`
      );

      // 5. Fetch the actual transcript data
      console.log(`Fetching transcript from: ${selectedTrack.baseUrl}`);
      const transcriptResponse = await axios.get(
        selectedTrack.baseUrl,
        this.axiosConfig
      );

      // 6. Parse the transcript XML
      const segments = this.parseTranscriptXml(transcriptResponse.data);

      console.log(`Successfully parsed ${segments.length} transcript segments`);

      return {
        segments,
        language: selectedTrack.languageCode,
        languageName: selectedTrack.name?.simpleText || "Unknown",
        isGenerated: true, // Assume auto-generated
      };
    } catch (error) {
      console.error("Error fetching transcript:", error);
      throw error;
    }
  }
}

// Main transcript endpoint
app.get("/api/transcript", async (req, res) => {
  const startTime = Date.now();
  const { url, lang = "en" } = req.query;

  if (!url) {
    return res.status(400).json({ error: "YouTube URL is required" });
  }

  console.log(`Received request for transcript: ${url} (lang: ${lang})`);

  try {
    const videoId = extractVideoId(url);
    if (!videoId) {
      return res
        .status(400)
        .json({ error: "Could not extract video ID from URL" });
    }

    console.log(`Extracted video ID: ${videoId}`);

    // Initialize the transcript fetcher with Webshare proxy config
    const proxyConfig = new WebshareProxyConfig(
      process.env.WEBSHARE_USERNAME,
      process.env.WEBSHARE_PASSWORD
    );

    // Create a new instance of the transcript API
    const youtubeTranscriptApi = new YouTubeTranscriptApi(proxyConfig);

    // Fetch transcript
    const transcript = await youtubeTranscriptApi.fetch(videoId, [lang]);

    const responseTime = Date.now() - startTime;
    console.log(`Request completed successfully in ${responseTime}ms`);

    return res.json({
      data: {
        videoId,
        segments: transcript.segments,
        language: transcript.language,
        languageName: transcript.languageName,
        transcriptSource: "youtube-transcript-api",
        processingTime: responseTime,
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`Error processing request (${responseTime}ms):`, error);

    return res.status(500).json({
      error: "Failed to process YouTube URL",
      details: error.message,
      processingTime: responseTime,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    proxyConfigured:
      !!process.env.WEBSHARE_USERNAME && !!process.env.WEBSHARE_PASSWORD,
  });
});

app.listen(port, () => {
  console.log(`YouTube Transcript Server running on port ${port}`);
  console.log(
    `Webshare Proxy configured: ${
      !!process.env.WEBSHARE_USERNAME && !!process.env.WEBSHARE_PASSWORD
    }`
  );
});
