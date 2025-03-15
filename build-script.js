const fs = require("fs");
const { execSync } = require("child_process");

// Backup the original next.config.mjs if it exists
console.log("Backing up original Next.js configuration...");
if (fs.existsSync("next.config.mjs")) {
  fs.copyFileSync("next.config.mjs", "next.config.original.mjs");
}

// Replace with our Vercel-specific config that ignores TypeScript errors
console.log("Applying Vercel-specific Next.js configuration...");
if (fs.existsSync("next.config.vercel.mjs")) {
  fs.copyFileSync("next.config.vercel.mjs", "next.config.mjs");
} else {
  console.error("next.config.vercel.mjs not found!");
  process.exit(1);
}

// Run the Next.js build
console.log("Starting Next.js build with TypeScript errors ignored...");
try {
  execSync("next build", { stdio: "inherit" });
  console.log("Build completed successfully!");
} catch (error) {
  console.error("Build failed:", error);
  process.exit(1);
} finally {
  // Restore the original next.config.mjs if it exists
  console.log("Restoring original Next.js configuration...");
  if (fs.existsSync("next.config.original.mjs")) {
    fs.copyFileSync("next.config.original.mjs", "next.config.mjs");
    fs.unlinkSync("next.config.original.mjs");
  }
}
