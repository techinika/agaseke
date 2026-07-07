import { auth } from "@/db/firebase";

export async function getAuthHeaders(contentType?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (contentType) headers["Content-Type"] = contentType;
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiPost(path: string, body: unknown): Promise<Response> {
  const headers = await getAuthHeaders("application/json");
  return fetch(path, { method: "POST", headers, body: JSON.stringify(body) });
}

export async function apiPostFormData(path: string, formData: FormData): Promise<Response> {
  const headers = await getAuthHeaders();
  return fetch(path, { method: "POST", headers, body: formData });
}

export async function apiGet(path: string): Promise<Response> {
  const headers = await getAuthHeaders();
  return fetch(path, { headers });
}

export async function apiDelete(path: string): Promise<Response> {
  const headers = await getAuthHeaders();
  return fetch(path, { method: "DELETE", headers });
}
