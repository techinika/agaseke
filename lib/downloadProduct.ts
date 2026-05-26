export async function downloadProduct(productId: string, uid?: string) {
  const params = new URLSearchParams({ productId });
  if (uid) params.set("uid", uid);

  const res = await fetch(`/api/store/download?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Download failed" }));
    throw new Error(err.error || "Download failed");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?(.+?)"?$/);
  const filename = match ? match[1] : `product_${productId}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
