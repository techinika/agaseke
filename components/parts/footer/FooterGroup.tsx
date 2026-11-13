import React from "react";
import Link from "next/link";
import { RiMediumFill } from "react-icons/ri";

export default function FooterGroup({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; isExternal?: boolean }[];
}) {
  return (
    <div>
      <h4 className="font-bold text-white text-sm mb-6 uppercase tracking-widest">
        {title}
      </h4>
      <ul className="space-y-4 text-sm">
        {links.map((link) => (
          <li key={link.label}>
            {link.isExternal ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-orange-500 transition-colors flex min-h-11 min-w-11 items-center gap-2"
              >
                {link.label}
                <RiMediumFill className="text-orange-600/50" />
              </a>
            ) : (
              <Link
                href={link.href}
                className="hover:text-orange-500 transition-colors inline-flex min-h-11 min-w-11 items-center"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
