import clsx from "clsx";
import { Icon } from "./Icon";

export function Rating({ value, count, className, size = 14 }: { value: number; count?: number; className?: string; size?: number }) {
  return (
    <span className={clsx("inline-flex items-center gap-1", className)}>
      <Icon name="star" size={size} className="text-star" strokeWidth={1.5} />
      <span className="font-semibold">{value.toFixed(1).replace(".", ",")}</span>
      {count != null && <span className="text-muted">({count})</span>}
      <span className="sr-only">sur 5</span>
    </span>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" size={size} strokeWidth={1.5} className={i <= Math.round(value) ? "text-star" : "text-border"} />
      ))}
    </span>
  );
}
