import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "md" | "lg" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg shadow-sm hover:brightness-105 disabled:opacity-50",
  secondary: "bg-fg text-bg hover:opacity-90 disabled:opacity-50",
  outline: "border border-border bg-surface text-fg hover:bg-surface-2 disabled:opacity-50",
  ghost: "text-fg hover:bg-surface-2 disabled:opacity-50",
};
const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-full gap-1.5",
  md: "h-11 px-4 text-[15px] rounded-full gap-2",
  lg: "h-14 px-6 text-base rounded-2xl gap-2",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return clsx("tap inline-flex select-none items-center justify-center font-semibold whitespace-nowrap", VARIANTS[variant], SIZES[size], className);
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

/** Bouton icône rond, zone tactile 44×44 minimum. */
export function IconButton({ className, label, ...props }: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx("tap inline-flex size-11 shrink-0 items-center justify-center rounded-full", className)}
      {...props}
    />
  );
}
