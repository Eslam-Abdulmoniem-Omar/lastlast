/**
 * Script to install Python dependencies for Vercel deployment
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Ensure we're in the right directory
const rootDir = path.resolve(__dirname, "../..");

// Check for requirements.txt file
const requirementsFile = path.join(rootDir, "requirements.txt");

if (!fs.existsSync(requirementsFile)) {
  console.error("requirements.txt file not found!");
  process.exit(1);
}

try {
  console.log("Installing Python dependencies...");

  // Install Python dependencies
  execSync(`pip install -r ${requirementsFile}`, {
    stdio: "inherit",
    cwd: rootDir,
  });

  console.log("Python dependencies installed successfully!");
} catch (error) {
  console.error("Failed to install Python dependencies:", error.message);
  process.exit(1);
}
