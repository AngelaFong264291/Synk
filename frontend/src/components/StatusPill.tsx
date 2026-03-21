import type { ReactNode } from "react";

type StatusPillProps = {
  tone: "neutral" | "accent" | "success" | "warning";
  children: ReactNode;
};

export function StatusPill({ tone, children }: StatusPillProps) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
