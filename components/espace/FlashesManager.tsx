"use client";

import clsx from "clsx";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Picture } from "@/components/ui/Picture";
import { FLASH_PRICE_MAX, FLASH_PRICE_MIN, FLASH_SIZE_LABEL, FLASH_STATUS_LABEL, type Flash, type FlashStatus } from "@/lib/flashes";
import type { TattooSize } from "@/lib/store/model";
import { STYLES, styleLabel } from "@/lib/styles";
import type { StyleSlug } from "@/lib/types";
import { shrink } from "./PhotosManager";

const STATUS_ORDER: FlashStatus[] = ["available", "reserved", "done"];
const field = "mt-1 h-12 w-full rounded-xl border border-border bg-surface px-3 text-[15px]";

/** Flashs du tatoueur : ajout (dessin + prix fixe), statut disponible / réservé / déjà tatoué, suppression. */
export function FlashesManager({ initial, styles, published }: { initial: Flash[]; styles: StyleSlug[]; published: boolean }) {
  const [flashes, setFlashes] = useState<Flash[]>(initial);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [size, setSize] = useState<TattooSize>("small");
  const [style, setStyle] = useState<StyleSlug>(styles[0] ?? "fine-line");
  const [unique, setUnique] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const styleOptions = [...styles, ...STYLES.map((s) => s.slug).filter((s) => !styles.includes(s))];

  function pick(f: File | null) {
    setFile(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return f ? URL.createObjectURL(f) : null;
    });
  }

  function reset() {
    pick(null);
    setTitle("");
    setPrice("");
    setSize("small");
    setUnique(true);
    if (input.current) input.current.value = "";
  }

  async function call(key: string, run: () => Promise<Response>) {
    setBusy(key);
    setError(null);
    try {
      const res = await run();
      const data = (await res.json().catch(() => ({}))) as { flashes?: Flash[]; error?: string };
      if (!res.ok || !data.flashes) throw new Error(data.error ?? "Action impossible. Réessaie.");
      setFlashes(data.flashes);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function add() {
    if (!file) return setError("Choisis le dessin de ton flash.");
    const body = new FormData();
    body.append("file", await shrink(file), file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg");
    body.append("title", title);
    body.append("price", price);
    body.append("size", size);
    body.append("style", style);
    body.append("unique", unique ? "true" : "false");
    if (await call("add", () => fetch("/api/compte/flashs", { method: "POST", body }))) {
      reset();
      setOpen(false);
    }
  }

  const setStatus = (id: string, status: FlashStatus) =>
    call(id, () => fetch("/api/compte/flashs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }));

  const remove = (id: string) => {
    if (!window.confirm("Supprimer ce flash ?")) return;
    void call(id, () => fetch(`/api/compte/flashs?id=${encodeURIComponent(id)}`, { method: "DELETE" }));
  };

  const available = flashes.filter((f) => f.status === "available").length;

  return (
    <div className="space-y-4">
      <p className="text-[15px] text-muted">
        Tes dessins prêts à tatouer, à prix fixe. Les clients les voient sur ton profil{published ? "" : " dès qu'il est en ligne"} et te les demandent en un
        clic. Passe un flash en « Réservé » quand un client l&apos;a pris, puis « Déjà tatoué » pour une pièce unique : il disparaît du profil.
      </p>

      {!open ? (
        <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
          <Icon name="plus" size={20} /> Ajouter un flash
        </Button>
      ) : (
        <div className="space-y-3 rounded-2xl bg-surface p-4 shadow-card">
          <input ref={input} id="flash-image" type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          <label htmlFor="flash-image" className="tap flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border p-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- aperçu local avant envoi
              <img src={preview} alt="" className="size-16 rounded-lg object-cover" />
            ) : (
              <span className="inline-flex size-16 items-center justify-center rounded-lg bg-surface-2 text-muted">
                <Icon name="image" size={26} />
              </span>
            )}
            <span className="text-[15px] font-medium">{preview ? "Changer le dessin" : "Choisir le dessin (photo ou scan)"}</span>
          </label>
          <label className="block text-sm font-medium">
            Nom du flash
            <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 60))} placeholder="Ex. : Hirondelle, Rose ouverte…" className={field} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Prix (€)
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder="120"
                className={field}
              />
            </label>
            <label className="block text-sm font-medium">
              Taille
              <select value={size} onChange={(e) => setSize(e.target.value as TattooSize)} className={field}>
                {(Object.keys(FLASH_SIZE_LABEL) as TattooSize[]).map((s) => (
                  <option key={s} value={s}>
                    {FLASH_SIZE_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium">
            Style
            <select value={style} onChange={(e) => setStyle(e.target.value as StyleSlug)} className={field}>
              {styleOptions.map((s) => (
                <option key={s} value={s}>
                  {styleLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-12 items-center gap-3 text-[15px]">
            <input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} className="size-5" />
            <span>
              <span className="block font-medium">Pièce unique</span>
              <span className="block text-sm text-muted">Tatouée une seule fois (« one shot »)</span>
            </span>
          </label>
          <p className="text-xs text-muted">
            Prix entre {FLASH_PRICE_MIN} et {FLASH_PRICE_MAX} €.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                reset();
                setOpen(false);
              }}
            >
              Annuler
            </Button>
            <Button disabled={busy === "add" || !file || title.trim().length < 2 || !price} onClick={add}>
              {busy === "add" ? "Envoi…" : "Ajouter"}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}

      {flashes.length > 0 && (
        <>
          <p className="text-sm text-muted">
            {flashes.length} flash{flashes.length > 1 ? "s" : ""}, dont {available} disponible{available > 1 ? "s" : ""}.
          </p>
          <ul className="space-y-3">
            {flashes.map((f) => (
              <li key={f.id} className={clsx("flex gap-3 rounded-2xl bg-surface p-3 shadow-card", f.status === "done" && "opacity-60")}>
                <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  <Picture image={f.image} usage="list" fill sizes="96px" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold">{f.title}</p>
                    <button type="button" onClick={() => remove(f.id)} disabled={busy === f.id} aria-label={`Supprimer le flash ${f.title}`} className="tap -mt-1 -mr-1 p-1 text-muted">
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                  <p className="text-sm text-muted">
                    {f.price} € · {FLASH_SIZE_LABEL[f.size].split(" (")[0]}
                    {f.unique ? " · Pièce unique" : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Statut">
                    {STATUS_ORDER.map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={f.status === s}
                        disabled={busy === f.id}
                        onClick={() => f.status !== s && void setStatus(f.id, s)}
                        className={clsx(
                          "tap h-8 rounded-full px-3 text-xs font-semibold",
                          f.status === s ? (s === "available" ? "bg-success text-white" : "bg-fg text-bg") : "border border-border bg-surface",
                        )}
                      >
                        {FLASH_STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
