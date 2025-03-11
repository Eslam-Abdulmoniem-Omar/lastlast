"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronDown, Menu, X, User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

export default function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { user, signOut, loading } = useAuth();

  // Check if we're on the home page
  const isHomePage = pathname === "/" || pathname === "/#how-it-works";

  // Only run this effect on the client side after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => {
    // Only apply active styles after component has mounted on client
    if (!mounted) return "";
    return pathname === path
      ? "bg-secondary/20 text-white border-secondary"
      : "hover:bg-primary-dark/80 text-white hover:text-white border-transparent";
  };

  const handleSignOut = async () => {
    await signOut();
    setProfileDropdownOpen(false);
  };

  // Determine where the logo should link to based on auth status
  const logoLinkPath = user ? "/dashboard" : "/";

  return (
    <nav className="bg-[#102054] sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <Link
              href={logoLinkPath}
              className="font-bold text-2xl flex items-center"
            >
              <span className="bg-[#232323] rounded-md mr-2 shadow-sm flex items-center justify-center p-0.5 w-9 h-9">
                <img
                  src="/icon.png"
                  alt="SayFluent"
                  className="w-full h-full"
                />
              </span>
              <span className="hidden sm:inline-block text-white">
                SayFluent
              </span>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-3">
            {isHomePage && (
              <>
                <Link
                  href="/#how-it-works"
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 border-b-2 ${isActive(
                    "/#how-it-works"
                  )}`}
                >
                  How it Works
                </Link>
              </>
            )}

            {!loading && (
              <>
                {user ? (
                  <div className="relative ml-4">
                    <button
                      onClick={() =>
                        setProfileDropdownOpen(!profileDropdownOpen)
                      }
                      className="flex items-center space-x-2 bg-[#1b2b48]/80 hover:bg-[#1b2b48] p-2 rounded-lg transition-colors"
                    >
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || "User"}
                          className="w-8 h-8 rounded-full border-2 border-secondary/30"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-white">
                          <User size={16} />
                        </div>
                      )}
                      <span className="text-white text-sm font-medium max-w-[100px] truncate">
                        {user.displayName || "User"}
                      </span>
                      <ChevronDown size={16} className="text-white/70" />
                    </button>

                    {profileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 py-2 bg-[#1b2b48] rounded-lg shadow-xl z-50 border border-[#2e3b56]/50">
                        <Link
                          href="/dashboard"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-white hover:bg-[#2e3b56]/30 transition-colors"
                        >
                          Dashboard
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[#2e3b56]/30 transition-colors flex items-center"
                        >
                          <LogOut size={14} className="mr-2 text-red-400" />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center ml-4 space-x-2">
                    <Link
                      href="/login"
                      className="px-4 py-2 text-white hover:bg-[#1b2b48]/80 rounded-lg text-sm font-medium transition-colors"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/signup"
                      className="px-4 py-2 bg-secondary hover:bg-secondary-light text-white rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md border border-secondary-light/30"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}

                {user && (
                  <Link
                    href="/dashboard"
                    className="ml-2 px-5 py-2.5 bg-secondary hover:bg-secondary-light text-white rounded-md text-sm font-bold transition-colors duration-200 flex items-center shadow-md hover:shadow-lg border-2 border-secondary-light/30"
                  >
                    Start Practice
                    <svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-white focus:outline-none hover:bg-primary-dark/80"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0d1a45] border-t border-primary-light/20">
          <div className="container mx-auto px-4 py-4 space-y-3">
            {isHomePage && (
              <>
                <Link
                  href="/#how-it-works"
                  className="block px-4 py-3 rounded-md text-base font-medium text-white hover:bg-primary-dark border-l-2 border-transparent hover:border-secondary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How it Works
                </Link>
              </>
            )}

            {!loading && (
              <>
                {user ? (
                  <>
                    <div className="px-4 py-3 flex items-center space-x-3">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || "User"}
                          className="w-8 h-8 rounded-full border-2 border-secondary/30"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-white">
                          <User size={16} />
                        </div>
                      )}
                      <span className="text-white font-medium">
                        {user.displayName || "User"}
                      </span>
                    </div>
                    <Link
                      href="/dashboard"
                      className="block px-4 py-3 rounded-md text-base font-medium text-white hover:bg-primary-dark border-l-2 border-transparent hover:border-secondary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={async () => {
                        await handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 rounded-md text-base font-medium text-white hover:bg-primary-dark border-l-2 border-transparent hover:border-secondary flex items-center"
                    >
                      <LogOut size={18} className="mr-2 text-red-400" />
                      Sign Out
                    </button>
                    <Link
                      href="/dashboard"
                      className="block px-4 py-3 rounded-md text-base font-bold bg-secondary text-white hover:bg-secondary-light border border-secondary-light/30 shadow-md mt-4"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Start Practice
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="block px-4 py-3 rounded-md text-base font-medium text-white hover:bg-primary-dark border-l-2 border-transparent hover:border-secondary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Log In
                    </Link>
                    <Link
                      href="/signup"
                      className="block px-4 py-3 rounded-md text-base font-medium bg-secondary text-white hover:bg-secondary-light border border-secondary-light/30 shadow-md"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
