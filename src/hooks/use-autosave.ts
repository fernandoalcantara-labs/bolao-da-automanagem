"use client";

import * as React from "react";

export type AutosaveStatus =
  | "idle"      // sem mudanca pendente
  | "dirty"     // mudou local, debounce rodando
  | "saving"    // salvando no servidor
  | "saved"     // tudo sincronizado
  | "error"     // erro no save remoto (dados estao em localStorage)
  | "offline";  // navigator.onLine = false

type UseAutosaveOpts<T> = {
  /** Chave no localStorage. Inclua user_id pra evitar bagunça entre contas. */
  storageKey: string;
  /** Estado atual — qualquer mudança aciona autosave. */
  state: T;
  /** Função que faz o save remoto. Retorna promessa. */
  saveRemote: (state: T) => Promise<void>;
  /** Se false, autosave fica desligado (ex: form fechado pra edição). */
  enabled?: boolean;
  /** Debounce do save remoto. localStorage é sempre imediato. */
  debounceMs?: number;
};

/**
 * Hook de autosave com cache local + debounce no save remoto.
 *
 * Comportamento:
 *  - Toda mudança em `state` salva no localStorage IMEDIATAMENTE
 *  - Após debounceMs sem mudança, tenta salvar no servidor
 *  - Se servidor falhar, mantém status "error" mas cache local ta seguro
 *  - Se navegador offline, status "offline" — re-tenta quando voltar
 *
 * NÃO faz reconciliação automática com o servidor — pra isso, hidrate
 * `state` no mount lendo localStorage (helper `lerCachePalpites`).
 */
export function useAutosave<T>({
  storageKey,
  state,
  saveRemote,
  enabled = true,
  debounceMs = 800,
}: UseAutosaveOpts<T>): {
  status: AutosaveStatus;
  forceSave: () => Promise<void>;
} {
  const [status, setStatus] = React.useState<AutosaveStatus>("idle");
  const lastSavedRef = React.useRef<string>("");
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const saveRemoteRef = React.useRef(saveRemote);
  saveRemoteRef.current = saveRemote;

  // Inicializa a referência do "último salvo" pro state inicial NÃO
  // disparar save no primeiro render
  const hidratadoRef = React.useRef(false);
  if (!hidratadoRef.current) {
    lastSavedRef.current = JSON.stringify(state);
    hidratadoRef.current = true;
  }

  const doRemoteSave = React.useCallback(async () => {
    const snapshot = stateRef.current;
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSavedRef.current) {
      setStatus("idle");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline");
      return;
    }
    setStatus("saving");
    try {
      await saveRemoteRef.current(snapshot);
      lastSavedRef.current = serialized;
      setStatus("saved");
      // Volta pra idle depois de 2.5s pro user ver o feedback
      setTimeout(() => {
        setStatus((cur) => (cur === "saved" ? "idle" : cur));
      }, 2500);
    } catch (e) {
      console.warn("[useAutosave] save remoto falhou", e);
      setStatus("error");
    }
  }, []);

  // Detecta mudança em `state` e dispara o ciclo
  React.useEffect(() => {
    if (!enabled) return;
    const serialized = JSON.stringify(state);
    if (serialized === lastSavedRef.current) return;

    // localStorage IMEDIATO (não-bloqueante mas síncrono)
    try {
      window.localStorage.setItem(storageKey, serialized);
    } catch {
      // quota cheia, modo privado, etc — ignora
    }
    setStatus("dirty");

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(doRemoteSave, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state, enabled, debounceMs, storageKey, doRemoteSave]);

  // Re-tenta quando voltar online
  React.useEffect(() => {
    function onOnline() {
      if (status === "offline" || status === "error") doRemoteSave();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [status, doRemoteSave]);

  return { status, forceSave: doRemoteSave };
}

/**
 * Lê o cache local de palpites. Use no useState initializer pra
 * hidratar antes do server-side data (evita "flash de tela vazia").
 *
 * Retorna null se cache vazio/corrompido — caller deve cair no default.
 */
export function lerCachePalpites<T>(storageKey: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Limpa todas as chaves de palpite do localStorage (chame no logout). */
export function limparCachePalpites(): void {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith("bolao:palpites:")) keys.push(k);
  }
  for (const k of keys) window.localStorage.removeItem(k);
}
