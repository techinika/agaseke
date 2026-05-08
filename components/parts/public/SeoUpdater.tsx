"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface SeoUpdaterProps {
  data: {
    creator?: { name?: string; bio?: string; profilePicture?: string; verified?: boolean };
    profile?: { photoURL?: string };
  };
  username: string;
}

export function SeoUpdater({ data, username }: SeoUpdaterProps) {
  const pathname = usePathname();
  
  useEffect(() => {
    if (!data?.creator) return;
    
    const creator = data.creator;
    const profile = data.profile;
    const displayName = creator.name || username;
    const verified = creator.verified || false;
    const bio = creator.bio || `Support ${displayName} on Agaseke. Fueling Rwandan creativity.`;
    const image = profile?.photoURL || creator.profilePicture || "/agaseke.png";
    
    // Determine page type from pathname
    const isCommunity = pathname.endsWith("/community");
    const isGatherings = pathname.endsWith("/gatherings");
    const isStore = pathname.endsWith("/store");
    const isGiveaways = pathname.endsWith("/giveaways");
    const isMessaging = pathname.endsWith("/messaging");
    
    let title = "";
    let description = "";
    
    if (isMessaging) {
      title = `Message ${displayName} | Agaseke`;
      description = `Send a message to ${displayName} on Agaseke.`;
    } else if (isGatherings) {
      title = `Events & Gatherings | ${displayName} (@${username}) | Agaseke`;
      description = `RSVP to upcoming events and gatherings by ${displayName}.`;
    } else if (isStore) {
      title = `Shop | ${displayName} Store | Agaseke`;
      description = `Shop digital products and merchandise from ${displayName}.`;
    } else if (isGiveaways) {
      title = `Giveaways | ${displayName} (@${username}) | Agaseke`;
      description = `Enter giveaways and win prizes from ${displayName}.`;
    } else if (isCommunity) {
      title = `Community | ${displayName} (@${username}) | Agaseke`;
      description = `Browse community posts and content from ${displayName}.`;
    } else {
      title = verified 
        ? `✓ ${displayName} (@${username}) | Agaseke` 
        : `${displayName} (@${username}) | Agaseke`;
    }

    // Update document title
    document.title = title;
    
    // Update meta tags
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", description);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = description;
      document.head.appendChild(meta);
    }

    // Update OpenGraph
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute("content", title);
    }
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute("content", description);
    }
    
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      ogImage.setAttribute("content", image);
    }
    
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute("content", window.location.href);
    }

    // Update Twitter card
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) {
      twitterTitle.setAttribute("content", title);
    }
    
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) {
      twitterDescription.setAttribute("content", description);
    }
    
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) {
      twitterImage.setAttribute("content", image);
    }

    // Update canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link") as HTMLLinkElement;
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.origin + pathname);

  }, [data, username, pathname]);

  return null;
}