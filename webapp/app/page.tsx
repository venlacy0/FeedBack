import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

export default async function Home() {
  const user = await getCurrentUser();
  const publicCount = await prisma.feedback.count({ where: { isPublic: true } });

  return (
    <div className="grid gap-8">
      <section className="rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-7 shadow-sm shadow-zinc-900/5">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            把反馈说清楚，比把情绪说大声更有用
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-zinc-700">
            这里支持公开反馈与私有反馈。公开反馈会进入「反馈广场」，任何人都能查看与搜索；私有反馈仅你和管理员可见。内容支持 Markdown。
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {user ? (
              <>
                <span className="text-sm text-zinc-700">
                  已登录：<span className="font-medium text-zinc-950">{user.username}</span>
                </span>
                <Link
                  href="/new"
                  className="inline-flex items-center justify-center rounded-xl bg-teal-900 px-4 py-2 text-sm font-medium text-[var(--surface)] shadow-sm shadow-teal-900/20 hover:bg-teal-950"
                >
                  写一条反馈
                </Link>
                <Link
                  href="/me"
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-[var(--surface)] px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  看看我写过的
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-teal-900 px-4 py-2 text-sm font-medium text-[var(--surface)] shadow-sm shadow-teal-900/20 hover:bg-teal-950"
                >
                  使用 Linux DO Connect 登录
                </Link>
                <Link
                  href="/square"
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-[var(--surface)] px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  先逛逛广场
                </Link>
              </>
            )}
          </div>

          <div className="pt-3 text-xs text-zinc-600">
            广场当前公开反馈：<span className="font-medium text-zinc-900">{publicCount}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-6 shadow-sm shadow-zinc-900/5">
          <div className="text-sm font-semibold text-zinc-950">公开反馈</div>
          <p className="mt-2 text-sm leading-7 text-zinc-700">
            面向所有人展示，适合产品建议、体验吐槽、可复用的解决思路。
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-6 shadow-sm shadow-zinc-900/5">
          <div className="text-sm font-semibold text-zinc-950">私有反馈</div>
          <p className="mt-2 text-sm leading-7 text-zinc-700">
            只有你和管理员能看到，适合涉及隐私、账号、订单、截图链接等内容。
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-6 shadow-sm shadow-zinc-900/5">
          <div className="text-sm font-semibold text-zinc-950">Markdown</div>
          <p className="mt-2 text-sm leading-7 text-zinc-700">
            支持标题、列表、代码块、引用、链接等，表达更清晰。
          </p>
        </div>
      </section>
    </div>
  );
}

