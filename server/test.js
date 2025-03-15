const axios = require("axios");

// Test video URLs
const TEST_VIDEOS = [
  {
    name: "First YouTube video",
    url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    lang: "en",
  },
  {
    name: "YouTube Short",
    url: "https://www.youtube.com/shorts/TCXXXaY7BPU",
    lang: "en",
  },
];

// Test health endpoint
async function testHealthEndpoint() {
  console.log("\n1. Testing Health Endpoint...");

  try {
    const response = await axios.get(`http://localhost:3001/health`);
    console.log("✅ Health Check: OK");
    console.log(
      "Proxy Configured:",
      response.data.proxyConfigured ? "Yes" : "No"
    );
    return true;
  } catch (error) {
    console.error("❌ Health Check Failed");
    console.error("Error:", error.message);
    return false;
  }
}

// Test transcript fetching
async function testTranscriptFetching(video) {
  console.log(`\n2. Testing transcript fetching for: ${video.name}`);
  console.log(`Video URL: ${video.url}`);
  console.log(`Language: ${video.lang}`);

  try {
    const requestUrl = `http://localhost:3001/api/transcript?url=${encodeURIComponent(
      video.url
    )}&lang=${video.lang}`;
    console.log(`Request URL: ${requestUrl}`);

    const response = await axios.get(requestUrl);

    console.log("\n✅ Results:");
    console.log("Video ID:", response.data.data.videoId);
    console.log("Language:", response.data.data.language);
    console.log("Language Name:", response.data.data.languageName);
    console.log("Number of segments:", response.data.data.segments.length);
    console.log("Processing Time:", response.data.data.processingTime, "ms");

    if (response.data.data.segments.length > 0) {
      console.log("\nFirst few segments:");
      response.data.data.segments.slice(0, 3).forEach((segment, index) => {
        console.log(`\nSegment ${index + 1}:`);
        console.log(`Text: "${segment.text}"`);
        console.log(`Start Time: ${segment.startTime.toFixed(2)}s`);
        console.log(`End Time: ${segment.endTime.toFixed(2)}s`);
        console.log(`Speaker: ${segment.speakerName}`);
      });
    } else {
      console.log("\nNo transcript segments found.");
    }

    return true;
  } catch (error) {
    console.error("\n❌ Test Failed");

    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Error:", error.response.data.error);
      if (error.response.data.details) {
        console.error("Details:", error.response.data.details);
      }
      if (error.response.data.processingTime) {
        console.error(
          "Processing Time:",
          error.response.data.processingTime,
          "ms"
        );
      }
    } else {
      console.error("Error:", error.message);
    }

    return false;
  }
}

// Run all tests
async function runTests() {
  console.log("======================================");
  console.log("YouTube Transcript API Test");
  console.log("======================================");

  // First check if the server is running
  const serverRunning = await testHealthEndpoint();

  if (!serverRunning) {
    console.error("\n❌ Server is not running. Please start the server first.");
    return;
  }

  // Test with the first video
  await testTranscriptFetching(TEST_VIDEOS[0]);

  console.log("\n======================================");
  console.log("Tests completed!");
  console.log("======================================");
}

// Run the tests
runTests();
