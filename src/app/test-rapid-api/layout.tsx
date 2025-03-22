"use client";

import React, { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TestRapidAPILayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isMainPage = pathname === "/test-rapid-api";
  const isDirectTestPage = pathname === "/test-rapid-api/direct-test";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-xl font-bold text-gray-800">
            RapidAPI Transcript Testing
          </h1>
          <p className="text-sm text-gray-600">
            Test tools for the YouTube transcript RapidAPI integration
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-4">
        <div className="mb-6 flex border-b">
          <Link
            href="/test-rapid-api"
            className={`px-4 py-2 text-sm font-medium ${
              isMainPage
                ? "text-blue-600 border-b-2 border-blue-500"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Full Flow Test
          </Link>
          <Link
            href="/test-rapid-api/direct-test"
            className={`px-4 py-2 text-sm font-medium ${
              isDirectTestPage
                ? "text-blue-600 border-b-2 border-blue-500"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Direct API Test
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
} 