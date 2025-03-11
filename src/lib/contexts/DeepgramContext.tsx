"use client";

import {
  createClient,
  LiveClient,
  SOCKET_STATES,
  LiveTranscriptionEvents,
  type LiveSchema,
  type LiveTranscriptionEvent,
} from "@deepgram/sdk";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  FunctionComponent,
  useRef,
  useCallback,
} from "react";

interface DeepgramContextType {
  connectToDeepgram: () => Promise<void>;
  disconnectFromDeepgram: () => void;
  connectionState: SOCKET_STATES;
  realtimeTranscript: string;
  error: string | null;
  isRecording: boolean;
  config: {
    model: string;
    language: string;
    punctuate: boolean;
    smartFormat: boolean;
    diarize: boolean;
  };
}

const DeepgramContext = createContext<DeepgramContextType | undefined>(
  undefined
);

interface DeepgramContextProviderProps {
  children: ReactNode;
}

const getApiKey = async (): Promise<string> => {
  try {
    const response = await fetch("/api/deepgram", {
      cache: "no-store",
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch API configuration: ${response.status}`);
      throw new Error(`Failed to fetch API configuration`);
    }

    let result;
    try {
      result = await response.json();
    } catch (e) {
      console.error("Error parsing API response");
      throw new Error("Invalid response format from API endpoint");
    }

    if (!result.key) {
      console.error("API is not properly configured");
      throw new Error("API is not properly configured");
    }

    return result.key;
  } catch (error) {
    console.error("Error retrieving API configuration");
    throw error;
  }
};

const DeepgramContextProvider: FunctionComponent<
  DeepgramContextProviderProps
> = ({ children }) => {
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

        // Start recording with a larger time slice for better audio quality
        try {
          audioRef.current!.start(500);
        } catch (e) {
          console.error("Error starting MediaRecorder:", e);
          setError("Error starting recording. Please try again.");
          cleanupResources();
          setIsRecording(false);
        }
      };

      socket.onmessage = (event) => {
        try {
          // Make sure event.data is a valid JSON string
          if (typeof event.data !== "string") {
            console.error(
              "Received non-string data from WebSocket:",
              event.data
            );
            return;
          }

          // Safely parse JSON with error handling
          let data;
          try {
            data = JSON.parse(event.data);
          } catch (jsonError) {
            console.error(
              "Error parsing WebSocket message as JSON:",
              jsonError,
              event.data
            );
            return;
          }

          // Validate the data structure
          if (!data || typeof data !== "object") {
            console.error("Invalid data structure received:", data);
            return;
          }

          if (
            data.channel &&
            data.channel.alternatives &&
            Array.isArray(data.channel.alternatives) &&
            data.channel.alternatives[0] &&
            typeof data.channel.alternatives[0].transcript === "string"
          ) {
            const newTranscript = data.channel.alternatives[0].transcript;
            if (newTranscript.trim()) {
              setRealtimeTranscript((prev) => {
                // If starting a new transcript
                if (prev.length === 0) {
                  return newTranscript;
                }

                // If the previous transcript ends with a sentence-ending punctuation,
                // start a new sentence. Otherwise, append with a space.
                const shouldStartNewSentence = /[.!?]$/.test(prev.trim());

                if (shouldStartNewSentence) {
                  return `${prev} ${newTranscript}`;
                } else {
                  // Check if this is an update to the last partial transcript
                  // This helps prevent duplication in the transcript
                  const words = prev.split(" ");
                  const lastWord = words[words.length - 1];

                  if (
                    newTranscript.startsWith(lastWord) &&
                    lastWord.length > 3
                  ) {
                    words.pop(); // Remove the last word as it's included in the new transcript
                    return `${words.join(" ")} ${newTranscript}`;
                  }

                  return `${prev} ${newTranscript}`;
                }
              });
            }
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
          // Don't set an error state here, just log it to avoid disrupting the user experience
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("Error connecting to Deepgram. Please try again.");
        cleanupResources();
        setIsRecording(false);
      };

      socket.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code, event.reason);
        setConnectionState(SOCKET_STATES.closed);

        // If this wasn't a normal closure and we haven't exceeded reconnect attempts
        if (
          event.code !== 1000 &&
          event.code !== 1001 &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current++;
          console.log(
            `Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`
          );

          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (isRecording) {
              connectToDeepgram();
            }
          }, 1000 * reconnectAttemptsRef.current); // Exponential backoff
        } else {
          setIsRecording(false);
          cleanupResources();
        }
      };

      setConnection(socket);
    } catch (error) {
      console.error("Error starting voice recognition:", error);
      setError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
      setConnectionState(SOCKET_STATES.closed);
      setIsRecording(false);
      cleanupResources();
    }
  };

  const disconnectFromDeepgram = () => {
    console.log("Disconnecting from Deepgram...");
    // Set recording state to false first to ensure UI updates immediately
    setIsRecording(false);
    // Clear transcript to prevent stale data
    setRealtimeTranscript("");
    // Clean up resources
    cleanupResources();
    // Update connection state
    setConnectionState(SOCKET_STATES.closed);
  };

  // Safe wrapper for getApiKey to handle errors
  const safeGetApiKey = async () => {
    try {
      return await getApiKey();
    } catch (error) {
      console.error("Error in getApiKey:", error);
      throw new Error("Failed to get API key");
    }
  };

  return (
    <DeepgramContext.Provider
      value={{
        connectToDeepgram,
        disconnectFromDeepgram,
        connectionState,
        realtimeTranscript,
        error,
        isRecording,
        config,
      }}
    >
      {children}
    </DeepgramContext.Provider>
  );
};

// Use the useDeepgram hook to access the deepgram context and use the deepgram in any component.
// This allows you to connect to the deepgram and disconnect from the deepgram via a socket.
// Make sure to wrap your application in a DeepgramContextProvider to use the deepgram.
function useDeepgram(): DeepgramContextType {
  const context = useContext(DeepgramContext);
  if (context === undefined) {
    throw new Error(
      "useDeepgram must be used within a DeepgramContextProvider"
    );
  }
  return context;
}

export {
  DeepgramContextProvider,
  useDeepgram,
  SOCKET_STATES,
  LiveTranscriptionEvents,
  type LiveTranscriptionEvent,
};
