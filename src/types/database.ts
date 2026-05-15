// Tipagens da estrutura do banco — em formato compatível com supabase-js v2.x.
// Para regenerar a partir do Supabase real:
//   npx supabase gen types typescript --project-id SEU_PROJECT_ID > src/types/database.ts

export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];

export type Grupo = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";
export type FaseJogo = "grupos" | "16avos" | "8avos" | "quartas" | "semi" | "3lugar" | "final";
export type FasePalpiteMata = "16avos" | "8avos" | "quartas" | "semi" | "final" | "campeao";
export type StatusJogo = "agendado" | "andamento" | "finalizado";
export type Role = "admin" | "user";

export interface PontuacaoConfig {
  placar_exato: number;
  vencedor_ou_empate: number;
  mata_16avos: number;
  mata_8avos: number;
  mata_quartas: number;
  mata_semi: number;
  vice: number;
  campeao: number;
  artilheiro: number;
}

export interface RateioConfig {
  primeiro: number;
  segundo: number;
  terceiro: number;
  artilheiro: number;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          nome: string;
          email: string;
          telefone: string | null;
          role: Role;
          pago: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          nome: string;
          email: string;
          telefone?: string | null;
          role?: Role;
          pago?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          email?: string;
          telefone?: string | null;
          role?: Role;
          pago?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          nome: string;
          codigo_fifa: string;
          bandeira_url: string;
          grupo: Grupo;
          tbd: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          codigo_fifa: string;
          bandeira_url: string;
          grupo: Grupo;
          tbd?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          codigo_fifa?: string;
          bandeira_url?: string;
          grupo?: Grupo;
          tbd?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          nome: string;
          time_id: string | null;
          gols_torneio: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          time_id?: string | null;
          gols_torneio?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          time_id?: string | null;
          gols_torneio?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          fase: FaseJogo;
          rodada: number | null;
          grupo: Grupo | null;
          time_casa_id: string | null;
          time_fora_id: string | null;
          placar_casa: number | null;
          placar_fora: number | null;
          data_hora: string;
          status: StatusJogo;
          api_match_id: string | null;
          editado_manualmente: boolean;
          ordem: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fase: FaseJogo;
          rodada?: number | null;
          grupo?: Grupo | null;
          time_casa_id?: string | null;
          time_fora_id?: string | null;
          placar_casa?: number | null;
          placar_fora?: number | null;
          data_hora: string;
          status?: StatusJogo;
          api_match_id?: string | null;
          editado_manualmente?: boolean;
          ordem?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          fase?: FaseJogo;
          rodada?: number | null;
          grupo?: Grupo | null;
          time_casa_id?: string | null;
          time_fora_id?: string | null;
          placar_casa?: number | null;
          placar_fora?: number | null;
          data_hora?: string;
          status?: StatusJogo;
          api_match_id?: string | null;
          editado_manualmente?: boolean;
          ordem?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      palpites_grupos: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          placar_casa: number;
          placar_fora: number;
          pontos_calculados: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id: string;
          placar_casa: number;
          placar_fora: number;
          pontos_calculados?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          match_id?: string;
          placar_casa?: number;
          placar_fora?: number;
          pontos_calculados?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      palpites_mata: {
        Row: {
          id: string;
          user_id: string;
          time_id: string;
          fase: FasePalpiteMata;
          acertou: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          time_id: string;
          fase: FasePalpiteMata;
          acertou?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          time_id?: string;
          fase?: FasePalpiteMata;
          acertou?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      palpites_artilheiro: {
        Row: {
          id: string;
          user_id: string;
          player_id: string;
          acertou: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          player_id: string;
          acertou?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          player_id?: string;
          acertou?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      config: {
        Row: { chave: string; valor: Json; updated_at: string };
        Insert: { chave: string; valor: Json; updated_at?: string };
        Update: { chave?: string; valor?: Json; updated_at?: string };
        Relationships: [];
      };
      ranking_snapshots: {
        Row: {
          id: string;
          user_id: string;
          rodada_label: string;
          rodada_ordem: number;
          posicao: number;
          pontos_totais: number;
          pontos_rodada: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          rodada_label: string;
          rodada_ordem: number;
          posicao: number;
          pontos_totais: number;
          pontos_rodada: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          rodada_label?: string;
          rodada_ordem?: number;
          posicao?: number;
          pontos_totais?: number;
          pontos_rodada?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [k: string]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      deadline_grupos_passou: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { [k: string]: never };
    CompositeTypes: { [k: string]: never };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
