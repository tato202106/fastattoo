import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("skeleton rounded-xl", className)} />;
}

export function ArtistCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-3 shadow-card" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <Skeleton className="aspect-[4/5]" />
        <Skeleton className="aspect-[4/5]" />
        <Skeleton className="aspect-[4/5]" />
      </div>
    </div>
  );
}
