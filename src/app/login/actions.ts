"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

const digest = (s: string) => createHash("sha256").update(s).digest();

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { error: "ADMIN_PASSWORD is not configured on the server." };

  const given = String(formData.get("password") ?? "");
  if (!timingSafeEqual(digest(given), digest(expected))) {
    return { error: "Incorrect password." };
  }

  const session = await getSession();
  session.isAdmin = true;
  await session.save();
  redirect("/areas");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
