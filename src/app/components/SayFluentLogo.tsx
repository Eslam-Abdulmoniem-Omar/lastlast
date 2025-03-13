"use client";

import React, { useEffect, useState } from "react";

interface SayFluentLogoProps {
  animated?: boolean;
}

export const SayFluentLogo: React.FC<SayFluentLogoProps> = ({
  animated = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [animationActive, setAnimationActive] = useState(false);

  useEffect(() => {
    if (animated) {
      // Start with a brief animation
      setAnimationActive(true);
      const timer = setTimeout(() => {
        setAnimationActive(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [animated]);

  return (
    <div
      className="relative w-full h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo shape */}
      <div
        className={`absolute inset-0 rounded-full 
        ${
          isHovered || animationActive
            ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg"
            : "bg-gradient-to-br from-indigo-600 to-purple-700"
        } 
        transition-all duration-300`}
      />

      {/* Letter "S" */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`
          text-white font-bold text-2xl
          ${isHovered || animationActive ? "scale-110" : "scale-100"}
          transition-transform duration-300
        `}
        >
          S
        </span>
      </div>

      {/* Animated wave effect when hovered or during intro animation */}
      {(isHovered || animationActive) && (
        <div className="absolute -inset-1 rounded-full bg-indigo-400 opacity-30 blur-sm animate-pulse" />
      )}
    </div>
  );
};
