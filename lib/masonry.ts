/**
 * Répartit des éléments (de ratio connu) en N colonnes équilibrées, en
 * conservant l'ordre de lecture gauche → droite. Calcul déterministe, donc
 * identique côté serveur et client (pas de saut à l'hydratation).
 */
export function splitMasonry<T extends { width: number; height: number }>(items: T[], columns: number): { item: T; index: number }[][] {
  const cols: { item: T; index: number }[][] = Array.from({ length: columns }, () => []);
  const heights = new Array<number>(columns).fill(0);
  items.forEach((item, index) => {
    let target = 0;
    for (let c = 1; c < columns; c++) if (heights[c]! < heights[target]! - 0.01) target = c;
    cols[target]!.push({ item, index });
    heights[target]! += item.height / item.width;
  });
  return cols;
}
