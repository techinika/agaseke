"use client";

import { useAuth } from "@/auth/AuthContext";
import React from "react";
import SupporterSpace from "./SupporterSpace";
import CreatorSpace from "./CreatorSpace";

function SpaceSwitcher() {
  const { profile } = useAuth();
  if (profile?.defaultSpace === "supporter") {
    return <SupporterSpace />;
  } else {
    return <CreatorSpace />;
  }
}

export default SpaceSwitcher;
