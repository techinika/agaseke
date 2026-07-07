export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Authentication required" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

export async function requireAuth(
  request: Request,
  apiKey: string
): Promise<{ uid: string; email: string | null } | Response> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return unauthorized();

  const idToken = authHeader.split("Bearer ")[1];
  if (!idToken) return unauthorized();

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Firebase auth error:", res.status, err);
      return unauthorized();
    }

    const data = (await res.json()) as { users?: Array<{ localId: string; email?: string }> };
    if (!data.users?.[0]) return unauthorized();

    const user = data.users[0];
    return { uid: user.localId, email: user.email || null };
  } catch (err) {
    console.error("Firebase REST auth error:", err);
    return unauthorized();
  }
}
