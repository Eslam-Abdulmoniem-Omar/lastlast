import React from "react";

const LoadingDots = () => {
  return (
    <div className="flex space-x-2 justify-center items-center">
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-150"></div>
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-300"></div>
    </div>
  );
};

export default LoadingDots;
