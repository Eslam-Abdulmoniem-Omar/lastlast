"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface DialogueLine {
  id: string;
  text: string;
  startTime: number; // in seconds
  endTime?: number; // in seconds (optional)
}

interface TimestampedDialogueProps {
  dialogueLines: DialogueLine[];
  currentTime: number; // current playback time in seconds
  onLineClick: (startTime: number) => void;
  activeLineId?: string;
}

export default function TimestampedDialogue({
  dialogueLines,
  currentTime,
  onLineClick,
  activeLineId,
}: TimestampedDialogueProps) {
  // Find the currently active line based on the current time
  const activeLine =
    activeLineId ||
    dialogueLines.find(
      (line) =>
        currentTime >= line.startTime &&
        (!line.endTime || currentTime < line.endTime)
    )?.id;

  // Format seconds to HH:MM:SS.MS format
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  };

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto p-2">
      {dialogueLines.map((line) => (
        <div
          key={line.id}
          className={`p-3 rounded-lg cursor-pointer transition-colors ${
            line.id === activeLine
              ? "bg-blue-100 border-l-4 border-blue-500"
              : "bg-gray-50 hover:bg-gray-100"
          }`}
          onClick={() => onLineClick(line.startTime)}
        >
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-500">
              {formatTime(line.startTime)}
            </span>
            {line.endTime && (
              <span className="text-xs text-gray-400">
                {formatTime(line.endTime)}
              </span>
            )}
          </div>
          <p className="text-gray-800">{line.text}</p>

          {line.id === activeLine && (
            <motion.div
              className="h-0.5 bg-blue-500 mt-2"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{
                duration: line.endTime ? line.endTime - line.startTime : 3,
                ease: "linear",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
