"use client";

import { useState } from "react";
import { addDocument } from "../lib/firebase/firebaseUtils";
import SpeechRecorder from "./SpeechRecorder";

export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");

  const handleTranscriptChange = (newTranscript: string) => {
    setTranscript(newTranscript);
  };

  const handleRecordingStateChange = async (recording: boolean) => {
    setIsRecording(recording);

    // When recording stops, save the note to Firebase if we have a transcript
    if (!recording && transcript && transcript.trim() !== "") {
      try {
        await addDocument("notes", {
          text: transcript,
          timestamp: new Date().toISOString(),
        });
        console.log("Successfully saved transcript to Firebase");
      } catch (error) {
        console.error("Error saving transcript to Firebase:", error);
      }
    }
  };

  return (
    <div className="w-full max-w-md">
      <SpeechRecorder
        onTranscriptChange={handleTranscriptChange}
        onRecordingStateChange={handleRecordingStateChange}
        buttonStyle="pill"
        showTranscript={true}
        showModelInfo={true}
        showDetailedConfig={true}
        maxRecordingTime={30000} // 30 seconds max recording time
      />
    </div>
  );
}
