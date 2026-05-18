"use client";

import confetti from "canvas-confetti";

const GOLD_COLORS = ["#FFD60A", "#FF9F1C", "#FFE876"];
const BRASIL_COLORS = ["#009C3B", "#FFD60A", "#FFFFFF", "#002776"];

/**
 * Confete pequeno (5-6 partículas) — para ações cotidianas tipo salvar.
 */
export function miniConfetti(origin?: { x: number; y: number }) {
  if (typeof window === "undefined") return;
  confetti({
    particleCount: 12,
    spread: 60,
    startVelocity: 30,
    decay: 0.92,
    gravity: 0.9,
    colors: GOLD_COLORS,
    origin: origin ?? { x: 0.5, y: 0.7 },
    disableForReducedMotion: true,
  });
}

/**
 * Confete grande estilo "vitória" — pra eventos especiais (virou líder, etc).
 */
export function bigConfetti() {
  if (typeof window === "undefined") return;
  const duration = 1500;
  const end = Date.now() + duration;
  function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: BRASIL_COLORS,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: BRASIL_COLORS,
      disableForReducedMotion: true,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  }
  frame();
}

/**
 * Marca "evento já mostrado" no localStorage — evita repetir confete
 * a cada navegação.
 */
export function celebrarUmaVez(chave: string, fn: () => void) {
  if (typeof window === "undefined") return;
  const hoje = new Date().toISOString().slice(0, 10);
  const k = `celebrou:${chave}:${hoje}`;
  if (window.localStorage.getItem(k)) return;
  window.localStorage.setItem(k, "1");
  fn();
}
