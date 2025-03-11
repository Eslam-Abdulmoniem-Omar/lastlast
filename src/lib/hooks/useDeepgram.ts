"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Socket states enum
export enum SOCKET_STATES {
  closed = 0,
  open = 1,
  closing = 2,
}

export function useDeepgram() {
  const [connection, setConnection] = useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<SOCKET_STATES>(
    SOCKET_STATES.closed
  );
  const [realtimeTranscript, setRealtimeTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const audioRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  // Deepgram configuration
  const config = {
    model: "nova-2",
    language: "en-US",
    punctuate: true,
    smartFormat: true,
    diarize: true,
  };

  // Clean up resources
  const cleanupResources = useCallback(() => {
    // Stop and clean up MediaRecorder if it exists
    if (audioRef.current && audioRef.current.state !== "inactive") {
      try {
        console.log("Stopping MediaRecorder...");
        audioRef.current.stop();
      } catch (e) {
        console.error("Error stopping MediaRecorder:", e);
      }
      audioRef.current = null;
    }

    // Stop all tracks in the media stream if it exists
    if (streamRef.current) {
      console.log("Stopping media tracks...");
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.error("Error stopping media track:", e);
        }
      });
      streamRef.current = null;
    }

    // Close WebSocket connection if it exists
    if (connection && connection.readyState !== WebSocket.CLOSED) {
      try {
        console.log("Closing WebSocket connection...");
        connection.close();
      } catch (e) {
        console.error("Error closing WebSocket connection:", e);
      }
      setConnection(null);
    }
  }, [connection]);

  // Get API key safely
  const safeGetApiKey = async () => {
    try {
      const response = await fetch("/api/deepgram", {
        cache: "no-store",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch API key: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.key) {
        throw new Error("API key is empty or not configured");
      }

      return result.key;
    } catch (error) {
      console.error("Error fetching Deepgram API key:", error);
      throw error;
    }
  };

  // Connect to Deepgram
  const connectToDeepgram = async () => {
    try {
      // Clean up any existing connections first
      cleanupResources();

      setError(null);
      setRealtimeTranscript("");
      reconnectAttemptsRef.current = 0;

      console.log("Requesting microphone access...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        streamRef.current = stream;

        // Create MediaRecorder with better audio quality
        try {
          // Check if the browser supports the specified MIME type
          const mimeType = "audio/webm;codecs=opus";
          if (MediaRecorder.isTypeSupported(mimeType)) {
            audioRef.current = new MediaRecorder(stream, { mimeType });
          } else {
            console.warn("Opus codec not supported, falling back to default");
            audioRef.current = new MediaRecorder(stream);
          }
        } catch (e) {
          console.error(
            "Error creating MediaRecorder with opus codec, falling back to default:",
            e
          );
          audioRef.current = new MediaRecorder(stream);
        }
      } catch (e) {
        console.error("Error accessing microphone:", e);
        setError(
          "Could not access microphone. Please check your browser permissions."
        );
        setIsRecording(false);
        return;
      }

      let apiKey;
      try {
        apiKey = await safeGetApiKey();
      } catch (e) {
        console.error("Error getting API key:", e);
        setError("Could not connect to Deepgram. Please try again later.");
        setIsRecording(false);
        return;
      }

      console.log("Opening WebSocket connection...");
      let socket;
      try {
        // Create a properly formatted URL with all parameters properly encoded
        const url = new URL("wss://api.deepgram.com/v1/listen");
        url.searchParams.append("model", config.model);
        url.searchParams.append("language", config.language);
        url.searchParams.append("punctuate", config.punctuate.toString());
        url.searchParams.append("smart_format", config.smartFormat.toString());
        url.searchParams.append("diarize", config.diarize.toString());

        socket = new WebSocket(url.toString(), ["token", apiKey]);
      } catch (e) {
        console.error("Error creating WebSocket:", e);
        setError("Could not connect to Deepgram. Please try again later.");
        setIsRecording(false);
        return;
      }

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          console.error("WebSocket connection timeout");
          setError("Connection timeout. Please try again.");
          cleanupResources();
        }
      }, 10000);

      socket.onopen = () => {
        clearTimeout(connectionTimeout);
        setConnectionState(SOCKET_STATES.open);
        setIsRecording(true);
        console.log("WebSocket connection opened successfully");

        // Set up the MediaRecorder data handler
        audioRef.current!.addEventListener("dataavailable", (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        });

        // Start recording
        audioRef.current!.start(250); // Send data every 250ms for low latency
      };

      socket.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code, event.reason);
        setConnectionState(SOCKET_STATES.closed);

        // Clean up MediaRecorder
        if (audioRef.current && audioRef.current.state !== "inactive") {
          try {
            audioRef.current.stop();
          } catch (e) {
            console.error("Error stopping MediaRecorder:", e);
          }
        }

        setIsRecording(false);
      };

      socket.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("Connection error. Please try again.");
        setIsRecording(false);
      };

      socket.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data);

          // Check if this is a transcript message
          if (data.type === "Results" || data.channel?.alternatives) {
            const transcript = data.channel?.alternatives[0]?.transcript || "";

            if (transcript && transcript.trim() !== "") {
              setRealtimeTranscript(transcript);
            }
          }
        } catch (e) {
          console.error("Error parsing WebSocket message:", e);
        }
      };

      setConnection(socket);
    } catch (error) {
      console.error("Error connecting to Deepgram:", error);
      setError("Failed to connect. Please try again.");
      setIsRecording(false);
      cleanupResources();
    }
  };

  // Disconnect from Deepgram
  const disconnectFromDeepgram = () => {
    console.log("Disconnecting from Deepgram...");
    cleanupResources();
    setIsRecording(false);
    setConnectionState(SOCKET_STATES.closed);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  return {
    connectToDeepgram,
    disconnectFromDeepgram,
    connectionState,
    realtimeTranscript,
    error,
    isRecording,
    config,
  };
}
