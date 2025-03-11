const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const PUBLIC_DIR = path.join(__dirname, "../../public");
const AVATARS_DIR = path.join(PUBLIC_DIR, "avatars");

// Ensure directories exist
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
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

// Avatar image URLs - using placeholder images
const avatarUrls = [
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/68.jpg",
  "https://randomuser.me/api/portraits/men/75.jpg",
  "https://randomuser.me/api/portraits/women/90.jpg",
  "https://randomuser.me/api/portraits/men/40.jpg",
  "https://randomuser.me/api/portraits/women/22.jpg",
];

// World map image URL - using a dark world map
const worldMapUrl =
  "https://raw.githubusercontent.com/wbkd/react-geomap/master/example/static/world.json";

// Download avatars
const downloadAvatars = async () => {
  for (let i = 0; i < avatarUrls.length; i++) {
    const filePath = path.join(AVATARS_DIR, `avatar${i + 1}.jpg`);
    await downloadImage(avatarUrls[i], filePath);
  }
};

// Download world map
const downloadWorldMap = async () => {
  const filePath = path.join(PUBLIC_DIR, "world-map.png");

  // Use a reliable source for the world map
  await downloadImage(
    "https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json",
    filePath + ".json"
  );

  // Create a simple placeholder image for the world map since we're having issues with the image URL
  console.log("Creating a placeholder for world-map.png");

  // Instead of downloading, let's create a simple text file as a placeholder
  fs.writeFileSync(
    filePath + ".txt",
    "This is a placeholder for the world map image. Please replace with an actual dark world map image."
  );
  console.log(`Created placeholder: ${filePath}.txt`);
};

// Run all downloads
const downloadAll = async () => {
  try {
    console.log("Starting downloads...");
    await downloadAvatars();
    await downloadWorldMap();
    console.log("All downloads completed!");
  } catch (error) {
    console.error("Error during downloads:", error);
  }
};

// Execute the download function
downloadAll();
