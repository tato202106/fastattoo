"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { describeParsed, parseQuery } from "@/lib/search/parse";
import { FEATURED_STYLES, styleLabel } from "@/lib/styles";
import type { Suggestion } from "@/lib/types";

const RECENT_KEY = "fastattoo-recent-searches";

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}
function saveRecent(q: string) {
  try {
    const next = [q, ...readRecent().filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // stockage indisponible (navigation privée) : on ignore
  }
}

export type SearchAction = { type: "query"; q: string } | { type: "artist"; slug: string } | { type: "nearby" };

/**
 * Recherche plein écran (SPEC §11) : un seul champ « Ville, style ou tatoueur »,
 * suggestions instantanées et aperçu de ce que la recherche a compris.
 */
export function SearchOverlay({ open, initialQuery = "", onClose, onAction }: { open: boolean; initialQuery?: string; onClose: () => void; onAction: (a: SearchAction) => void }) {
  const [q, setQ] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- réinitialisation à l'ouverture */
    setQ(initialQuery);
    setRecent(readRecent());
    /* eslint-enable react-hooks/set-state-in-effect */
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, initialQuery, onClose]);

  useEffect(() => {
    const term = q.trim();
    if (!open || term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/artists/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json() as Promise<{ suggestions: Suggestion[] }>)
        .then((d) => setSuggestions(d.suggestions))
        .catch(() => {});
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open]);

  const chips = useMemo(() => describeParsed(parseQuery(q), styleLabel), [q]);
  // Les suggestions ne s'affichent qu'à partir de 2 caractères (pas de reset dans un effet).
  const visibleSuggestions = q.trim().length >= 2 ? suggestions : [];

  if (!open) return null;

  const submit = (value: string) => {
    const term = value.trim();
    if (term) saveRecent(term);
    onAction({ type: "query", q: term });
  };

  return createPortal(
    <div className="animate-fade-in fixed inset-0 z-50 flex flex-col bg-bg pt-safe" role="dialog" aria-modal="true" aria-label="Rechercher">
      <form
        role="search"
        className="flex items-center gap-2 border-b border-border px-2 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
      >
        <button type="button" onClick={onClose} aria-label="Retour" className="tap inline-flex size-11 items-center justify-center rounded-full">
          <Icon name="back" size={22} />
        </button>
        <label className="flex h-12 flex-1 items-center gap-2 rounded-2xl bg-surface-2 px-3">
          <Icon name="search" size={20} className="text-muted" />
          <span className="sr-only">Ville, style ou tatoueur</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ville, style ou tatoueur"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Effacer" className="inline-flex size-8 items-center justify-center rounded-full text-muted">
              <Icon name="close" size={18} />
            </button>
          )}
        </label>
      </form>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(24px+var(--safe-bottom))]">
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-3" aria-live="polite">
            <span className="text-xs text-muted">Recherche :</span>
            {chips.map((c) => (
              <span key={c} className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                {c}
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => onAction({ type: "nearby" })}
          className="tap mt-3 flex min-h-14 w-full items-center gap-3 rounded-2xl px-1 text-left"
        >
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="locate" size={22} />
          </span>
          <span>
            <span className="block font-semibold">Autour de moi</span>
            <span className="block text-sm text-muted">Utiliser ma position</span>
          </span>
        </button>

        {visibleSuggestions.length > 0 && (
          <ul className="mt-2" aria-label="Suggestions">
            {visibleSuggestions.map((s) => (
              <li key={`${s.type}-${s.slug}`}>
                <button
                  type="button"
                  className="tap flex min-h-14 w-full items-center gap-3 rounded-2xl px-1 text-left"
                  onClick={() => {
                    if (s.type === "artist") {
                      saveRecent(s.label);
                      onAction({ type: "artist", slug: s.slug });
                    } else {
                      // On combine avec ce qui a déjà été compris (ex. « fine line » + « Nantes »).
                      const parsed = parseQuery(q);
                      const parts = new Set<string>();
                      if (s.type === "city") {
                        parsed.styles.forEach((st) => parts.add(styleLabel(st)));
                        parts.add(s.label);
                      } else {
                        parts.add(s.label);
                        if (parsed.city) parts.add(parsed.city.name);
                      }
                      submit([...parts].join(" "));
                    }
                  }}
                >
                  {s.type === "artist" ? (
                    <Avatar image={s.avatar} size={44} />
                  ) : (
                    <span className="inline-flex size-11 items-center justify-center rounded-full bg-surface-2 text-muted">
                      <Icon name={s.type === "city" ? "pin" : "sparkle"} size={20} />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{s.label}</span>
                    <span className="block truncate text-sm text-muted">{s.sublabel}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {visibleSuggestions.length === 0 && recent.length > 0 && (
          <section className="mt-4">
            <h2 className="mb-1 text-sm font-semibold text-muted">Recherches récentes</h2>
            <ul>
              {recent.map((r) => (
                <li key={r}>
                  <button type="button" onClick={() => submit(r)} className="tap flex min-h-12 w-full items-center gap-3 px-1 text-left">
                    <Icon name="clock" size={20} className="text-muted" />
                    <span className="truncate">{r}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {visibleSuggestions.length === 0 && (
          <section className="mt-4">
            <h2 className="mb-2 text-sm font-semibold text-muted">Styles populaires</h2>
            <div className="flex flex-wrap gap-2">
              {FEATURED_STYLES.map((s) => (
                <button key={s.slug} type="button" onClick={() => submit(s.label)} className="tap h-11 rounded-full border border-border bg-surface px-4 text-sm font-medium">
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-5 text-sm text-muted">
              Astuce : tape par exemple <strong className="text-fg">Fine Line Nantes</strong>, <strong className="text-fg">tatoueur blackwork</strong> ou un nom comme{" "}
              <strong className="text-fg">Léa Ink</strong>.
            </p>
          </section>
        )}
      </div>
    </div>,
    document.body,
  );
}
