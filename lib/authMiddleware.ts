import { adminAuth, adminDb } from "@/db/firebaseAdmin";
import { NextResponse } from "next/server";

export interface AuthUser {
  uid: string;
  email: string | null;
}

async function extractToken(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.split("Bearer ")[1] || null;
}

export async function verifyAuthToken(request: Request): Promise<AuthUser | null> {
  const token = await extractToken(request);
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email || null,
    };
  } catch {
    return null;
  }
}

export function unauthorized(message = "Authentication required") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Insufficient permissions") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/** Rejects if no valid token is present. */
export async function requireAuth(request: Request): Promise<AuthUser | NextResponse> {
  const user = await verifyAuthToken(request);
  if (!user) return unauthorized();
  return user;
}

/** Rejects only if a token IS present but INVALID. Missing token → returns null (anonymous). */
export async function optionalAuth(request: Request): Promise<AuthUser | null | NextResponse> {
  const token = await extractToken(request);
  if (!token) return null;

  const user = await verifyAuthToken(request);
  if (!user) return unauthorized();

  return user;
}

/** Rejects if not authenticated as admin. */
export async function requireAdmin(request: Request): Promise<AuthUser | NextResponse> {
  const user = await verifyAuthToken(request);
  if (!user) return unauthorized();

  const profileSnap = await adminDb.collection("profiles").doc(user.uid).get();
  if (!profileSnap.exists || !profileSnap.data()?.isAdmin) {
    return forbidden("Admin access required");
  }

  return user;
}
