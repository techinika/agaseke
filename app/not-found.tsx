"use client";
import dynamic from "next/dynamic";

const NotFoundContent = dynamic(() => import("./NotFoundContent"), { ssr: false });

export default function NotFound() {
  return <NotFoundContent />;
}
