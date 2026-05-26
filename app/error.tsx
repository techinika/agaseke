"use client";
import dynamic from "next/dynamic";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ErrorContent = dynamic(() => import("./ErrorContent"), { ssr: false });

export default function Error({ error, reset }: ErrorProps) {
  return <ErrorContent error={error} reset={reset} />;
}
