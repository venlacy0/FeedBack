import Link from "next/link";
import { getCurrentUser } from "@/lib/user";
import { createFeedback } from "@/app/new/actions";

export default async function NewFeedbackPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-7 text-sm text-zinc-700 shadow-sm shadow-zinc-900/5">
        发送反馈需要先登录。
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-teal-900 px-4 py-2 text-sm font-medium text-[var(--surface)] shadow-sm shadow-teal-900/20 hover:bg-teal-950"
          >
            去登录
          </Link>
          <Link
            href="/square"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-[var(--surface)] px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            先逛逛广场
          </Link>
        </div>
      </div>
    );
  }

  const sp = (await searchParams) ?? {};
  const hasError = sp.error === "1";

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
          写反馈
        </h1>
        <p className="text-sm text-zinc-700">
          你是 <span className="font-medium text-zinc-950">{user.username}</span>。支持 Markdown。
        </p>
      </div>

      {hasError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          表单校验失败：请确认标题/内容已填写且长度合理。
        </div>
      ) : null}

      <form
        action={createFeedback}
        className="grid gap-5 rounded-2xl border border-zinc-200/80 bg-[var(--surface)] p-7 shadow-sm shadow-zinc-900/5"
      >
        <label className="grid gap-2">
          <span className="text-sm font-medium text-zinc-900">标题</span>
          <input
            name="title"
            placeholder="一句话说清楚问题/建议"
            className="rounded-xl border border-zinc-200 bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-teal-900"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-zinc-900">可见性</span>
          <div className="flex flex-wrap gap-3 text-sm text-zinc-800">
            <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-[var(--surface)] px-3 py-2">
              <input type="radio" name="visibility" value="public" defaultChecked />
              公开（进入广场）
            </label>
            <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-[var(--surface)] px-3 py-2">
              <input type="radio" name="visibility" value="private" />
              私有（仅你+管理员）
            </label>
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-zinc-900">内容（Markdown）</span>
          <textarea
            name="content"
            rows={12}
            placeholder={"可以写：\n- 复现步骤\n- 期望结果 / 实际结果\n- 日志/截图链接\n\n```bash\n命令或代码块\n```"}
            className="resize-y rounded-xl border border-zinc-200 bg-[var(--surface)] px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-teal-900"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-teal-900 px-5 py-2.5 text-sm font-medium text-[var(--surface)] shadow-sm shadow-teal-900/20 hover:bg-teal-950"
          >
            提交反馈
          </button>
          <Link
            href="/square"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-[var(--surface)] px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}
