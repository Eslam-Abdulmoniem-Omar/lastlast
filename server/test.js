const axios = require("axios");

// Test videos - one regular video and one shorts video
const TEST_VIDEOS = [
  {
    name: "Regular YouTube video",
    url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", // First YouTube video ever
  },
  {
    name: "YouTube Shorts",
    url: "https://www.youtube.com/shorts/VQ5lYYpLc9Y", // Popular short
  },
];

// Health check to verify proxy configuration
async function checkHealth() {
  console.log("Checking server health and proxy configuration...");

  try {
    const response = await axios.get("http://localhost:3001/health");
    console.log("Server health:", response.data.status);
    console.log("Proxy configuration:");
    console.log("  - Username:", response.data.proxyConfig.username);
    console.log("  - Password:", response.data.proxyConfig.password);

    if (
      response.data.proxyConfig.username === "✗ missing" ||
      response.data.proxyConfig.password === "✗ missing"
    ) {
      console.error("❌ Webshare credentials are missing or incorrect!");
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Server health check failed:", error.message);
    console.error('Make sure the server is running with "npm start"');
    return false;
  }
}

// Test transcript fetching for a specific video
async function testVideoTranscript(video) {
  console.log(`\n📹 Testing transcript for ${video.name}: ${video.url}`);

  try {
    const startTime = Date.now();
    const response = await axios.get(
      `http://localhost:3001/api/transcript?url=${encodeURIComponent(
        video.url
      )}&debug=true`,
      { timeout: 30000 } // 30 second timeout
    );
    const duration = Date.now() - startTime;

    console.log(`✅ Success (${duration}ms)`);
    console.log("Video ID:", response.data.data.videoId);
    console.log("Language:", response.data.data.language);
    console.log("Language name:", response.data.data.language_name);
    console.log("Segments:", response.data.data.segments.length);

    if (response.data.data.segments.length > 0) {
      console.log("\nFirst few segments:");
      response.data.data.segments.slice(0, 2).forEach((segment, index) => {
        console.log(`\nSegment ${index + 1}:`);
        console.log("  Text:", segment.text);
        console.log("  Start time:", segment.startTime);
        console.log("  End time:", segment.endTime);
        console.log("  Speaker:", segment.speakerName);
      });
    } else {
      console.warn("⚠️ No transcript segments were returned");
    }

    return true;
  } catch (error) {
    console.error("❌ Test failed");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Error:", error.response.data.error);
      console.error("Details:", error.response.data.details);
    } else {
      console.error("Error:", error.message);
    }

    return false;
  }
}

// Run all tests
async function runTests() {
  console.log("🚀 Starting YouTube Transcript API Tests\n");

  // First check health and configuration
  const healthCheck = await checkHealth();
  if (!healthCheck) {
    console.error("\n❌ Health check failed, aborting tests");
    return;
  }

  console.log("\n✅ Health check passed, running transcript tests...");

  // Test each video
  let passedTests = 0;
  for (const video of TEST_VIDEOS) {
    const passed = await testVideoTranscript(video);
    if (passed) passedTests++;
  }

  // Report results
  console.log("\n📊 Test Results:");
  console.log(`Passed: ${passedTests}/${TEST_VIDEOS.length}`);

  if (passedTests === TEST_VIDEOS.length) {
    console.log(
      "\n✅ All tests passed! The server is working correctly with Webshare proxy."
    );
  } else {
    console.log("\n⚠️ Some tests failed. Check the errors above for details.");
  }
}

// Run the tests
runTests();
