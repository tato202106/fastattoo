import clsx from "clsx";
import type { ComponentProps } from "react";

export function Chip({
  selected,
  className,
  ...props
}: ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={clsx(
        "tap inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
        selected ? "border-fg bg-fg text-bg" : "border-border bg-surface text-fg hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={clsx("inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-fg", className)}>{children}</span>;
}
