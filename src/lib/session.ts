import "server-only";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionSecret, SESSION_COOKIE, SESSION_TTL_SECONDS, type SessionData } from "./session-config";

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), {
    cookieName: SESSION_COOKIE,
    password: await getSessionSecret(),
    ttl: SESSION_TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  });
}

/** Call at the top of any server action or page that needs the admin. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session.isAdmin) redirect("/login");
  return session;
}
