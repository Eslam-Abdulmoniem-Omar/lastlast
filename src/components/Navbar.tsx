"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Only run this effect on the client side after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => {
    // Only apply active styles after component has mounted on client
    if (!mounted) return "";
    return pathname === path ? "bg-blue-700" : "hover:bg-blue-600";
  };

  return (
    <nav className="bg-blue-500 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="font-bold text-xl">
              English Mastery
            </Link>
          </div>

          <div className="flex space-x-4">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md text-sm font-medium ${isActive(
                "/"
              )}`}
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className={`px-3 py-2 rounded-md text-sm font-medium ${isActive(
                "/dashboard"
              )}`}
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
