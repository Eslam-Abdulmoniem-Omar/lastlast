const axios = require("axios");

// Test video URL (this is a short video with English captions)
const TEST_VIDEO_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw";

async function testTranscriptFetching() {
  console.log("Starting transcript fetching test...");
  console.log(`Testing with video: ${TEST_VIDEO_URL}`);

  try {
    const response = await axios.get(
      `http://localhost:3001/api/transcript?url=${encodeURIComponent(
        TEST_VIDEO_URL
      )}`
    );

    console.log("\nTest Results:");
    console.log("Status: ✅ Success");
    console.log("Video ID:", response.data.data.videoId);
    console.log("Number of segments:", response.data.data.segments.length);
    console.log("\nFirst few segments:");
    response.data.data.segments.slice(0, 3).forEach((segment, index) => {
      console.log(`\nSegment ${index + 1}:`);
      console.log("Text:", segment.text);
      console.log("Start Time:", segment.startTime);
      console.log("Speaker:", segment.speakerName);
    });
  } catch (error) {
    console.error("\nTest Failed ❌");
    console.error("Error:", error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error("Details:", error.response.data.details);
    }
  }
}

// Run the test
testTranscriptFetching();
