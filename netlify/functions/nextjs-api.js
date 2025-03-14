// netlify/functions/nextjs-api.js
exports.handler = async (event, context) => {
  // Get the path from the event
  const path = event.path.replace(/^\/\.netlify\/functions\/nextjs-api/, "");

  // Map the path to the appropriate API route
  let apiUrl;

  if (path.startsWith("/api/youtube/metadata")) {
    // Handle YouTube metadata API
    apiUrl = `${process.env.URL}/api/youtube/metadata${
      event.queryStringParameters
        ? "?" + new URLSearchParams(event.queryStringParameters).toString()
        : ""
    }`;
  } else if (path.startsWith("/api/openai/translate")) {
    // Handle OpenAI translate API
    apiUrl = `${process.env.URL}/api/openai/translate`;
  } else {
    // Default fallback
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "API route not found" }),
    };
  }

  try {
    // Determine if this is a GET or POST request
    let response;
    if (event.httpMethod === "GET") {
      response = await fetch(apiUrl);
    } else if (event.httpMethod === "POST") {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: event.body,
      });
    }

    const data = await response.json();

    return {
      statusCode: response.status,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
