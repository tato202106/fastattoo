"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MaplibreMap, Marker, setWorkerUrl, type LngLatBoundsLike, type StyleSpecification } from "maplibre-gl";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/cities";
import { MAPLIBRE_WORKER_URL } from "@/lib/maplibre-version";
import type { ArtistCard, BBox, LatLng } from "@/lib/types";

setWorkerUrl(MAPLIBRE_WORKER_URL);

export interface ArtistMapHandle {
  getBBox(): BBox | null;
  flyTo(p: LatLng, zoom?: number): void;
}

const ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';

/** Fond clair gratuit par défaut (CARTO Positron / Dark Matter, tuiles raster). */
function defaultStyle(dark: boolean): StyleSpecification {
  const variant = dark ? "dark_all" : "light_all";
  return {
    version: 8,
    sources: {
      basemap: {
        type: "raster",
        tiles: ["a", "b", "c", "d"].map((s) => `https://${s}.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}@2x.png`),
        tileSize: 256,
        maxzoom: 19,
        attribution: ATTRIBUTION,
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": dark ? "#1b1b1d" : "#f2efe9" } },
      { id: "basemap", type: "raster", source: "basemap" },
    ],
  };
}

function markerLabel(a: ArtistCard) {
  return `★ ${a.rating.toFixed(1).replace(".", ",")}`;
}

function styleMarker(el: HTMLElement, selected: boolean) {
  el.dataset.selected = selected ? "true" : "false";
  el.style.zIndex = selected ? "10" : "1";
  const pill = el.firstElementChild as HTMLElement;
  pill.style.background = selected ? "var(--fg)" : "var(--surface)";
  pill.style.color = selected ? "var(--bg)" : "var(--fg)";
  pill.style.transform = selected ? "scale(1.15)" : "scale(1)";
}

/**
 * Carte MapLibre, chargée en dynamique (ssr: false) uniquement sur l'écran
 * Explorer et les profils. Marqueurs HTML (≤ 200) : simples, accessibles,
 * cliquables. Pour des milliers de points, passer à une source GeoJSON clusterisée.
 */
export default function ArtistMap({
  ref,
  markers,
  selectedId,
  focus,
  fitKey,
  userPosition,
  padding,
  onSelect,
  onUserMove,
  onError,
  interactive = true,
}: {
  ref?: Ref<ArtistMapHandle>;
  markers: ArtistCard[];
  selectedId: string | null;
  /** Centrer la carte sur ce point quand la valeur change (sélection depuis la liste). */
  focus: { id: string; lat: number; lng: number; nonce: number } | null;
  /** Change quand de nouveaux résultats doivent être cadrés. */
  fitKey: string;
  userPosition: LatLng | null;
  padding: { top: number; bottom: number; left: number; right: number };
  onSelect?: (id: string) => void;
  /** Appelé quand l'utilisateur a déplacé/zoomé la carte lui-même. */
  onUserMove?: () => void;
  onError?: () => void;
  interactive?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markerEls = useRef(new Map<string, { marker: Marker; el: HTMLElement }>());
  const userMarker = useRef<Marker | null>(null);
  const callbacks = useRef({ onSelect, onUserMove, onError });
  const paddingRef = useRef(padding);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    callbacks.current = { onSelect, onUserMove, onError };
    paddingRef.current = padding;
  });

  useImperativeHandle(ref, () => ({
    getBBox() {
      const b = mapRef.current?.getBounds();
      return b ? [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] : null;
    },
    flyTo(p, zoom) {
      mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: zoom ?? Math.max(mapRef.current.getZoom(), 12), padding: paddingRef.current, essential: true });
    },
  }));

  // Initialisation
  useEffect(() => {
    if (!containerRef.current) return;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    let map: MaplibreMap;
    try {
      map = new MaplibreMap({
        container: containerRef.current,
        style: process.env.NEXT_PUBLIC_MAP_STYLE_URL || defaultStyle(dark),
        center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
        zoom: DEFAULT_ZOOM,
        attributionControl: { compact: true },
        interactive,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        maxZoom: 18,
        fadeDuration: 150,
      });
    } catch {
      callbacks.current.onError?.();
      return;
    }
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    // Déplacement par l'utilisateur (≠ déplacements programmés) → « Rechercher dans cette zone ».
    let userMoving = false;
    const markUser = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) userMoving = true;
    };
    map.on("dragstart", markUser);
    map.on("zoomstart", markUser);
    map.on("moveend", () => {
      if (userMoving) callbacks.current.onUserMove?.();
      userMoving = false;
    });
    map.on("load", () => setReady(true));
    map.on("error", (e) => {
      // Les erreurs de tuiles (réseau) ne sont pas bloquantes ; seules les erreurs WebGL le sont.
      if (String(e.error?.message ?? "").toLowerCase().includes("webgl")) callbacks.current.onError?.();
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la carte est utilisable avant le chargement complet du style
    setReady(true);

    const markersMap = markerEls.current;
    return () => {
      markersMap.clear();
      userMarker.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [interactive]);

  // Marqueurs (diff par id)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const current = markerEls.current;
    const ids = new Set(markers.map((m) => m.id));
    for (const [id, { marker }] of current) {
      if (!ids.has(id)) {
        marker.remove();
        current.delete(id);
      }
    }
    for (const a of markers) {
      if (current.has(a.id)) continue;
      const el = document.createElement("button");
      el.type = "button";
      el.className = "ft-marker";
      el.setAttribute("aria-label", `${a.name}, note ${a.rating.toFixed(1)}`);
      el.style.cssText = "padding:6px;background:none;border:0;";
      const pill = document.createElement("span");
      pill.textContent = markerLabel(a);
      pill.style.cssText =
        "display:block;padding:5px 9px;border-radius:999px;font:600 13px/1 system-ui,sans-serif;box-shadow:0 2px 8px rgb(0 0 0/.25);border:1px solid var(--border);transition:transform 150ms ease,background 150ms;white-space:nowrap;";
      el.appendChild(pill);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        callbacks.current.onSelect?.(a.id);
      });
      const marker = new Marker({ element: el, anchor: "bottom" }).setLngLat([a.lng, a.lat]).addTo(map);
      current.set(a.id, { marker, el });
      styleMarker(el, a.id === selectedId);
    }
  }, [markers, ready, selectedId]);

  // Sélection
  useEffect(() => {
    for (const [id, { el }] of markerEls.current) styleMarker(el, id === selectedId);
  }, [selectedId]);

  // Centrage demandé (tap sur une card, swipe du carrousel)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.easeTo({ center: [focus.lng, focus.lat], zoom: Math.max(map.getZoom(), 12.5), padding: paddingRef.current, duration: 450, essential: true });
  }, [focus]);

  // Cadrage des nouveaux résultats
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const pts = markers.slice(0, 40).map((m) => [m.lng, m.lat] as [number, number]);
    if (userPosition) pts.push([userPosition.lng, userPosition.lat]);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.easeTo({ center: pts[0], zoom: 13, padding: paddingRef.current, duration: 500 });
      return;
    }
    const lngs = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    const bounds: LngLatBoundsLike = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];
    map.fitBounds(bounds, { padding: { ...paddingRef.current, top: paddingRef.current.top + 40, left: paddingRef.current.left + 40, right: paddingRef.current.right + 40, bottom: paddingRef.current.bottom + 30 }, maxZoom: 14, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- volontairement déclenché par fitKey uniquement
  }, [fitKey, ready]);

  // Position de l'utilisateur (visible seulement par lui, arrondie)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!userPosition) {
      userMarker.current?.remove();
      userMarker.current = null;
      return;
    }
    if (!userMarker.current) {
      const el = document.createElement("span");
      el.setAttribute("aria-label", "Ma position approximative");
      el.style.cssText = "display:block;width:18px;height:18px;border-radius:999px;background:#2f7cf6;border:3px solid #fff;box-shadow:0 0 0 8px rgb(47 124 246/.18);";
      userMarker.current = new Marker({ element: el }).setLngLat([userPosition.lng, userPosition.lat]).addTo(map);
    } else {
      userMarker.current.setLngLat([userPosition.lng, userPosition.lat]);
    }
  }, [userPosition, ready]);

  // MapLibre force `position: relative` sur son conteneur : on l'enveloppe.
  return (
    <div className="absolute inset-0" role="region" aria-label="Carte des tatoueurs">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
