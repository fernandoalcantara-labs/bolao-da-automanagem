/**
 * Microcopy festiva centralizada — substitui textos sérios por versões
 * brasileiras alegres. Use sempre por aqui pra facilitar tradução/ajuste.
 */

export const MICROCOPY = {
  // Ações
  salvarPalpites: "Mandar bala! ⚽",
  salvarMataMata: "Fechou! Salvar 🔥",
  salvarArtilheiro: "Esse vai marcar! 🎯",
  salvarConfig: "Tá no jeito! 💾",
  sair: "Até a próxima! 👋",
  entrar: "Bora pro bolão! ⚽",
  cadastrar: "Tô dentro! 🎉",
  copiar: "Copiar PIX 📋",
  compartilhar: "Compartilhar 📤",

  // Estados
  loading: "Aguenta aí, tô preparando o jogo... ⚽",
  loadingShort: "Carregando…",
  vazioPalpites: "Cadê os palpites? 🤔 Bora chutar uns placares!",
  vazioRanking: "Ainda sem ranking 🏆 Quando a Copa começar, aparece aqui!",
  vazioJogos: "Sem jogos por aqui 🤷",

  // Status
  pago: "Tá pago! 💚",
  pendente: "Falta o PIX! 💸",
  acertou: "Mitou! 🔥",
  errou: "Foi de bobeira 😅",
  empate: "Empatou 😶",

  // Pódio
  lider1Pessoa: "Tá voando! 👑",
  liderEmpate: "Tá brigando pelo topo! 👑",
  segundo: "Quase lá! 🥈",
  terceiro: "No pódio! 🥉",
  lanterninha: "Tá tenso aí 😅 mas ainda dá pra virar!",

  // Toasts de sucesso
  toastPalpitesSalvos: (n: number) => ({
    title: `Mitou! ${n} palpite(s) salvos 🔥`,
    description: "Já tá rodando no servidor.",
  }),
  toastMataMataSalvo: {
    title: "Bracket salvo! 🏆",
    description: "Boa sorte aí craque!",
  },
  toastArtilheiroSalvo: {
    title: "Tá feito! ⚽",
    description: "Bom palpite pro artilheiro.",
  },
  toastLogoutFeito: {
    title: "Até a próxima, craque! 👋",
  },
  toastLoginFeito: {
    title: "Bem-vindo de volta! 🎉",
  },
  toastCadastroFeito: {
    title: "Bora pro bolão! 🎉",
    description: "Cadastro feito. Agora só pagar o PIX.",
  },

  // Toasts de erro
  toastErroGenerico: "Eita, deu ruim aqui 😬 Tenta de novo?",
  toastSessaoExpirada: "Sessão expirou 😴 Loga de novo.",

  // Headers / títulos
  bolaoHeader: "🇧🇷 Vamo que vamo! Copa 2026",
  painelTagline: "Ranking ao vivo · gráficos · prêmios",
};
