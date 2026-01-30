"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const ReplySchema = z.object({
  feedbackId: z.string().min(1),
  content: z.string().trim().min(1, "回复不能为空").max(20000, "回复太长"),
});

export async function createAdminReply(formData: FormData) {
  const session = await getSession();
  if (!session.isAdmin) redirect("/admin");

  const parsed = ReplySchema.safeParse({
    feedbackId: formData.get("feedbackId"),
    content: formData.get("content"),
  });
  if (!parsed.success) redirect(`/square/${String(formData.get("feedbackId") ?? "")}?reply_error=1`);

  await prisma.reply.create({
    data: {
      feedbackId: parsed.data.feedbackId,
      content: parsed.data.content,
      adminUserId: session.uid ?? null,
    },
  });

  redirect(`/square/${parsed.data.feedbackId}`);
}

