"use server";

import { redirect } from "next/navigation";
import { getSession, setSession } from "@/lib/session";

export async function adminLogin(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  const expected = process.env.ADMIN_KEY || "gCM61tTRDmGc1zGU4o2R";

  if (key !== expected) redirect("/admin?bad=1");

  const old = await getSession();
  await setSession({ uid: old.uid, isAdmin: true });
  redirect("/admin");
}

