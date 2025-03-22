"use client";

import { useState } from "react";

export default function DirectRapidAPITest() {
  const [videoId, setVideoId] = useState("ZacjOVVgoLY");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const testDirectAPI = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setLogs([]);

    try {
      addLog(`Testing direct RapidAPI call for video ID: ${videoId}`);

      // Create a URL to our RapidAPI endpoint
      const apiUrl = `/api/youtube/rapidapi-transcript?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      )}&t=${Date.now()}`;

      addLog(`Sending request to: ${apiUrl}`);

      // Make the request to our endpoint
      const response = await fetch(apiUrl);
      const responseStatus = response.status;
      const responseStatusText = response.statusText;

      addLog(`Response status: ${responseStatus} ${responseStatusText}`);

      // Parse the response
      const data = await response.json();
      addLog("Response parsed successfully");

      if (data.error) {
        addLog(`API returned error: ${data.error}`);
        setError(data.error);
      } else if (data.data && data.data.segments) {
        addLog(`API returned ${data.data.segments.length} segments`);
        setResult(data.data);
      } else {
        addLog("API returned unexpected response format");
        setError("Unexpected response format");
      }
    } catch (err: any) {
      console.error("Error testing RapidAPI:", err);
      addLog(`Error: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
      addLog("Test completed");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Direct RapidAPI Endpoint Test</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          YouTube Video ID
        </label>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md p-2"
            placeholder="Enter YouTube Video ID (e.g., dQw4w9WgXcQ)"
          />
          <button
            onClick={testDirectAPI}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
          >
            {loading ? "Testing..." : "Test RapidAPI Endpoint"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          This will call our RapidAPI endpoint directly with the provided video
          ID
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <div className="bg-gray-50 p-3 border-b font-medium">Logs</div>
          <div className="p-3 bg-black text-green-400 font-mono text-sm h-96 overflow-y-auto">
            {logs.length > 0 ? (
              logs.map((log, i) => (
                <div key={i} className="mb-1">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-gray-500">
                No logs yet. Start a test to see logs.
              </div>
            )}
          </div>
        </div>

        <div className="border border-gray-200 rounded-md overflow-hidden">
          <div className="bg-gray-50 p-3 border-b font-medium">Result</div>
          <div className="p-3 h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-300 text-red-700 p-3 rounded-md">
                <h3 className="font-bold">Error</h3>
                <p>{error}</p>
              </div>
            ) : result ? (
              <div>
                <div className="mb-3">
                  <p>
                    <strong>Source:</strong> {result.transcriptSource}
                  </p>
                  <p>
                    <strong>Title:</strong> {result.title}
                  </p>
                  <p>
                    <strong>Segments:</strong> {result.segments.length}
                  </p>
                </div>

                <h3 className="font-medium mb-2">First 3 Segments:</h3>
                <div className="border border-gray-200 rounded-md mb-4">
                  {result.segments
                    .slice(0, 3)
                    .map((segment: any, index: number) => (
                      <div
                        key={segment.id}
                        className={`p-2 text-sm ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } border-b border-gray-200`}
                      >
                        <div className="text-xs text-gray-500">
                          {segment.speakerName} ({segment.startTime.toFixed(2)}s
                          - {segment.endTime.toFixed(2)}s)
                        </div>
                        <div>{segment.text}</div>
                      </div>
                    ))}
                </div>

                <h3 className="font-medium mb-2">Raw Response:</h3>
                <pre className="bg-gray-800 text-gray-200 p-2 rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-gray-500 flex items-center justify-center h-full">
                No results yet. Click "Test RapidAPI Endpoint" to start.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
