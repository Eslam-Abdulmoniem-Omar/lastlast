const fs = require("fs");

// Read the file
const filePath = "src/components/GuidedSpeakingPractice.tsx";
let content = fs.readFileSync(filePath, "utf8");

// Fix the onClick handler
content = content.replace(
  /if \(!isRecording\) \{\s+startRecording\(\);(?!\s+\})/g,
  "if (!isRecording) {\n                      startRecording();\n                    }"
);

// Write the fixed content back to the file
fs.writeFileSync(filePath, content, "utf8");

console.log("File fixed successfully!");
