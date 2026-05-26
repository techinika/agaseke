export async function downloadProduct(productId: string, uid?: string) {
  const params = new URLSearchParams({ productId });
  if (uid) params.set("uid", uid);

  const res = await fetch(`/api/store/download?${params}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Download failed");
  }

  if (data.fileUrl) {
    window.open(data.fileUrl, "_blank");
  }
}
