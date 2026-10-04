import clsx from "clsx";
import type { ImageAsset } from "@/lib/types";
import { Picture } from "./Picture";

export function Avatar({ image, size = 48, className, priority }: { image: ImageAsset; size?: number; className?: string; priority?: boolean }) {
  return (
    <span className={clsx("relative block shrink-0 overflow-hidden rounded-full", className)} style={{ width: size, height: size }}>
      <Picture image={image} usage="avatar" sizes={`${size}px`} fill priority={priority} alt="" />
    </span>
  );
}

export function InitialsAvatar({ name, size = 44, className }: { name: string; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={clsx("inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent", className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
