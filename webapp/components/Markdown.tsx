import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-zinc max-w-none prose-a:text-teal-800 prose-a:underline-offset-4 prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1 prose-code:py-0.5">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

