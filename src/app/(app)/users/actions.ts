"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { ROLES, users, type Role } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { requireRole } from "@/lib/session";

export async function saveUser(formData: FormData) {
  await requireRole("company_admin");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const roles = formData.getAll("roles").map(String).filter((r): r is Role => ROLES.includes(r as Role));

  const fail = (msg: string) => redirect(`/users?error=${encodeURIComponent(msg)}`);
  if (!email.includes("@") || !name) fail("Email and full name are required.");
  if (password.length < 12) fail("Use a password of at least 12 characters.");
  if (roles.length === 0) fail("Pick at least one role.");

  const row = { email, name, roles, passwordHash: await hashPassword(password) };
  await db.insert(users).values(row).onConflictDoUpdate({ target: users.email, set: row });
  revalidatePath("/users");
  redirect(`/users?saved=${encodeURIComponent(email)}`);
}
