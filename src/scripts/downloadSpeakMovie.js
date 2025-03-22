const fs = require("fs");
const path = require("path");
const https = require("https");

const PUBLIC_DIR = path.join(__dirname, "../../public");

// Ensure public directory exists
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// Function to download an image with redirect support
const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    const requestCallback = (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        console.log(`Redirecting to: ${redirectUrl}`);

        // Choose http or https based on the redirect URL
        const client = redirectUrl.startsWith("https") ? https : http;
        client.get(redirectUrl, requestCallback).on("error", handleError);
        return;
      }

      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close();
          console.log(`Downloaded: ${filepath}`);
          resolve();
        });
      } else {
        console.error(`Failed to download ${url}: ${response.statusCode}`);
        reject(new Error(`HTTP Status Code: ${response.statusCode}`));
      }
    };

    const handleError = (err) => {
      console.error(`Error downloading ${url}: ${err.message}`);
      reject(err);
    };

    // Choose http or https based on the URL
    const client = url.startsWith("https") ? https : http;
    client.get(url, requestCallback).on("error", handleError);
  });
};

// Download speakMovie image
const downloadSpeakMovieImage = async () => {
  const filePath = path.join(PUBLIC_DIR, "speakMovie.png");

  // Use an image of Tom Hiddleston as Loki from a scene in Avengers
  // This is a placeholder URL - replace with a real image URL if needed
  console.log("Creating or downloading speakMovie.png...");

  try {
    // If you need a different image, replace this URL with the appropriate one
    await downloadImage("https://i.imgur.com/JY5WFUv.jpg", filePath);
    console.log(`Successfully downloaded speakMovie.png to ${filePath}`);
  } catch (error) {
    console.error(
      "Failed to download the image, creating a placeholder text file instead"
    );
    fs.writeFileSync(
      filePath + ".txt",
      "This is a placeholder for the speakMovie.png image. Please replace with an actual movie clip image."
    );
    console.log(`Created placeholder text file: ${filePath}.txt`);
  }
};

// Run the download
downloadSpeakMovieImage();
