"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { fetchSearch, type ClientSearch } from "@/lib/search/client";
import { AVAILABILITY_OPTIONS, DEFAULT_FILTERS, RADIUS_MAX, RADIUS_MIN, RATING_OPTIONS } from "@/lib/search/filters";
import { STYLES } from "@/lib/styles";
import type { SearchFilters } from "@/lib/types";

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="border-b border-border py-5 last:border-0">
      <h3 className="text-base font-semibold">{title}</h3>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Filtres (SPEC §10) : un seul bouton « Filtrer » ouvre ce sheet plein écran.
 * Le bouton du bas affiche le nombre de résultats, mis à jour en direct.
 */
export function FiltersSheet({
  open,
  onClose,
  value,
  onApply,
  context,
}: {
  open: boolean;
  onClose: () => void;
  value: SearchFilters;
  onApply: (f: SearchFilters) => void;
  /** Recherche en cours (texte, position, zone) pour compter les résultats. */
  context: Omit<ClientSearch, "filters">;
}) {
  const [draft, setDraft] = useState(value);
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- brouillon réinitialisé à chaque ouverture
    if (open) setDraft(value);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- indicateur de comptage
    setCounting(true);
    const t = setTimeout(() => {
      fetchSearch({ ...context, filters: draft, pageSize: 0 }, ctrl.signal)
        .then((r) => setCount(r.total))
        .catch(() => {})
        .finally(() => setCounting(false));
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [draft, open, context]);

  const set = <K extends keyof SearchFilters>(k: K, v: SearchFilters[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const hasGeo = Boolean(context.center);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filtres"
      fullHeight
      footer={
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setDraft(DEFAULT_FILTERS)} className="underline underline-offset-4">
            Tout effacer
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            aria-live="polite"
          >
            {count == null ? "Afficher les tatoueurs" : count === 0 ? "Aucun tatoueur" : `Afficher ${count} tatoueur${count > 1 ? "s" : ""}`}
            {counting && <span className="ml-1 inline-block size-3 animate-pulse rounded-full bg-current opacity-60" aria-hidden />}
          </Button>
        </div>
      }
    >
      <Section title="Style" hint="Plusieurs choix possibles">
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => {
            const selected = draft.styles.includes(s.slug);
            return (
              <Chip key={s.slug} selected={selected} onClick={() => set("styles", selected ? draft.styles.filter((x) => x !== s.slug) : [...draft.styles, s.slug])}>
                {selected && <Icon name="check" size={16} />}
                {s.label}
              </Chip>
            );
          })}
        </div>
      </Section>

      <Section title="Distance" hint={hasGeo ? undefined : "S'applique autour de ta position ou de la ville recherchée."}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Jusqu&apos;à</span>
          <span className="text-lg font-semibold">{draft.radiusKm} km</span>
        </div>
        <input
          type="range"
          min={RADIUS_MIN}
          max={RADIUS_MAX}
          step={5}
          value={draft.radiusKm}
          onChange={(e) => set("radiusKm", Number(e.target.value))}
          aria-label="Distance maximale en kilomètres"
          className="mt-2 h-11 w-full accent-[var(--accent)]"
        />
        <div className="flex justify-between text-xs text-muted">
          <span>{RADIUS_MIN} km</span>
          <span>{RADIUS_MAX} km</span>
        </div>
      </Section>

      <Section title="Prix" hint="Tarif de départ du tatoueur">
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["priceMin", "Minimum"],
              ["priceMax", "Maximum"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex h-14 items-center gap-2 rounded-2xl border border-border px-3 focus-within:border-fg">
              <span className="flex flex-col">
                <span className="text-xs text-muted">{label}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={10}
                  placeholder={key === "priceMin" ? "0" : "Sans limite"}
                  value={draft[key] ?? ""}
                  onChange={(e) => set(key, e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
                  className="w-full bg-transparent font-semibold outline-none"
                />
              </span>
              <span className="ml-auto text-muted">€</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Disponibilité">
        <div className="flex flex-wrap gap-2">
          {AVAILABILITY_OPTIONS.map((o) => (
            <Chip key={o.value} selected={draft.availability === o.value} onClick={() => set("availability", draft.availability === o.value ? null : o.value)}>
              {o.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Note">
        <div className="flex flex-wrap gap-2">
          {RATING_OPTIONS.map((r) => (
            <Chip key={r} selected={draft.ratingMin === r} onClick={() => set("ratingMin", draft.ratingMin === r ? null : r)}>
              <Icon name="star" size={15} className="text-star" />
              {String(r).replace(".", ",")}+
            </Chip>
          ))}
        </div>
      </Section>
    </Sheet>
  );
}
