import { Node, mergeAttributes } from "@tiptap/core";

export type MediaKind = "image" | "video";

export interface MediaBlockAttrs {
  kind: MediaKind;
  src: string | null;
  alt: string | null;
  caption: string | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mediaBlock: {
      setMediaBlock: (options: Partial<MediaBlockAttrs>) => ReturnType;
    };
  }
}

export interface MediaBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

/**
 * A single rich-media block that renders as:
 *   <figure><img|video src .../><figcaption>caption</figcaption></figure>
 * Supports alt text on images and an optional caption for both images/videos.
 */
export const MediaNode = Node.create<MediaBlockOptions>({
  name: "mediaBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      kind: { default: "image" },
      src: { default: null },
      alt: { default: null },
      caption: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          const img = el.querySelector("img");
          const video = el.querySelector("video");
          const media = img || video;
          if (!media) return false;
          const figcaption = el.querySelector("figcaption");
          return {
            kind: img ? "image" : "video",
            src: media.getAttribute("src") || null,
            alt: img?.getAttribute("alt") || null,
            caption:
              figcaption?.textContent?.trim() || null,
          };
        },
      },
      {
        tag: "img[src]",
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          return {
            kind: "image",
            src: el.getAttribute("src") || null,
            alt: el.getAttribute("alt") || null,
            caption: null,
          };
        },
      },
      {
        tag: "video[src]",
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          return {
            kind: "video",
            src: el.getAttribute("src") || null,
            alt: null,
            caption: null,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const attrs = node.attrs as MediaBlockAttrs;
    const { kind, src, alt, caption } = attrs;

    const mediaEl =
      kind === "video"
        ? [
            "video",
            {
              src: src || "",
              controls: "true",
              controlsList: "nodownload",
              preload: "metadata",
            },
          ]
        : ["img", { src: src || "", alt: alt || "", loading: "lazy" }];

    const children: unknown[] = [mediaEl];
    if (caption) {
      children.push(["figcaption", {}, caption]);
    }

    return [
      "figure",
      mergeAttributes(this.options.HTMLAttributes),
      ...children,
    ];
  },

  addCommands() {
    return {
      setMediaBlock:
        (options) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: options,
          }),
    };
  },
});