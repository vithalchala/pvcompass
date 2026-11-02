"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { getSession } from "@/lib/session";

export type LoginState = { error?: string };

// Checked against when the email is unknown, so both paths take similar time.
const DUMMY_HASH =
  "00000000000000000000000000000000:" + "0".repeat(128);

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = email ? await db.query.users.findFirst({ where: eq(users.email, email) }) : undefined;
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return { error: "Incorrect email or password." };

  const session = await getSession();
  session.userId = user.id;
  await session.save();
  redirect("/pipeline");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
