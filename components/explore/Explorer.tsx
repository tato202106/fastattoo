"use client";

import clsx from "clsx";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArtistCard } from "@/components/artist/ArtistCard";
import { Icon } from "@/components/ui/Icon";
import { ArtistCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { fetchSearch } from "@/lib/search/client";
import { countActiveFilters, DEFAULT_FILTERS, filtersFromParams, filtersToParams } from "@/lib/search/filters";
import { describeParsed } from "@/lib/search/parse";
import { GEO_MESSAGES, useLocation } from "@/lib/store/location";
import { styleLabel } from "@/lib/styles";
import type { ArtistCard as Card, BBox, SearchFilters, SearchResponse } from "@/lib/types";
import type { ArtistMapHandle } from "./ArtistMap";
import { CardCarousel } from "./CardCarousel";
import { MapBottomSheet, type Snap } from "./MapBottomSheet";
import type { SearchAction } from "./SearchOverlay";

/** La carte n'est chargée que sur cet écran, après le premier rendu (SPEC §27). */
const ArtistMap = dynamic(() => import("./ArtistMap"), {
  ssr: false,
  loading: () => <div className="skeleton absolute inset-0" aria-label="Chargement de la carte" />,
});

const SearchOverlay = dynamic(() => import("./SearchOverlay").then((m) => m.SearchOverlay), { ssr: false });
const FiltersSheet = dynamic(() => import("./FiltersSheet").then((m) => m.FiltersSheet), { ssr: false });

const PAGE_SIZE = 12;
const PEEK_HEIGHT = 252;

type Trigger = "query" | "area" | "more";

export function Explorer() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const filtersKey = filtersToParams(filtersFromParams(params)).toString();
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(filtersKey)), [filtersKey]);
  const wantsNearby = params.get("autour") === "1";

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { position, status: geoStatus, request: requestPosition } = useLocation();

  const [areaBBox, setAreaBBox] = useState<BBox | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [items, setItems] = useState<Card[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fitKey, setFitKey] = useState("init");
  const [retry, setRetry] = useState(0);
  const [safeTop, setSafeTop] = useState(0);
  const safeProbe = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string; lat: number; lng: number; nonce: number } | null>(null);
  const [snap, setSnap] = useState<Snap>("peek");
  const [sheetVisible, setSheetVisible] = useState(PEEK_HEIGHT);
  const [areaDirty, setAreaDirty] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapAllowed, setMapAllowed] = useState(false);
  const mapRef = useRef<ArtistMapHandle>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const trigger = useRef<Trigger>("query");

  /* ---------- URL (texte + filtres uniquement, jamais la position) ---------- */
  const updateUrl = useCallback(
    (next: { q?: string; filters?: SearchFilters }) => {
      const p = filtersToParams(next.filters ?? filters);
      const nq = next.q ?? q;
      if (nq) p.set("q", nq);
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, q, pathname, router],
  );

  // « Autour de moi » depuis l'accueil : on demande la position puis on nettoie l'URL.
  useEffect(() => {
    if (!wantsNearby) return;
    void requestPosition();
    const p = new URLSearchParams(params.toString());
    p.delete("autour");
    router.replace(p.size ? `${pathname}?${p}` : pathname, { scroll: false });
  }, [wantsNearby, params, pathname, router, requestPosition]);

  // La carte (MapLibre, bundle lourd) démarre une fois la liste affichée et le
  // navigateur disponible : les résultats apparaissent sans attendre la carte.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => setMapAllowed(true), { timeout: 1200 });
    else setTimeout(() => setMapAllowed(true), 300);
  }, []);

  /* ---------- Recherche ---------- */
  useEffect(() => {
    const ctrl = new AbortController();
    const why = trigger.current;
    /* eslint-disable react-hooks/set-state-in-effect -- état de la requête en cours */
    setLoading(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    fetchSearch({ q, center: position, bbox: areaBBox, filters, page: 1, pageSize: PAGE_SIZE }, ctrl.signal)
      .then((r) => {
        setResult(r);
        setItems(r.items);
        setPage(1);
        setSelectedId((prev) => (prev && r.markers.some((m) => m.id === prev) ? prev : (r.markers[0]?.id ?? null)));
        if (why !== "area") setFitKey(`${Date.now()}`);
        trigger.current = "query";
      })
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setError("Impossible de charger les tatoueurs. Vérifie ta connexion.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [q, filters, position, areaBBox, retry]);

  // Hauteur de l'encoche (env(safe-area-inset-top)) pour que le sheet déplié laisse la recherche visible.
  useEffect(() => {
    setSafeTop(safeProbe.current?.offsetHeight ?? 0);
  }, [isDesktop]);

  const loadMore = useCallback(() => {
    if (!result?.hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchSearch({ q, center: position, bbox: areaBBox, filters, page: page + 1, pageSize: PAGE_SIZE })
      .then((r) => {
        setItems((prev) => [...prev, ...r.items.filter((i) => !prev.some((p) => p.id === i.id))]);
        setPage(r.page);
        setResult((prev) => (prev ? { ...prev, hasMore: r.hasMore } : r));
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [result, loadingMore, q, position, areaBBox, filters, page]);

  // Chargement progressif de la liste (sentinelle en bas).
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && loadMore(), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, items.length]);

  /* ---------- Synchronisation carte ↔ liste ---------- */
  const markers = useMemo(() => result?.markers ?? [], [result]);
  const byId = useMemo(() => new Map(markers.map((m) => [m.id, m])), [markers]);

  const focusOn = useCallback(
    (id: string) => {
      const a = byId.get(id);
      if (a) setFocus({ id, lat: a.lat, lng: a.lng, nonce: Date.now() });
    },
    [byId],
  );

  /** Tap sur un marqueur → la card correspondante s'ouvre. */
  const onMarkerSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (isDesktop) {
        listRef.current?.querySelector(`[data-artist-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        setSnap("peek");
      }
    },
    [isDesktop],
  );

  /** Swipe du carrousel → la carte suit. */
  const onCarouselChange = useCallback(
    (id: string) => {
      setSelectedId(id);
      focusOn(id);
    },
    [focusOn],
  );

  /** Tap sur une card de la liste → centrer la carte sur le tatoueur. */
  const onCardPick = useCallback(
    (id: string) => {
      setSelectedId(id);
      focusOn(id);
      if (!isDesktop) setSnap("peek");
    },
    [focusOn, isDesktop],
  );

  const searchHere = () => {
    const b = mapRef.current?.getBBox();
    if (!b) return;
    trigger.current = "area";
    setAreaDirty(false);
    setAreaBBox(b);
  };

  const locate = async () => {
    trigger.current = "query";
    setAreaBBox(null);
    setAreaDirty(false);
    const p = await requestPosition();
    if (p) mapRef.current?.flyTo(p, 12);
  };

  const onSearchAction = useCallback(
    (a: SearchAction) => {
      setSearchOpen(false);
      if (a.type === "artist") {
        router.push(`/tatoueurs/${a.slug}`);
        return;
      }
      trigger.current = "query";
      setAreaBBox(null);
      setAreaDirty(false);
      if (a.type === "nearby") {
        void locate();
        if (q) updateUrl({ q: "" });
      } else {
        updateUrl({ q: a.q });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, updateUrl, q],
  );

  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const activeFilters = countActiveFilters(filters);
  const chips = result ? describeParsed(result.parsed, styleLabel) : [];
  const geoError = geoStatus === "denied" || geoStatus === "unavailable" || geoStatus === "timeout" || geoStatus === "error" ? GEO_MESSAGES[geoStatus] : null;
  const filterContext = useMemo(() => ({ q, center: position, bbox: areaBBox }), [q, position, areaBBox]);

  /* ---------- Libellés ---------- */
  const total = result?.total ?? 0;
  const title = loading && !result ? "Recherche…" : `${total} tatoueur${total > 1 ? "s" : ""}${position && !areaBBox && !result?.parsed.city ? " autour" : ""}`;
  let subtitle = "Partout en France";
  if (areaBBox) subtitle = "Dans cette zone";
  else if (result?.parsed.city) subtitle = `À ${result.parsed.city.name} et alentours`;
  else if (position) subtitle = `À moins de ${filters.radiusKm} km`;

  const mapPadding = isDesktop ? { top: 24, bottom: 24, left: 24, right: 24 } : { top: 80, bottom: snap === "full" ? PEEK_HEIGHT : sheetVisible, left: 0, right: 0 };

  /* ---------- Rendu ---------- */
  const searchBar = (
    <div className="flex items-center gap-2">
      {!isDesktop && (
        <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))} aria-label="Retour" className="tap inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface shadow-card">
          <Icon name="back" size={22} />
        </button>
      )}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="tap flex h-12 min-w-0 flex-1 items-center gap-2 rounded-full bg-surface px-4 text-left shadow-card"
        aria-label={q ? `Recherche : ${q}. Modifier` : "Rechercher : ville, style ou tatoueur"}
      >
        <Icon name="search" size={20} className="shrink-0" />
        <span className={clsx("truncate text-[15px]", q ? "font-medium" : "text-muted")}>{q || "Ville, style ou tatoueur"}</span>
      </button>
      <button
        type="button"
        onClick={() => setFiltersOpen(true)}
        className="tap relative inline-flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-surface px-4 text-[15px] font-semibold shadow-card"
      >
        <Icon name="filter" size={20} />
        <span className={clsx(isDesktop ? "" : "sr-only")}>Filtrer</span>
        {activeFilters > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-accent px-1 text-center text-[11px] leading-5 font-bold text-accent-fg">
            {activeFilters}
            <span className="sr-only"> filtres actifs</span>
          </span>
        )}
      </button>
    </div>
  );

  const list = (
    <div className="space-y-3 px-4 pt-1 pb-6">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
              {c}
            </span>
          ))}
        </div>
      )}
      {error && (
        <div className="rounded-2xl bg-surface-2 p-4 text-sm">
          {error}
          <button type="button" onClick={() => setRetry((n) => n + 1)} className="ml-2 font-semibold underline">
            Réessayer
          </button>
        </div>
      )}
      {loading && items.length === 0 && [0, 1, 2].map((i) => <ArtistCardSkeleton key={i} />)}
      {!loading && total === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="font-semibold">Aucun tatoueur ne correspond.</p>
          <p className="mt-1 text-sm text-muted">Élargis la zone ou retire quelques filtres.</p>
          <button
            type="button"
            className="tap mt-3 inline-flex h-11 items-center rounded-full bg-fg px-5 text-sm font-semibold text-bg"
            onClick={() => {
              setAreaBBox(null);
              updateUrl({ q: "", filters: DEFAULT_FILTERS });
            }}
          >
            Tout réinitialiser
          </button>
        </div>
      )}
      {items.map((a, i) => (
        <ArtistCard key={a.id} artist={a} headingLevel={2} selected={a.id === selectedId} priority={i < 2} onPick={() => onCardPick(a.id)} onHover={isDesktop ? () => setSelectedId(a.id) : undefined} />
      ))}
      {loadingMore && <ArtistCardSkeleton />}
      <div ref={sentinelRef} aria-hidden className="h-1" />
    </div>
  );

  const mapLayer = (
    <>
      {!mapAllowed ? (
        <div className="skeleton absolute inset-0" aria-label="Chargement de la carte" />
      ) : mapFailed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-2 p-8 text-center text-sm text-muted">La carte ne peut pas s&apos;afficher sur cet appareil. La liste reste disponible.</div>
      ) : (
        <ArtistMap
          ref={mapRef}
          markers={markers}
          selectedId={selectedId}
          focus={focus}
          fitKey={fitKey}
          userPosition={position}
          padding={mapPadding}
          onSelect={onMarkerSelect}
          onUserMove={() => setAreaDirty(true)}
          onError={() => setMapFailed(true)}
        />
      )}
      {areaDirty && (
        <div className="pointer-events-none absolute inset-x-0 z-10 flex justify-center" style={{ top: isDesktop ? 16 : "calc(var(--safe-top) + 72px)" }}>
          <button type="button" onClick={searchHere} className="tap animate-fade-in pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full bg-fg px-5 text-sm font-semibold text-bg shadow-card">
            <Icon name="refresh" size={18} />
            Rechercher dans cette zone
          </button>
        </div>
      )}
    </>
  );

  if (isDesktop) {
    return (
      <div className="grid h-[calc(100dvh-64px)] grid-cols-[minmax(380px,440px)_1fr]">
        <aside className="flex min-h-0 flex-col border-r border-border bg-bg">
          <div className="space-y-3 p-4">
            {searchBar}
            <div>
              <h1 className="text-lg font-semibold" aria-live="polite">
                {title}
              </h1>
              <p className="text-sm text-muted">{subtitle}</p>
              {geoError && <p className="mt-2 text-sm text-warning">{geoError}</p>}
            </div>
          </div>
          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
            {list}
          </div>
        </aside>
        <section className="relative min-h-0" aria-label="Carte">
          {mapLayer}
          <button type="button" onClick={() => void locate()} aria-label="Autour de moi" className="tap absolute right-4 bottom-8 z-10 inline-flex size-12 items-center justify-center rounded-full bg-surface shadow-card">
            <Icon name="locate" size={22} />
          </button>
        </section>
        {searchOpen && <SearchOverlay open={searchOpen} initialQuery={q} onClose={closeSearch} onAction={onSearchAction} />}
        {filtersOpen && <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} value={filters} onApply={(f) => updateUrl({ filters: f })} context={filterContext} />}
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(var(--nav-h)+var(--safe-bottom))] overflow-hidden bg-surface-2">
      <div ref={safeProbe} aria-hidden className="pointer-events-none absolute w-0" style={{ height: "env(safe-area-inset-top, 0px)" }} />
      {mapLayer}

      <div className="absolute inset-x-0 top-0 z-20 px-3 pt-[calc(var(--safe-top)+10px)]">{searchBar}</div>

      {snap === "peek" && (
        <button
          type="button"
          onClick={() => void locate()}
          aria-label="Autour de moi"
          className="tap absolute right-3 z-10 inline-flex size-12 items-center justify-center rounded-full bg-surface shadow-card transition-[bottom]"
          style={{ bottom: sheetVisible + 12 }}
        >
          {geoStatus === "locating" ? <span className="size-4 animate-ping rounded-full bg-accent" /> : <Icon name="locate" size={22} className={position ? "text-[#2f7cf6]" : ""} />}
        </button>
      )}

      <MapBottomSheet
        snap={snap}
        onSnapChange={setSnap}
        peekHeight={PEEK_HEIGHT}
        topOffset={safeTop + 68}
        onHeightChange={setSheetVisible}
        header={
          <div className="px-4 pb-2">
            <h1 className="text-[17px] font-semibold" aria-live="polite">
              {title}
            </h1>
            <p className="text-sm text-muted">{geoError ?? subtitle}</p>
          </div>
        }
        peek={
          loading && !result ? (
            <div className="px-4">
              <Skeleton className="h-[132px] rounded-[var(--radius-card)]" />
            </div>
          ) : total === 0 ? (
            <p className="px-4 text-sm text-muted">Aucun tatoueur ici. Déplace la carte ou modifie tes filtres.</p>
          ) : (
            <CardCarousel items={markers} selectedId={selectedId} onActiveChange={onCarouselChange} />
          )
        }
      >
        {list}
      </MapBottomSheet>

      {snap === "full" && (
        <button
          type="button"
          onClick={() => setSnap("peek")}
          className="tap animate-fade-in absolute bottom-5 left-1/2 z-30 inline-flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-fg px-5 text-sm font-semibold text-bg shadow-card"
        >
          <Icon name="map" size={18} /> Carte
        </button>
      )}

      {searchOpen && <SearchOverlay open={searchOpen} initialQuery={q} onClose={closeSearch} onAction={onSearchAction} />}
      {filtersOpen && <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} value={filters} onApply={(f) => updateUrl({ filters: f })} context={filterContext} />}
    </div>
  );
}
