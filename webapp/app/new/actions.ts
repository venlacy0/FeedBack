"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const Schema = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(80, "标题太长"),
  content: z.string().trim().min(1, "内容不能为空").max(20000, "内容太长"),
  visibility: z.enum(["public", "private"]),
});

export async function createFeedback(formData: FormData) {
  const session = await getSession();
  if (!session.uid) redirect("/?need_login=1");

  const parsed = Schema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    visibility: formData.get("visibility"),
  });

  if (!parsed.success) redirect("/new?error=1");

  const feedback = await prisma.feedback.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      isPublic: parsed.data.visibility === "public",
      userId: session.uid,
    },
  });

  redirect(feedback.isPublic ? `/square/${feedback.id}` : "/me");
}

