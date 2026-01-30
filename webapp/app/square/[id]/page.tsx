import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Markdown } from "@/components/Markdown";
import { createAdminReply } from "@/app/square/[id]/actions";

export default async function SquareDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ reply_error?: string }>;
}) {
  const { id } = await params;
  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      user: true,
      replies: { orderBy: { createdAt: "asc" }, include: { adminUser: true } },
    },
  });
  if (!feedback) notFound();

  const session = await getSession();
  const canSeePrivate =
    session.isAdmin || (session.uid && session.uid === feedback.userId);

  if (!feedback.isPublic && !canSeePrivate) notFound();

  const sp = (await searchParams) ?? {};
  const replyError = sp.reply_error === "1";

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
            {feedback.title}
          </h1>
          <div className="mt-2 text-xs text-zinc-600">
            {feedback.isPublic ? "公开" : "私有"} · {feedback.user.username} ·{" "}
            {new Date(feedback.createdAt).toLocaleString("zh-CN")}
          </div>
        </div>
        <Link
          href="/square"
          className="shrink-0 rounded-xl border border-zinc-200 bg-[var(--surface)] px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          返回广场
        </Link>
      </div>

      <article className="rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-7 shadow-sm shadow-zinc-900/5">
        <Markdown content={feedback.content} />
      </article>

      <section className="grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight text-zinc-950">
            管理员回复
          </h2>
          <div className="text-xs text-zinc-600">
            {feedback.replies.length} 条
          </div>
        </div>

        {feedback.replies.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-6 text-sm text-zinc-700 shadow-sm shadow-zinc-900/5">
            暂无回复。
          </div>
        ) : (
          <div className="grid gap-3">
            {feedback.replies.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-6 shadow-sm shadow-zinc-900/5"
              >
                <div className="text-xs text-zinc-600">
                  <span className="font-medium text-zinc-800">
                    管理员{r.adminUser ? `（${r.adminUser.username}）` : ""}
                  </span>{" "}
                  · {new Date(r.createdAt).toLocaleString("zh-CN")}
                </div>
                <div className="mt-3">
                  <Markdown content={r.content} />
                </div>
              </div>
            ))}
          </div>
        )}

        {session.isAdmin ? (
          <div className="grid gap-3 rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-6 shadow-sm shadow-zinc-900/5">
            <div className="text-sm font-medium text-zinc-900">写回复</div>
            {replyError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                回复提交失败：内容不能为空且长度需合理。
              </div>
            ) : null}
            <form action={createAdminReply} className="grid gap-3">
              <input type="hidden" name="feedbackId" value={feedback.id} />
              <textarea
                name="content"
                rows={7}
                placeholder={"用 Markdown 回复用户：\n- 结论\n- 原因\n- 下一步建议\n\n```text\n示例\n```"}
                className="resize-y rounded-xl border border-zinc-200 bg-[var(--surface)] px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-teal-900"
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-xl bg-teal-900 px-5 py-2.5 text-sm font-medium text-[var(--surface)] shadow-sm shadow-teal-900/20 hover:bg-teal-950"
                >
                  发送回复
                </button>
                <div className="text-xs text-zinc-600">
                  仅管理员可回复；回复内容会随反馈可见性展示给可访问该反馈的人。
                </div>
              </div>
            </form>
          </div>
        ) : null}
      </section>
    </div>
  );
}
