import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/firebaseAdmin", () => ({
  adminDb: {},
}));

import { serializeReaderArticle, serializeReaderPost } from "@/lib/articleReader";
import { getPostSchema } from "@/lib/schemas";

describe("SSR content redaction", () => {
  it("omits private post body and media URLs from SSR serialization", () => {
    const serialized = serializeReaderPost({
      id: "post-1",
      title: "Secret title",
      description: "Secret post body",
      content: "Secret content",
      shortDescription: "Secret dek",
      htmlContent: "<p>Secret</p>",
      type: "image",
      coverUrl: "https://example.com/secret-cover.jpg",
      contentUrl: "https://example.com/secret-image.jpg",
      isPrivate: true,
      creatorId: "alice",
      views: 42,
      commentCount: 3,
      stats: { likes: 9 },
    });

    expect(serialized.isPrivate).toBe(true);
    expect(serialized.title).toBe("Supporters-only post");
    expect(serialized.description).toBe("");
    expect(serialized.content).toBe("");
    expect(serialized.shortDescription).toBe("");
    expect(serialized.htmlContent).toBe("");
    expect(serialized.coverUrl).toBe("");
    expect(serialized.contentUrl).toBeNull();
  });

  it("preserves public post content for instant SSR rendering", () => {
    const serialized = serializeReaderPost({
      id: "post-2",
      title: "Studio diary",
      description: "Recording day in Kigali",
      type: "text",
      isPrivate: false,
      creatorId: "alice",
      views: 15,
      commentCount: 2,
      stats: { likes: 5 },
    });

    expect(serialized.isPrivate).toBe(false);
    expect(serialized.title).toBe("Studio diary");
    expect(serialized.description).toBe("Recording day in Kigali");
    expect(serialized.likesCount).toBe(5);
  });

  it("omits private article HTML and assets from SSR serialization", () => {
    const serialized = serializeReaderArticle({
      id: "art-1",
      title: "Members essay",
      shortDescription: "Exclusive dek",
      htmlContent: "<p>Exclusive essay body</p>",
      coverUrl: "https://example.com/private-cover.jpg",
      slug: "members-essay",
      isPrivate: true,
    });

    expect(serialized.isPrivate).toBe(true);
    expect(serialized.title).toBe("Supporters-only article");
    expect(serialized.shortDescription).toBe("");
    expect(serialized.htmlContent).toBe("");
    expect(serialized.coverUrl).toBe("");
  });
});

describe("Post schema", () => {
  it("builds valid SocialMediaPosting JSON-LD metadata", () => {
    const schema = getPostSchema({
      headline: "Studio diary",
      description: "Recording day in Kigali",
      url: "/alice/community/post-2",
      authorName: "Alice",
      authorUrl: "/alice",
      views: 15,
      commentCount: 2,
    });

    expect(schema["@type"]).toBe("SocialMediaPosting");
    expect(schema.headline).toBe("Studio diary");
    expect(schema.author.name).toBe("Alice");
    expect(schema.interactionStatistic).toHaveLength(2);
  });
});

describe("Light-only theme", () => {
  it("locks tokens.css and globals.css to light mode without .dark overrides", () => {
    const tokensCss = readFileSync(path.join(process.cwd(), "styles/tokens.css"), "utf8");
    const globalsCss = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");

    expect(tokensCss).toContain("color-scheme: light;");
    expect(tokensCss).not.toMatch(/^\.dark\s*\{/m);
    expect(globalsCss).not.toContain("@custom-variant dark");
    expect(globalsCss).not.toMatch(/^\.dark\s*\{/m);
  });
});
