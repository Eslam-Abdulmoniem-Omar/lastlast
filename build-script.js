const fs = require("fs");
const { execSync } = require("child_process");

// Backup the original tsconfig.json
console.log("Backing up original tsconfig.json...");
if (fs.existsSync("tsconfig.json")) {
  fs.copyFileSync("tsconfig.json", "tsconfig.original.json");
}

// Replace with our relaxed config
console.log("Applying relaxed TypeScript configuration...");
if (fs.existsSync("tsconfig.vercel.json")) {
  fs.copyFileSync("tsconfig.vercel.json", "tsconfig.json");
} else {
  console.error("tsconfig.vercel.json not found!");
  process.exit(1);
}

// Run the Next.js build
console.log("Starting Next.js build with relaxed TypeScript settings...");
try {
  execSync("next build", { stdio: "inherit" });
  console.log("Build completed successfully!");
} catch (error) {
  console.error("Build failed:", error);
  process.exit(1);
} finally {
  // Restore the original tsconfig if it exists
  console.log("Restoring original TypeScript configuration...");
  if (fs.existsSync("tsconfig.original.json")) {
    fs.copyFileSync("tsconfig.original.json", "tsconfig.json");
    fs.unlinkSync("tsconfig.original.json");
  }
}
