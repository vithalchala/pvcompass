"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { checks } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

const STATUSES = ["pending", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];

export async function setCheckStatus(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("checkId"));
  const status = String(formData.get("status")) as Status;
  if (!Number.isInteger(id) || !STATUSES.includes(status)) return;

  const note = String(formData.get("note") ?? "").trim() || null;
  await db
    .update(checks)
    .set({
      status,
      reviewNote: status === "pending" ? null : note,
      reviewedAt: status === "pending" ? null : new Date(),
    })
    .where(eq(checks.id, id));

  revalidatePath("/review");
  revalidatePath("/areas", "layout");
}
