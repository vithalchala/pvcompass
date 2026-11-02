"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { applyDecision, type Decision } from "@/lib/check-review";
import { requireUser } from "@/lib/session";

const KINDS = ["approve", "reject", "edit", "retire", "reopen"] as const;

export async function reviewCheck(formData: FormData) {
  const user = await requireUser();
  const checkId = String(formData.get("checkId") ?? "");
  const version = Number(formData.get("version"));
  const area = String(formData.get("area") ?? "");
  const kind = String(formData.get("decision")) as Decision["kind"];
  const comment = String(formData.get("comment") ?? "");
  if (!checkId || !Number.isInteger(version) || !KINDS.includes(kind)) return;

  const decision: Decision =
    kind === "edit"
      ? {
          kind,
          comment,
          statement: String(formData.get("statement") ?? ""),
          inspectorEvidence: String(formData.get("evidence") ?? "").split("\n"),
        }
      : ({ kind, comment } as Decision);

  const error = await applyDecision(db, user, checkId, version, decision);

  revalidatePath("/review");
  revalidatePath("/areas", "layout");
  revalidatePath(`/checks/${checkId}`);
  revalidatePath("/pipeline");
  const params = new URLSearchParams({ area });
  if (error) params.set("error", `${checkId}: ${error}`);
  redirect(`/review?${params}#${checkId}`);
}
