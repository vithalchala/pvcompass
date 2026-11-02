import "server-only";
import { eq } from "drizzle-orm";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, type Role } from "@/db/schema";
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

export type CurrentUser = { id: number; email: string; name: string; roles: Role[] };

/** Call at the top of any page or server action that needs a signed-in user. */
export async function requireUser(): Promise<CurrentUser> {
  const session = await getSession();
  if (!session.userId) redirect("/login");
  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  // A deleted user's cookie is no longer valid.
  if (!user) redirect("/login");
  return { id: user.id, email: user.email, name: user.name, roles: user.roles as Role[] };
}

export const hasRole = (user: CurrentUser, role: Role) => user.roles.includes(role);

/** Signed-in user who holds `role`; anyone else gets an error. */
export async function requireRole(role: Role): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasRole(user, role)) throw new Error(`This action needs the ${role.replace("_", " ")} role.`);
  return user;
}
