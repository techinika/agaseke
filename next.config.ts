import type { NextConfig } from "next";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://www.google.com https://www.googletagmanager.com https://va.vercel-scripts.com https://*.firebaseapp.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.r2.dev https://*.r2.cloudflarestorage.com https://www.gstatic.com https://*.googleusercontent.com https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.cloudfunctions.net https://api.agaseke.me https://*.api.agaseke.me https://*.workers.dev https://api.paypack.rw https://payments.pesapal.com https://pay.pesapal.com https://*.vercel-insights.com https://www.google-analytics.com https://region1.google-analytics.com",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://accounts.google.com https://*.firebaseapp.com",
  "media-src 'self' blob: data: https://res.cloudinary.com https://*.r2.dev",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const ENFORCED_CONTENT_SECURITY_POLICY = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: ENFORCED_CONTENT_SECURITY_POLICY,
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: CONTENT_SECURITY_POLICY,
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(self), usb=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-site",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
  {
    key: "X-XSS-Protection",
    value: "0",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "60mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: `/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "**"}/**`,
      },
      {
        protocol: "https",
        hostname: "agaseke-assets.*.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "agaseke-assets.*.r2.cloudflarestorage.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.gstatic.com",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;