import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mockPush = vi.fn();
const mockUploadFile = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockSendCommsEmail = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    creator: {
      uid: "creator-uid-1",
      handle: "aline",
      name: "Aline Creator",
      communityTiers: [],
    },
  }),
}));

vi.mock("@/lib/uploadService", async () => {
  const actual = await vi.importActual<typeof import("@/lib/uploadService")>(
    "@/lib/uploadService",
  );
  return {
    ...actual,
    uploadFile: (...args: unknown[]) => mockUploadFile(...args),
  };
});

vi.mock("@/db/firebase", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, name: string) => ({ name })),
  doc: vi.fn((_db, col: string, id: string) => ({ col, id })),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  getDoc: vi.fn(),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  serverTimestamp: vi.fn(() => "SERVER_TS"),
}));

vi.mock("@/lib/commsService", () => ({
  sendCommsEmail: (...args: unknown[]) => mockSendCommsEmail(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

import RichTextEditor from "@/components/parts/dashboard/RichTextEditor";
import ArticleForm from "@/components/parts/dashboard/ArticleForm";

function setupJsdomMocks() {
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:cover-preview");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  if (typeof Range !== "undefined" && !Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () =>
      ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as DOMRectList;
  }
  if (typeof Range !== "undefined" && !Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () =>
      ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  }
  if (typeof HTMLElement !== "undefined" && !HTMLElement.prototype.getClientRects) {
    HTMLElement.prototype.getClientRects = () =>
      ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as DOMRectList;
  }
  if (typeof document !== "undefined" && !document.elementFromPoint) {
    document.elementFromPoint = () => null;
  }
}

describe("RichTextEditor drag-and-drop R2 upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupJsdomMocks();
  });

  it("uploads dropped image files to R2 and inserts the image tag", async () => {
    mockUploadFile.mockResolvedValue({
      url: "https://assets.agaseke.me/agaseke/posts/aline/dropped.png",
      key: "agaseke/posts/aline/dropped.png",
      visibility: "public",
      publicId: "agaseke/posts/aline/dropped.png",
      assetType: "post_image",
    });

    const onChange = vi.fn();
    const onUploadingChange = vi.fn();
    const { container } = render(
      <RichTextEditor
        content="<p>Hello world</p>"
        onChange={onChange}
        onUploadingChange={onUploadingChange}
      />,
    );

    const dropTarget = container.querySelector(".article-editor")!.parentElement!;
    const file = new File(["pngbytes"], "my-photo.png", { type: "image/png" });

    fireEvent.drop(dropTarget, {
      dataTransfer: {
        files: [file],
        types: ["Files"],
      },
    });

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledWith(file, "post_image", "aline");
    });

    await waitFor(() => {
      const latestHtml = onChange.mock.calls.at(-1)?.[0] as string;
      expect(latestHtml).toContain(
        'src="https://assets.agaseke.me/agaseke/posts/aline/dropped.png"',
      );
      expect(latestHtml).toContain("<img");
    });

    expect(onUploadingChange).toHaveBeenCalledWith(true);
    await waitFor(() => {
      expect(onUploadingChange).toHaveBeenLastCalledWith(false);
    });
  });

  it("rejects non-image dropped files without calling uploadFile", () => {
    const onChange = vi.fn();
    const { container } = render(
      <RichTextEditor content="" onChange={onChange} />,
    );

    const dropTarget = container.querySelector(".article-editor")!.parentElement!;
    const pdf = new File(["pdfbytes"], "notes.pdf", { type: "application/pdf" });

    fireEvent.drop(dropTarget, {
      dataTransfer: {
        files: [pdf],
        types: ["Files"],
      },
    });

    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(
      "Only image files can be dropped into the editor.",
    );
  });
});

describe("ArticleForm direct publish cover persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupJsdomMocks();
    mockGetDocs.mockResolvedValue({ docs: [] });
    mockAddDoc.mockResolvedValue({ id: "article-123" });
    mockSendCommsEmail.mockResolvedValue({ success: true, recipientCount: 0 });
  });

  it("saves coverUrl and contentUrl when publishing directly without saving as draft first", async () => {
    const coverUrl = "https://assets.agaseke.me/agaseke/posts/aline/cover.jpg";
    mockUploadFile.mockResolvedValue({
      url: coverUrl,
      key: "agaseke/posts/aline/cover.jpg",
      visibility: "public",
      publicId: "agaseke/posts/aline/cover.jpg",
      assetType: "post_image",
    });

    const { container } = render(<ArticleForm />);

    fireEvent.change(
      screen.getByPlaceholderText("A compelling title (required)"),
      { target: { value: "Direct Publish Cover Test" } },
    );

    // Put content directly via editor DOM / TipTap or mock input: drop an image into editor or fire input
    const editorDropTarget = container.querySelector(".article-editor")!.parentElement!;
    const bodyFile = new File(["img"], "inline.png", { type: "image/png" });
    fireEvent.drop(editorDropTarget, {
      dataTransfer: { files: [bodyFile], types: ["Files"] },
    });

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledTimes(1);
    });

    const coverFileInput = container.querySelector(
      'input[type="file"][accept="image/*"]:not([hidden]), div.border-dashed input[type="file"]',
    ) as HTMLInputElement;
    const coverFile = new File(["cover"], "cover.jpg", { type: "image/jpeg" });
    fireEvent.change(coverFileInput, { target: { files: [coverFile] } });

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledTimes(2);
    });

    const publishBtn = screen.getByRole("button", { name: /Publish/i });
    await waitFor(() => {
      expect(publishBtn).not.toBeDisabled();
    });

    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });

    const savedDoc = mockAddDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(savedDoc.status).toBe("published");
    expect(savedDoc.coverUrl).toBe(coverUrl);
    expect(savedDoc.contentUrl).toBe(coverUrl);
    expect(mockPush).toHaveBeenCalledWith("/creator/content/articles");
  });

  it("re-uploads cover automatically to private R2 storage when audience changes before direct publish", async () => {
    mockUploadFile
      .mockResolvedValueOnce({
        url: "https://assets.agaseke.me/agaseke/posts/aline/public-cover.jpg",
        key: "agaseke/posts/aline/public-cover.jpg",
        visibility: "public",
        publicId: "agaseke/posts/aline/public-cover.jpg",
        assetType: "post_image",
      })
      .mockResolvedValueOnce({
        url: "https://assets.agaseke.me/agaseke/posts/aline/inline.png",
        key: "agaseke/posts/aline/inline.png",
        visibility: "public",
        publicId: "agaseke/posts/aline/inline.png",
        assetType: "post_image",
      })
      .mockResolvedValueOnce({
        url: "",
        key: "agaseke/posts/aline/private-cover.jpg",
        visibility: "private",
        publicId: "agaseke/posts/aline/private-cover.jpg",
        assetType: "post_image",
      });

    const { container } = render(<ArticleForm />);

    fireEvent.change(
      screen.getByPlaceholderText("A compelling title (required)"),
      { target: { value: "Private Direct Publish" } },
    );

    const coverFileInput = container.querySelector(
      "div.border-dashed input[type='file']",
    ) as HTMLInputElement;
    const coverFile = new File(["cover"], "cover.jpg", { type: "image/jpeg" });
    fireEvent.change(coverFileInput, { target: { files: [coverFile] } });

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledTimes(1);
    });

    // Drop inline body image so body is non-empty
    const editorDropTarget = container.querySelector(".article-editor")!.parentElement!;
    fireEvent.drop(editorDropTarget, {
      dataTransfer: {
        files: [new File(["img"], "inline.png", { type: "image/png" })],
        types: ["Files"],
      },
    });

    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledTimes(2);
    });

    // Switch audience from Public to Supporters
    fireEvent.click(screen.getByRole("button", { name: /Supporters/i }));

    const publishBtn = screen.getByRole("button", { name: /Publish/i });
    await waitFor(() => {
      expect(publishBtn).not.toBeDisabled();
    });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
    });

    expect(mockUploadFile).toHaveBeenNthCalledWith(
      3,
      coverFile,
      "post_image",
      "aline",
      undefined,
      "private",
    );
    const savedDoc = mockAddDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(savedDoc.status).toBe("published");
    expect(savedDoc.isPrivate).toBe(true);
    expect(savedDoc.coverUrl).toBe("agaseke/posts/aline/private-cover.jpg");
    expect(savedDoc.contentUrl).toBe("agaseke/posts/aline/private-cover.jpg");
  });
});
