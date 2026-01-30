import * as React from "react";

type Props = React.SVGProps<SVGSVGElement> & { title?: string };

export function IconMessageSquare(props: Props) {
  const { title = "反馈", ...rest } = props;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...rest}>
      <title>{title}</title>
      <path
        d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSearch(props: Props) {
  const { title = "搜索", ...rest } = props;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...rest}>
      <title>{title}</title>
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
        strokeWidth="1.8"
      />
      <path
        d="M16.2 16.2 21 21"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconPlus(props: Props) {
  const { title = "新建", ...rest } = props;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...rest}>
      <title>{title}</title>
      <path
        d="M12 5v14M5 12h14"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

