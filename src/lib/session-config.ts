// Edge-safe: imported by middleware and by server code.

export const SESSION_COOKIE = "pvc_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type SessionData = { userId?: number };

/** SESSION_SECRET if set, otherwise a key derived from ADMIN_PASSWORD. */
export async function getSessionSecret(): Promise<string> {
  const explicit = process.env.SESSION_SECRET;
  if (explicit) {
    if (explicit.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
    return explicit;
  }
  const admin = process.env.ADMIN_PASSWORD;
  if (!admin) throw new Error("ADMIN_PASSWORD is not set");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`pvcompass-session:${admin}`),
  );
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
