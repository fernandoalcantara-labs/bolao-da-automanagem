/**
 * Agrupamento de contagem pros pie charts (campeão/artilheiro).
 * Extraído de pies.tsx pra ser testável (item 53).
 *
 * Ignora entradas com id/nome nulo, vazio ou "null"/"undefined" (lixo de
 * palpite órfão) — não viram fatia "null (1)" no donut.
 */
export function agruparPorContagem<T extends string>(
  ids: T[],
  nomes: Record<T, string>,
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const id of ids) {
    if (id == null || String(id).trim() === "") continue;
    const bruto = nomes[id];
    const nome = (bruto ?? "").trim();
    if (nome === "" || nome.toLowerCase() === "null" || nome.toLowerCase() === "undefined") continue;
    map.set(nome, (map.get(nome) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
