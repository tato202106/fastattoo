"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ArtistCard } from "@/lib/types";

const ArtistMap = dynamic(() => import("@/components/explore/ArtistMap"), { ssr: false, loading: () => <div className="skeleton absolute inset-0" /> });

/** Mini-carte de localisation : MapLibre n'est chargé que lorsque le bloc devient visible. */
export function MiniMap({ artist }: { artist: ArtistCard }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) {
        setVisible(true);
        io.disconnect();
      }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative h-44 overflow-hidden rounded-2xl bg-surface-2">
      {visible && !failed && (
        <ArtistMap
          markers={[artist]}
          selectedId={artist.id}
          focus={null}
          fitKey={artist.id}
          userPosition={null}
          padding={{ top: 30, bottom: 10, left: 10, right: 10 }}
          interactive={false}
          onError={() => setFailed(true)}
        />
      )}
      {failed && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">Carte indisponible</div>}
    </div>
  );
}
