import { NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";

// Set dynamic so the route is not statically optimized by Next.js
export const dynamic = "force-dynamic";

// Run a detailed network test
async function runNetworkTest() {
  const tests = [
    {
      name: "DNS resolution",
      url: "https://api.deepgram.com",
      method: "HEAD",
    },
    {
      name: "API connectivity",
      url: "https://api.deepgram.com/v1/listen",
      method: "OPTIONS",
    },
    {
      name: "Alternative endpoint",
      url: "https://api.deepgram.com/v1/projects",
      method: "OPTIONS",
    },
    {
      name: "General internet connectivity",
      url: "https://www.google.com",
      method: "HEAD",
    },
  ];

  const results = [];

  for (const test of tests) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const startTime = Date.now();
      const response = await fetch(test.url, {
        method: test.method,
        signal: controller.signal,
      });
      const endTime = Date.now();

      clearTimeout(timeoutId);

      results.push({
        test: test.name,
        url: test.url,
        success: response.ok,
        statusCode: response.status,
        responseTime: endTime - startTime,
        headers: (() => {
          // Convert headers to an object without using spread operator
          const headerObj: Record<string, string> = {};
          const headerIterator = response.headers.entries();
          let count = 0;
          let result = headerIterator.next();

          while (!result.done && count < 5) {
            const [key, value] = result.value;
            headerObj[key] = value;
            result = headerIterator.next();
            count++;
          }

          return headerObj;
        })(),
      });
    } catch (error) {
      results.push({
        test: test.name,
        url: test.url,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

// Test API key validity specifically
async function testApiKey(apiKey: string) {
  if (!apiKey) {
    return {
      valid: false,
      error: "No API key provided",
    };
  }

  try {
    // Create the client
    const deepgramClient = createClient(apiKey);

    try {
      // First try a lightweight operation
      const projects = await deepgramClient.manage.getProjects();
      return {
        valid: true,
        projectCount: projects.projects?.length || 0,
      };
    } catch (managementError) {
      // If that fails, try a simple echo request
      try {
        // Create a simple audio buffer with no real content
        const audioBuffer = Buffer.from([0, 0, 0, 0]);

        // Try with a tiny request that will fail but should validate the key
        await deepgramClient.listen.prerecorded.transcribeFile(audioBuffer, {
          mimetype: "audio/wav",
        });

        return {
          valid: true,
          note: "Key appears valid but couldn't access projects",
        };
      } catch (transcriptionError) {
        // Check if the error is authentication related or just bad request
        const errorMessage =
          transcriptionError instanceof Error
            ? transcriptionError.message
            : "Unknown error";
        const isAuthError =
          errorMessage.includes("auth") ||
          errorMessage.includes("key") ||
          errorMessage.includes("unauthorized") ||
          errorMessage.includes("403") ||
          errorMessage.includes("401");

        return {
          valid: !isAuthError,
          error: errorMessage,
          isAuthError,
        };
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  try {
    console.log("Running Deepgram diagnostic tests...");

    // Get the Deepgram API key
    const apiKey = process.env.DEEPGRAM_API_KEY;

    // Run all tests in parallel
    const [networkResults, apiKeyTest] = await Promise.all([
      runNetworkTest(),
      testApiKey(apiKey),
    ]);

    // Generate troubleshooting suggestions
    const allNetworkTestsPassing = networkResults.every((r) => r.success);
    const canAccessGoogle = networkResults.find((r) =>
      r.url.includes("google.com")
    )?.success;
    const canReachDeepgram = networkResults.find(
      (r) => r.url === "https://api.deepgram.com"
    )?.success;

    let troubleshootingSuggestions = [];

    if (!apiKey) {
      troubleshootingSuggestions.push(
        "No Deepgram API key found. Add DEEPGRAM_API_KEY to your .env.local file."
      );
    } else if (!apiKeyTest.valid) {
      troubleshootingSuggestions.push(
        `Your Deepgram API key appears to be invalid: ${apiKeyTest.error}`
      );
      troubleshootingSuggestions.push(
        "Check that you've copied the correct API key from the Deepgram dashboard."
      );
    }

    if (!canAccessGoogle && !canReachDeepgram) {
      troubleshootingSuggestions.push(
        "Your application cannot access the internet. Check your network connection and firewall settings."
      );
    } else if (canAccessGoogle && !canReachDeepgram) {
      troubleshootingSuggestions.push(
        "Your application can access the internet but not Deepgram specifically. This may be due to a firewall blocking api.deepgram.com."
      );
    }

    if (apiKeyTest.valid && !allNetworkTestsPassing) {
      troubleshootingSuggestions.push(
        "Your API key appears valid but there are network connectivity issues. Try running on a different network."
      );
    }

    // If no specific issues found but tests still failing
    if (
      troubleshootingSuggestions.length === 0 &&
      (!allNetworkTestsPassing || !apiKeyTest.valid)
    ) {
      troubleshootingSuggestions.push(
        "Try testing with the Deepgram API directly using a tool like Postman or curl."
      );
      troubleshootingSuggestions.push(
        "Check if your network requires a proxy to access external services."
      );
    }

    // Suggest using fallback if everything is failing
    if (troubleshootingSuggestions.length > 0) {
      troubleshootingSuggestions.push(
        "For now, the application will use fallback mock transcription, which is working correctly."
      );
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      apiKey: {
        exists: !!apiKey,
        length: apiKey?.length || 0,
        firstFourChars: apiKey ? apiKey.substring(0, 4) : null,
        testResult: apiKeyTest,
      },
      networkTests: networkResults,
      troubleshootingSuggestions,
      summary: {
        canAccessInternet: canAccessGoogle,
        canReachDeepgram: canReachDeepgram,
        apiKeyValid: apiKeyTest.valid,
        allNetworkTestsPassing,
        fallbackMode: !canReachDeepgram || !apiKeyTest.valid,
      },
    });
  } catch (error) {
    console.error("Error in Deepgram diagnostics:", error);

    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
