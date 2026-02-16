import { Globe, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { FaTiktok } from "react-icons/fa";

export function getIcon(key: string) {
  switch (key) {
    case "instagram":
      return <Instagram size={16} />;
    case "twitter":
      return <Twitter size={16} />;
    case "linkedin":
      return <Linkedin size={16} />;
    case "youtube":
      return <Youtube size={16} />;
    case "tiktok":
      return <FaTiktok size={15} />;
    default:
      return <Globe size={16} />;
  }
}
