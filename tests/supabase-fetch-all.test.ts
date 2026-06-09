import { describe, it, expect } from "vitest";
import { fetchAll } from "../src/lib/supabase-fetch-all";

// Mock mínimo do builder do supabase-js: .from().select().order().range(from,to)
// devolve a fatia [from, to] do array. range é o ponto que "resolve" a query.
function mockSupabase(rows: any[]) {
  let rangeCalls = 0;
  const builder: any = {
    from: () => builder,
    select: () => builder,
    order: () => builder,
    range: (from: number, to: number) => {
      rangeCalls++;
      return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
    },
    get rangeCalls() {
      return rangeCalls;
    },
  };
  return builder;
}

describe("fetchAll — paginação além do cap de 1000 do PostgREST", () => {
  it("junta TODAS as linhas quando passam de 1000 (2500 → 3 páginas)", async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => ({ id: i }));
    const sb = mockSupabase(rows);
    const out = await fetchAll<{ id: number }>(sb, "t", "id");
    expect(out.length).toBe(2500);
    expect(out[0].id).toBe(0);
    expect(out[2499].id).toBe(2499);
    expect(sb.rangeCalls).toBe(3); // 1000 + 1000 + 500
  });

  it("uma página parcial (<1000) encerra na primeira chamada", async () => {
    const rows = Array.from({ length: 593 }, (_, i) => ({ id: i }));
    const sb = mockSupabase(rows);
    const out = await fetchAll(sb, "t", "id");
    expect(out.length).toBe(593);
    expect(sb.rangeCalls).toBe(1);
  });

  it("exatamente 1000 → busca 2ª página (vazia) e para sem duplicar", async () => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
    const sb = mockSupabase(rows);
    const out = await fetchAll(sb, "t", "id");
    expect(out.length).toBe(1000);
    expect(sb.rangeCalls).toBe(2); // 1000 cheios → tenta a 2ª, vem vazia
  });

  it("tabela vazia → []", async () => {
    const sb = mockSupabase([]);
    const out = await fetchAll(sb, "t", "id");
    expect(out).toEqual([]);
  });

  it("propaga erro do PostgREST (não engole)", async () => {
    const sb: any = {
      from: () => sb,
      select: () => sb,
      order: () => sb,
      range: () => Promise.resolve({ data: null, error: new Error("boom") }),
    };
    await expect(fetchAll(sb, "t", "id")).rejects.toThrow("boom");
  });
});
