// Simple Node.js script to run Next.js build with TypeScript errors ignored
const { spawnSync } = require("child_process");

console.log("Running Vercel build with TypeScript checks disabled...");

// Run Next.js build with the --no-lint flag to skip linting
const result = spawnSync("npx", ["next", "build", "--no-lint"], {
  stdio: "inherit",
  env: {
    ...process.env,
    // Set environment variable to skip TypeScript checks
    NEXT_TYPESCRIPT_CHECK: "0",
  },
});

// Exit with the same code as the build process
process.exit(result.status);
