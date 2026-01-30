import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { IconSearch } from "@/components/icons";

export default async function SquarePage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();

  const where: Prisma.FeedbackWhereInput = { isPublic: true };
  if (q) where.OR = [{ title: { contains: q } }, { content: { contains: q } }];

  const list = await prisma.feedback.findMany({
    where,
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
          反馈广场
        </h1>
        <p className="text-sm text-zinc-700">
          公开反馈对所有人可见。支持标题/正文模糊搜索。
        </p>
      </div>

      <form
        action="/square"
        method="get"
        className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-5 shadow-sm shadow-zinc-900/5 md:flex-row md:items-center"
      >
        <label className="flex flex-1 items-center gap-3 rounded-xl border border-zinc-200 bg-[var(--surface)] px-4 py-2 text-sm text-zinc-700 focus-within:border-teal-900">
          <IconSearch className="h-4 w-4 text-zinc-500" />
          <input
            name="q"
            defaultValue={q}
            placeholder="搜一搜：比如 “登录” / “加载慢” / “建议”"
            className="w-full bg-transparent outline-none placeholder:text-zinc-400"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-teal-900 px-4 py-2 text-sm font-medium text-[var(--surface)] shadow-sm shadow-teal-900/20 hover:bg-teal-950"
        >
          搜索
        </button>
      </form>

      <section className="grid gap-3">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-7 text-sm text-zinc-700 shadow-sm shadow-zinc-900/5">
            暂无结果。换个关键词试试？
          </div>
        ) : (
          list.map((f) => (
            <Link
              key={f.id}
              href={`/square/${f.id}`}
              className="rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-6 shadow-sm shadow-zinc-900/5 hover:border-zinc-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-zinc-950">
                    {f.title}
                  </div>
                  <div className="mt-2 line-clamp-2 text-sm leading-7 text-zinc-700">
                    {f.content}
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-zinc-600">
                  <div className="font-medium text-zinc-800">{f.user.username}</div>
                  <div>{new Date(f.createdAt).toLocaleString("zh-CN")}</div>
                </div>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
