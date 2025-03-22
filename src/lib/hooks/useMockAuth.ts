import { useContext } from "react";
import { MockAuthContext } from "@/lib/contexts/MockAuthContext";

export default function useMockAuth() {
  const context = useContext(MockAuthContext);

  if (context === undefined) {
    throw new Error("useMockAuth must be used within a MockAuthProvider");
  }

  return context;
}
