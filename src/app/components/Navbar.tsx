"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePathname } from "next/navigation";
import { FiMenu, FiX, FiUser, FiLogIn } from "react-icons/fi";

export default function Navbar() {
  const { user, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // Reset image error state when user changes
  useEffect(() => {
    if (user) {
      setProfileImageError(false);
    }
  }, [user]);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Conditional navigation links based on auth state
  const navLinks = user
    ? [{ name: "Dashboard", href: "/dashboard" }]
    : [
        { name: "Home", href: "/" },
        { name: "Dashboard", href: "/dashboard" },
      ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md py-2"
          : "bg-gradient-to-r from-indigo-600/90 to-purple-600/90 py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link
              href={user ? "/dashboard" : "/"}
              className="flex items-center"
            >
              <div className="relative h-10 w-32">
                <Image
                  src="/logo.png"
                  alt="SayFluent Logo"
                  fill
                  className="object-contain"
                  onError={(e) => {
                    // Fallback if logo image doesn't exist
                    e.currentTarget.src =
                      "https://via.placeholder.com/128x40?text=SayFluent";
                  }}
                />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`text-sm font-medium transition-colors duration-200 ${
                  pathname === link.href
                    ? "text-white font-bold"
                    : "text-white/90 hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            ))}

            {/* Auth Buttons */}
            {!loading && (
              <div className="flex items-center space-x-4 ml-4">
                {user ? (
                  <Link
                    href="/dashboard"
                    className="flex items-center text-sm font-medium text-white hover:text-white/90"
                  >
                    {user.photoURL && !profileImageError ? (
                      <div className="relative w-8 h-8 mr-2 ring-2 ring-white/30 rounded-full">
                        <Image
                          src={user.photoURL}
                          alt={user.displayName || "User"}
                          fill
                          className="rounded-full object-cover"
                          onError={() => setProfileImageError(true)}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          priority
                        />
                      </div>
                    ) : (
                      <FiUser className="mr-2 text-white" />
                    )}
                    {user.displayName?.split(" ")[0] || "Profile"}
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="flex items-center text-sm font-medium text-white hover:text-white/90"
                    >
                      <FiLogIn className="mr-1" />
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="inline-flex items-center px-4 py-2 border border-white/20 text-sm font-medium rounded-md shadow-sm text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white/90 focus:outline-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <FiX className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <FiMenu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out ${
          isMenuOpen
            ? "max-h-96 opacity-100"
            : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-indigo-800 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname === link.href
                  ? "text-white bg-indigo-700"
                  : "text-white/80 hover:text-white hover:bg-indigo-700/50"
              }`}
            >
              {link.name}
            </Link>
          ))}

          {/* Auth Links for Mobile */}
          {!loading && (
            <div className="pt-4 pb-3 border-t border-indigo-700/50">
              {user ? (
                <div className="flex items-center px-3">
                  {user.photoURL && !profileImageError ? (
                    <div className="relative w-10 h-10 mr-3 ring-2 ring-white/20 rounded-full">
                      <Image
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        fill
                        className="rounded-full object-cover"
                        onError={() => setProfileImageError(true)}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        priority
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center mr-3">
                      <FiUser className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div>
                    <div className="text-base font-medium text-white">
                      {user.displayName || "User"}
                    </div>
                    <div className="text-sm font-medium text-indigo-200">
                      {user.email}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 px-3">
                  <Link
                    href="/login"
                    className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-indigo-700/50"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="block w-full text-center px-3 py-2 rounded-md text-base font-medium text-white bg-white/10 hover:bg-white/20"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
