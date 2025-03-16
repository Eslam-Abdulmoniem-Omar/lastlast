"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, StopCircle, Save, AlertCircle, CheckCircle } from "lucide-react";

export default function DirectTestPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<string>("");
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [endpoint, setEndpoint] = useState<"google" | "test">("test");
  const [credentialsStatus, setCredentialsStatus] = useState<{
    loading: boolean;
    status: "success" | "error" | "unchecked";
    message: string;
    details?: any;
  }>({
    loading: true,
    status: "unchecked",
    message: "Checking credentials...",
  });
  const [fileCheckResults, setFileCheckResults] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Check credentials on page load
  useEffect(() => {
    checkCredentials();
  }, []);

  const checkCredentials = async () => {
    try {
      setCredentialsStatus({
        loading: true,
        status: "unchecked",
        message: "Checking credentials...",
      });

      const response = await fetch("/api/google-speech/credentials");
      const data = await response.json();

      if (response.ok && data.status === "success") {
        setCredentialsStatus({
          loading: false,
          status: "success",
          message: data.message,
          details: data,
        });
      } else {
        setCredentialsStatus({
          loading: false,
          status: "error",
          message: data.message || "Failed to verify credentials",
          details: data,
        });
      }
    } catch (error) {
      setCredentialsStatus({
        loading: false,
        status: "error",
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  // Check debug endpoint
  const checkDebugEndpoint = async () => {
    try {
      setStatus("Checking Google Speech API configuration...");

      const response = await fetch("/api/google-speech/debug");
      const data = await response.json();

      setApiResponse(data);

      if (data.success) {
        setStatus("Google Speech API is properly configured.");
      } else {
        setStatus(
          `Google Speech API configuration issue: ${
            data.speechClient?.error?.message || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error checking debug endpoint:", error);
      setStatus(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const checkFileSystem = async () => {
    try {
      setStatus("Checking file system for credentials file...");

      const response = await fetch("/api/file-check");
      const data = await response.json();

      setFileCheckResults(data);
      setApiResponse(data);

      if (data.fileExists) {
        setStatus("Credentials file found at expected location!");
      } else {
        setStatus(
          `Credentials file NOT found at expected path: ${data.expectedPath}`
        );
      }
    } catch (error) {
      console.error("Error checking file system:", error);
      setStatus(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      setAudioURL(null);
      setBlob(null);
      setApiResponse(null);
      setStatus("Requesting microphone access...");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        setBlob(audioBlob);
        setStatus("Recording complete. Ready to submit.");

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      });

      recorder.start();
      setIsRecording(true);
      setStatus("Recording...");
    } catch (error) {
      console.error("Error starting recording:", error);
      setStatus(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus("Processing recording...");
    }
  };

  const submitRecording = async () => {
    if (!blob) {
      setStatus("No recording available");
      return;
    }

    try {
      setStatus("Submitting recording...");
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      // Choose endpoint based on selection
      const url =
        endpoint === "google"
          ? "/api/google-speech/transcribe"
          : "/api/speech-test";

      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      setApiResponse(result);

      if (response.ok) {
        setStatus(
          `Success: ${
            result.transcript ? `"${result.transcript}"` : "No transcript"
          }`
        );
      } else {
        setStatus(`Error: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error submitting recording:", error);
      setStatus(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const downloadRecording = () => {
    if (audioURL && blob) {
      const a = document.createElement("a");
      a.href = audioURL;
      a.download = "recording.webm";
      a.click();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Direct Speech API Test</h1>

      {/* Credentials Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">API Credentials Status</h2>
        <div
          className={`flex items-center p-4 rounded-lg mb-4 ${
            credentialsStatus.status === "success"
              ? "bg-green-50 text-green-800"
              : credentialsStatus.status === "error"
              ? "bg-red-50 text-red-800"
              : "bg-blue-50 text-blue-800"
          }`}
        >
          {credentialsStatus.loading ? (
            <div className="animate-pulse flex items-center">
              <div className="w-5 h-5 rounded-full bg-blue-200 mr-3"></div>
              <span>Checking credentials...</span>
            </div>
          ) : credentialsStatus.status === "success" ? (
            <>
              <CheckCircle className="w-5 h-5 mr-3" />
              <span>{credentialsStatus.message}</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 mr-3" />
              <span>{credentialsStatus.message}</span>
            </>
          )}
        </div>

        {credentialsStatus.details && (
          <div className="mb-4">
            <button
              onClick={() => setApiResponse(credentialsStatus.details)}
              className="text-blue-600 text-sm hover:underline"
            >
              View credential details
            </button>
          </div>
        )}

        <div className="flex space-x-4">
          <button
            onClick={checkCredentials}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Refresh Credentials Check
          </button>

          <button
            onClick={checkDebugEndpoint}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
          >
            Run API Diagnostics
          </button>

          <button
            onClick={checkFileSystem}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Check Credential File Location
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="mb-6">
          <div className="font-medium mb-2">Select API Endpoint:</div>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="endpoint"
                checked={endpoint === "test"}
                onChange={() => setEndpoint("test")}
                className="mr-2"
              />
              Test API (Mock)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="endpoint"
                checked={endpoint === "google"}
                onChange={() => setEndpoint("google")}
                className="mr-2"
                disabled={credentialsStatus.status === "error"}
              />
              Google Cloud API
              {credentialsStatus.status === "error" && (
                <span className="ml-2 text-xs text-red-600">
                  (Unavailable - Credentials error)
                </span>
              )}
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={startRecording}
            disabled={isRecording}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isRecording
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            <Mic size={18} />
            Start Recording
          </button>

          <button
            onClick={stopRecording}
            disabled={!isRecording}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              !isRecording
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-red-500 text-white hover:bg-red-600"
            }`}
          >
            <StopCircle size={18} />
            Stop Recording
          </button>

          <button
            onClick={submitRecording}
            disabled={
              !blob ||
              isRecording ||
              (endpoint === "google" && credentialsStatus.status === "error")
            }
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              !blob ||
              isRecording ||
              (endpoint === "google" && credentialsStatus.status === "error")
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-green-500 text-white hover:bg-green-600"
            }`}
          >
            Submit Recording
          </button>

          {blob && (
            <button
              onClick={downloadRecording}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              <Save size={18} />
              Download Recording
            </button>
          )}
        </div>

        <div className="mb-6">
          <div className="font-medium mb-2">Status:</div>
          <div className="p-3 bg-gray-100 rounded-lg">{status || "Ready"}</div>
        </div>

        {audioURL && (
          <div className="mb-6">
            <div className="font-medium mb-2">Recording:</div>
            <audio controls src={audioURL} className="w-full" />
          </div>
        )}

        {apiResponse && (
          <div>
            <div className="font-medium mb-2">API Response:</div>
            <pre className="p-3 bg-gray-100 rounded-lg overflow-x-auto text-sm">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Instructions</h2>
        <ol className="list-decimal list-inside space-y-2 ml-4">
          <li>Select which API endpoint to use</li>
          <li>
            Click <strong>Start Recording</strong> and grant microphone
            permissions
          </li>
          <li>Speak clearly for a few seconds</li>
          <li>
            Click <strong>Stop Recording</strong> when finished
          </li>
          <li>
            Click <strong>Submit Recording</strong> to send to the API
          </li>
          <li>View the API response below</li>
          <li>
            Optionally <strong>Download Recording</strong> to save the audio
            file
          </li>
        </ol>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
          <div className="font-medium mb-1">Note:</div>
          <p>
            The test API always returns a mock response, while the Google Cloud
            API attempts to use the actual speech recognition service.
          </p>
        </div>
      </div>
    </div>
  );
}
