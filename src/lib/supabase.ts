import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState, useCallback } from 'react';
import type { Sexo } from './sorteio';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configurado = Boolean(url && key);
export const supabase: SupabaseClient = configurado
  ? createClient(url!, key!)
  : (null as unknown as SupabaseClient);

export type Status = 'inscricoes' | 'em_andamento' | 'encerrado';
export interface Torneio {
  id: string;
  organizador_id: string;
  nome: string;
  data: string;
  jogos_por_pessoa: number;
  games_por_set: 4 | 6;
  quadras: 1 | 2;
  status: Status;
  codigo: string;
}
export interface Participante {
  id: string;
  torneio_id: string;
  nome: string;
  sexo: Sexo;
}
export interface Jogo {
  id: string;
  torneio_id: string;
  ordem: number;
  rodada: number;
  quadra: number;
  a1: string;
  a2: string;
  b1: string;
  b2: string;
  games_a: number | null;
  games_b: number | null;
  status: 'pendente' | 'em_andamento' | 'finalizado';
}

export interface DadosTorneio {
  torneio: Torneio | null;
  participantes: Participante[];
  jogos: Jogo[];
  carregando: boolean;
  erro: string | null;
  aoVivo: boolean;
  recarregar: () => Promise<void>;
}

/**
 * Carrega um torneio (por id ou pelo código do link) com participantes e jogos,
 * e recarrega sozinho sempre que algo muda no banco (Supabase Realtime).
 */
export function useTorneio(busca: { id?: string; codigo?: string }): DadosTorneio {
  const [torneio, setTorneio] = useState<Torneio | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aoVivo, setAoVivo] = useState(false);

  const recarregar = useCallback(async () => {
    const q = supabase.from('torneios').select('*');
    const { data: t, error } = await (busca.id ? q.eq('id', busca.id) : q.eq('codigo', busca.codigo ?? '')).maybeSingle();
    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }
    if (!t) {
      setErro('Torneio não encontrado.');
      setCarregando(false);
      return;
    }
    const [p, j] = await Promise.all([
      supabase.from('participantes').select('*').eq('torneio_id', t.id).order('nome'),
      supabase.from('jogos').select('*').eq('torneio_id', t.id).order('ordem'),
    ]);
    setTorneio(t as Torneio);
    setParticipantes((p.data ?? []) as Participante[]);
    setJogos((j.data ?? []) as Jogo[]);
    setErro(p.error?.message ?? j.error?.message ?? null);
    setCarregando(false);
  }, [busca.id, busca.codigo]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const tid = torneio?.id;
  useEffect(() => {
    if (!tid) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Junta várias mudanças seguidas (ex.: gerar 14 jogos) numa recarga só.
    const agendar = () => {
      clearTimeout(timer);
      timer = setTimeout(recarregar, 150);
    };
    const canal = supabase
      .channel(`torneio-${tid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jogos', filter: `torneio_id=eq.${tid}` }, agendar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participantes', filter: `torneio_id=eq.${tid}` }, agendar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'torneios', filter: `id=eq.${tid}` }, agendar)
      .subscribe((s) => setAoVivo(s === 'SUBSCRIBED'));
    // Ao voltar para a aba (celular bloqueado, por ex.), garante dados frescos.
    const visivel = () => document.visibilityState === 'visible' && recarregar();
    document.addEventListener('visibilitychange', visivel);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visivel);
      supabase.removeChannel(canal);
    };
  }, [tid, recarregar]);

  return { torneio, participantes, jogos, carregando, erro, aoVivo, recarregar };
}
