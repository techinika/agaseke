"use client";

import { useEffect } from "react";
import { getBreadcrumbSchema } from "@/lib/schemas";

export default function ExploreSchema() {
  useEffect(() => {
    const breadcrumbs = getBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Explore Creators", url: "/explore" },
    ]);

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "explore-breadcrumb-schema";
    script.innerHTML = JSON.stringify(breadcrumbs);
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById("explore-breadcrumb-schema");
      if (existing) existing.remove();
    };
  }, []);

  return null;
}
