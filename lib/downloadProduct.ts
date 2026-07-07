import { auth } from "@/db/firebase";

export async function downloadProduct(productId: string, uid?: string) {
  const headers: Record<string, string> = {};
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }

  const STORE_WORKER_URL =
    process.env.NEXT_PUBLIC_STORE_WORKER_URL || "http://localhost:8792";

  const res = await fetch(`${STORE_WORKER_URL}/api/store/download/${productId}`, { headers });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Download failed");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?(.+?)"?$/);
  const fileName = match ? match[1] : `product-${productId}`;
  const contentType = res.headers.get("content-type") || "application/octet-stream";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
