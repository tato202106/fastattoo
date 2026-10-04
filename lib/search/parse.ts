/**
 * Recherche intelligente (SPEC §11) : comprend une saisie libre comme
 * « Fine Line Nantes », « tatoueur blackwork » ou « Léa Ink ».
 *
 * Fonction pure : elle reçoit les noms connus (tatoueurs/studios) pour pouvoir
 * reconnaître un nom même avec des fautes de frappe légères.
 */
import { CITIES } from "../cities";
import { STYLES } from "../styles";
import { levenshtein, normalize } from "../text";
import type { ParsedQuery, StyleSlug } from "../types";

/** Mots qui désignent une catégorie (ignorés comme texte libre). */
const CATEGORY_WORDS: Record<string, string> = {
  tatoueur: "artist",
  tatoueuse: "artist",
  tatoueurs: "artist",
  tatoueuses: "artist",
  tattoo: "artist",
  tatouage: "artist",
  tatouages: "artist",
  tatoo: "artist",
  artiste: "artist",
  artistes: "artist",
  studio: "studio",
  salon: "studio",
};

const STOP_WORDS = new Set(["a", "au", "aux", "de", "des", "du", "en", "et", "la", "le", "les", "pres", "sur", "un", "une", "style", "pour", "vers", "autour", "moi"]);

interface Phrase {
  tokens: string[];
  apply: (q: ParsedQuery) => void;
}

function buildPhrases(): Phrase[] {
  const phrases: Phrase[] = [];
  for (const city of CITIES) {
    for (const alias of city.aliases) {
      phrases.push({
        tokens: alias.split(" "),
        apply: (q) => {
          if (!q.city) q.city = { slug: city.slug, name: city.name, lat: city.lat, lng: city.lng };
        },
      });
    }
  }
  for (const style of STYLES) {
    for (const syn of style.synonyms) {
      phrases.push({
        tokens: syn.split(" "),
        apply: (q) => {
          if (!q.styles.includes(style.slug)) q.styles.push(style.slug);
        },
      });
    }
  }
  // Les expressions les plus longues d'abord (« fine line » avant « line »).
  return phrases.sort((a, b) => b.tokens.length - a.tokens.length);
}

const PHRASES = buildPhrases();

/** Un mot proche d'un style/ville connu (faute de frappe) ? Tolérance selon la longueur. */
function fuzzyEquals(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5) return false;
  return levenshtein(a, b, 2) <= (b.length >= 8 ? 2 : 1);
}

export function parseQuery(raw: string, knownNames: string[] = []): ParsedQuery {
  const result: ParsedQuery = { raw, city: null, styles: [], text: "", categories: [] };
  const tokens = normalize(raw).split(" ").filter(Boolean);
  if (tokens.length === 0) return result;

  // Si toute la saisie correspond à un nom connu, on ne la découpe pas
  // (« Léa Ink » ne doit pas devenir « ink » = style).
  const normalizedNames = knownNames.map(normalize);
  const whole = tokens.join(" ");
  const exactName = normalizedNames.find((n) => n === whole || (whole.length >= 4 && n.startsWith(whole)));
  if (exactName) {
    result.text = whole;
    return result;
  }

  const consumed = new Array<boolean>(tokens.length).fill(false);
  const nameParts: string[] = [];

  // 1. Un nom connu complet dans la saisie (« Malo Noir Nantes ») est réservé
  //    avant la détection des styles, sinon « noir » deviendrait « Blackwork ».
  for (const name of normalizedNames) {
    const nameTokens = name.split(" ");
    if (nameTokens.length < 2) continue;
    for (let i = 0; i + nameTokens.length <= tokens.length; i++) {
      if (consumed.slice(i, i + nameTokens.length).some(Boolean)) continue;
      if (tokens.slice(i, i + nameTokens.length).join(" ") === name) {
        nameParts.push(name);
        for (let k = i; k < i + nameTokens.length; k++) consumed[k] = true;
      }
    }
  }

  // 2. Villes et styles (expressions multi-mots d'abord, tolérance aux fautes).
  for (const phrase of PHRASES) {
    const n = phrase.tokens.length;
    for (let i = 0; i + n <= tokens.length; i++) {
      if (consumed.slice(i, i + n).some(Boolean)) continue;
      const window = tokens.slice(i, i + n);
      const matches = n === 1 ? fuzzyEquals(window[0]!, phrase.tokens[0]!) : window.join(" ") === phrase.tokens.join(" ");
      if (matches) {
        phrase.apply(result);
        for (let k = i; k < i + n; k++) consumed[k] = true;
      }
    }
  }

  const rest: string[] = [];
  tokens.forEach((t, i) => {
    if (consumed[i]) return;
    const category = CATEGORY_WORDS[t];
    if (category) {
      if (!result.categories.includes(category)) result.categories.push(category);
      return;
    }
    if (STOP_WORDS.has(t)) return;
    rest.push(t);
  });
  result.text = [...nameParts, ...rest].join(" ");
  return result;
}

/** Score de correspondance texte ↔ nom (0 = aucune). Utilisé pour filtrer et classer. */
export function nameScore(text: string, name: string, studio = ""): number {
  const t = normalize(text);
  if (!t) return 0;
  const n = normalize(name);
  const s = normalize(studio);
  if (n === t) return 100;
  if (n.startsWith(t)) return 80;
  if (n.split(" ").some((w) => w.startsWith(t))) return 60;
  if (s && (s === t || s.startsWith(t) || s.split(" ").some((w) => w.startsWith(t)))) return 50;
  if (n.includes(t)) return 40;
  const words = t.split(" ");
  const nameWords = [...n.split(" "), ...s.split(" ")];
  const fuzzy = words.every((w) => w.length >= 3 && nameWords.some((nw) => levenshtein(w, nw, 2) <= (w.length > 5 ? 2 : 1)));
  return fuzzy ? 25 : 0;
}

export function describeParsed(q: ParsedQuery, styleLabelFn: (s: StyleSlug) => string): string[] {
  const chips: string[] = [];
  if (q.city) chips.push(`📍 ${q.city.name}`);
  for (const s of q.styles) chips.push(styleLabelFn(s));
  if (q.text) chips.push(`« ${q.text} »`);
  return chips;
}
