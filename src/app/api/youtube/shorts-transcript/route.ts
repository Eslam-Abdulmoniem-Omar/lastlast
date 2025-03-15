export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { extractVideoId } from "@/lib/utils/youtubeUtils";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
// Import the wrapper function
import { executePythonScript } from "@/scripts/youtube_wrapper";

// ... existing code ...
