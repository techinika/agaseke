"use client";

import { useAuth } from "@/auth/AuthContext";
import { VerificationFlow } from "@/features/verification/VerificationFlow";
import { VerificationSkeleton } from "@/features/verification/VerificationSkeleton";
import { useVerification } from "@/features/verification/useVerification";

export const VerificationPage = ({ embedded = false }: { embedded?: boolean }) => {
  const { loading } = useAuth();
  const flow = useVerification();

  if (loading) return <VerificationSkeleton />;
  return <VerificationFlow {...flow} embedded={embedded} />;
};
