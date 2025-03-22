"use client";

import { ReactNode } from "react";
import { DeepgramContextProvider } from "@/lib/contexts/DeepgramContext";
import { AuthProvider } from "@/lib/contexts/AuthContext";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <DeepgramContextProvider>{children}</DeepgramContextProvider>
    </AuthProvider>
  );
}
