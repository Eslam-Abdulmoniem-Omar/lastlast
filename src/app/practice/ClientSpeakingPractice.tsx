"use client";

import React from "react";
import GuidedSpeakingPractice from "../../components/GuidedSpeakingPractice";

export default function ClientSpeakingPractice() {
  // Example script - you can make this dynamic based on your needs
  const script = "I've loved you";

  // Create a dialogueLines array as expected by the component
  const dialogueLines = [
    {
      id: "line1", // Required property for DialogueLine type
      text: script,
      speaker: "You",
      startTime: 0,
      endTime: 0,
    },
  ];

  return (
    <GuidedSpeakingPractice
      dialogueLines={dialogueLines}
      simpleFeedback={true}
    />
  );
}
