/**
 * AdminNotificacoes.tsx
 * Coloque em: src/pages/admin/AdminNotificacoes.tsx
 *
 * Permite ao admin enviar notificações push para:
 *  - Todos os clientes do provedor
 *  - Clientes de bairros específicos
 *  - Um cliente específico (por nome/CPF)
 *
 * O envio real é feito via rota POST /api/notificacoes/enviar no server.ts
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Input, cn } from '../../components/UI';
import {
  Bell, Send, Users, MapPin, User, CheckCircle,
  AlertCircle, Loader2, Clock, Megaphone, Wrench,
  DollarSign, ChevronRight,
} from 'lucide-react';
import { getDocs, orderBy, query } from 'firebase/firestore';
import { Col } from '../../lib/tenant';
import { auth } from '../../lib/firebase';
import type { Notificacao, NotificacaoAlvo, NotificacaoTipo } from '../../types';

// ── Helpers ──────────────────────────────────────────────────────
async function authHeader() {
  const token = await auth.currentUser?.getIdToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

const tipoConfig: Record<NotificacaoTipo, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  manutencao: { label: 'Manutenção',  icon: Wrench,     color: 'text-amber-600',  bg: 'bg-amber-50'  },
  financeiro: { label: 'Financeiro',  icon: DollarSign, color: 'text-blue-600',   bg: 'bg-blue-50'   },
  aviso:      { label: 'Aviso Geral', icon: Megaphone,  color: 'text-violet-600', bg: 'bg-violet-50' },
  promocao:   { label: 'Promoção',    icon: Bell,       color: 'text-emerald-600',bg: 'bg-emerald-50'},
};

// ── Formulário de Envio ───────────────────────────────────────────
const FormEnvio: React.FC<{ bairrosDisponiveis: string[]; onEnviado: (n: Notificacao) => void }> = ({
  bairrosDisponiveis, onEnviado,
}) => {
  const [tipo,         setTipo        ] = useState<NotificacaoTipo>('manutencao');
  const [alvo,         setAlvo        ] = useState<NotificacaoAlvo>('todos');
  const [titulo,       setTitulo      ] = useState('');
  const [corpo,        setCorpo       ] = useState('');
  const [bairrosSel,   setBairrosSel  ] = useState<string[]>([]);
  const [novoBairro,   setNovoBairro  ] = useState('');
  const [sending,      setSending     ] = useState(false);
  const [resultado,    setResultado   ] = useState<{ ok: boolean; msg: string } | null>(null);

  // Templates rápidos por tipo
  const templates: Record<NotificacaoTipo, { titulo: string; corpo: string }> = {
    manutencao: {
      titulo: '⚠️ Manutenção Programada',
      corpo:  'Informamos que haverá manutenção na rede do bairro {bairro} hoje das {hora}. Pedimos desculpas pelo transtorno.',
    },
    financeiro: {
      titulo: '💰 Fatura em Aberto',
      corpo:  'Você possui uma fatura em aberto. Acesse o app para pagar com PIX e evitar suspensão.',
    },
    aviso: {
      titulo: '📢 Comunicado VgWeb',
      corpo:  '',
    },
    promocao: {
      titulo: '🎉 Oferta Especial!',
      corpo:  'Upgrade de velocidade com condições especiais. Confira no app!',
    },
  };

  const aplicarTemplate = (t: NotificacaoTipo) => {
    setTipo(t);
    setTitulo(templates[t].titulo);
    setCorpo(templates[t].corpo);
  };

  const toggleBairro = (b: string) => {
    setBairrosSel(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  };

  const adicionarBairro = () => {
    const b = novoBairro.trim();
    if (b && !bairrosSel.includes(b)) {
      setBairrosSel(prev => [...prev, b]);
    }
    setNovoBairro('');
  };

  const enviar = async () => {
    if (!titulo.trim() || !corpo.trim()) return;
    if (alvo === 'bairro' && bairrosSel.length === 0) return;
    setSending(true); setResultado(null);
    try {
      const h = await authHeader();
      const body = { tipo, alvo, titulo: titulo.trim(), corpo: corpo.trim(), bairros: bairrosSel };
      const r = await fetch('/api/notificacoes/enviar', {
        method: 'POST', headers: h, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (r.ok) {
        setResultado({ ok: true, msg: `✅ Enviado para ${d.totalEnviados} cliente(s)!` });
        onEnviado(d.notificacao);
        setTitulo(''); setCorpo(''); setBairrosSel([]);
      } else {
        setResultado({ ok: false, msg: d.error || 'Erro ao enviar.' });
      }
    } catch {
      setResultado({ ok: false, msg: 'Erro de conexão com o servidor.' });
    } finally { setSending(false); }
  };

  const TipoIcon = tipoConfig[tipo].icon;

  return (
    <Card className="space-y-5">
      <h3 className="font-bold text-slate-900 flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" /> Nova Notificação
      </h3>

      {/* Tipo */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Tipo de notificação</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.entries(tipoConfig) as [NotificacaoTipo, typeof tipoConfig[NotificacaoTipo]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => aplicarTemplate(key)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all',
                tipo === key
                  ? `border-primary bg-primary/10 text-primary`
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <cfg.icon className="h-5 w-5" />
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Destinatários */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Destinatários</p>
        <div className="grid grid-cols-3 gap-2">
          {([
            ['todos',  'Todos',    Users  ],
            ['bairro', 'Por Bairro', MapPin],
            ['usuario','Um Cliente', User  ],
          ] as [NotificacaoAlvo, string, React.ElementType][]).map(([v, l, Icon]) => (
            <button key={v} onClick={() => setAlvo(v)}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all',
                alvo === v
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}>
              <Icon className="h-4 w-4" />
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Seleção de bairros */}
      {alvo === 'bairro' && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Selecione os bairros</p>
          {bairrosDisponiveis.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {bairrosDisponiveis.map(b => (
                <button
                  key={b}
                  onClick={() => toggleBairro(b)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                    bairrosSel.includes(b)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary'
                  )}
                >
                  {bairrosSel.includes(b) ? '✓ ' : ''}{b}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={novoBairro}
              onChange={e => setNovoBairro(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionarBairro()}
              placeholder="Adicionar bairro manualmente..."
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Button size="sm" onClick={adicionarBairro} disabled={!novoBairro.trim()}>
              Adicionar
            </Button>
          </div>
          {bairrosSel.length > 0 && (
            <p className="text-xs text-primary font-medium">
              {bairrosSel.length} bairro(s) selecionado(s): {bairrosSel.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Conteúdo */}
      <Input
        label="Título da notificação"
        placeholder="Ex: ⚠️ Manutenção no bairro Centro"
        value={titulo}
        onChange={e => setTitulo(e.target.value)}
      />
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Mensagem</label>
        <textarea
          value={corpo}
          onChange={e => setCorpo(e.target.value)}
          placeholder="Descreva o aviso para os clientes..."
          rows={4}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
        />
        <p className="text-xs text-slate-400 text-right">{corpo.length}/500</p>
      </div>

      {/* Preview */}
      {titulo && corpo && (
        <div className={cn('p-4 rounded-xl border', tipoConfig[tipo].bg)}>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preview no celular</p>
          <div className="bg-white rounded-xl p-3 shadow-sm space-y-1">
            <div className="flex items-center gap-2">
              <div className={cn('h-6 w-6 rounded-full flex items-center justify-center', tipoConfig[tipo].bg)}>
                <TipoIcon className={cn('h-3.5 w-3.5', tipoConfig[tipo].color)} />
              </div>
              <p className="text-xs font-bold text-slate-800">VgWeb Telecom</p>
              <p className="text-[10px] text-slate-400 ml-auto">agora</p>
            </div>
            <p className="text-sm font-semibold text-slate-900">{titulo}</p>
            <p className="text-xs text-slate-600 line-clamp-2">{corpo}</p>
          </div>
        </div>
      )}

      {resultado && (
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-xl text-sm font-medium',
          resultado.ok
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        )}>
          {resultado.ok
            ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
            : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          {resultado.msg}
        </div>
      )}

      <Button
        onClick={enviar}
        isLoading={sending}
        disabled={!titulo.trim() || !corpo.trim() || (alvo === 'bairro' && bairrosSel.length === 0)}
        className="w-full gap-2"
      >
        <Send className="h-4 w-4" />
        {alvo === 'todos' ? 'Enviar para Todos os Clientes'
         : alvo === 'bairro' ? `Enviar para ${bairrosSel.length} bairro(s)`
         : 'Enviar para o Cliente'}
      </Button>
    </Card>
  );
};

// ── Histórico de Notificações ────────────────────────────────────
const Historico: React.FC<{ notificacoes: Notificacao[] }> = ({ notificacoes }) => {
  if (notificacoes.length === 0) {
    return <p className="text-center text-sm text-slate-400 py-8">Nenhuma notificação enviada ainda.</p>;
  }
  return (
    <div className="space-y-3">
      {notificacoes.map(n => {
        const cfg = tipoConfig[n.tipo];
        const Icon = cfg.icon;
        return (
          <div key={n.id} className="flex gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
              <Icon className={cn('h-5 w-5', cfg.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm truncate">{n.titulo}</p>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.corpo}</p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(n.enviadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  {n.alvo === 'todos' ? '👥 Todos' : n.alvo === 'bairro' ? `📍 ${n.bairros?.join(', ')}` : '👤 Cliente específico'}
                </span>
                {n.totalEnviados !== undefined && (
                  <span className="text-[10px] font-bold text-emerald-600">
                    ✓ {n.totalEnviados} enviado(s)
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Página Principal ─────────────────────────────────────────────
export const AdminNotificacoes: React.FC = () => {
  const [notificacoes,      setNotificacoes     ] = useState<Notificacao[]>([]);
  const [bairrosDisponiveis, setBairrosDisponiveis] = useState<string[]>([]);
  const [loading,            setLoading          ] = useState(true);
  const [aba,                setAba              ] = useState<'enviar' | 'historico'>('enviar');

  useEffect(() => {
    // Carrega histórico de notificações
    const q = query(Col.notificacoes(), orderBy('enviadoEm', 'desc'));
    getDocs(q)
      .then(snap => setNotificacoes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notificacao))))
      .catch(console.warn)
      .finally(() => setLoading(false));

    // Coleta bairros distintos dos usuários para sugestão
    getDocs(Col.users()).then(snap => {
      const bairros = new Set<string>();
      snap.docs.forEach(d => {
        const data = d.data();
        const b = data.endereco?.bairro || data.bairro;
        if (b && typeof b === 'string' && b.trim()) bairros.add(b.trim());
      });
      setBairrosDisponiveis(Array.from(bairros).sort());
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Notificações Push</h1>
        <p className="text-slate-500">Envie avisos para clientes — mesmo com o app fechado</p>
      </header>

      {/* Abas */}
      <div className="flex gap-2">
        {([['enviar', '📤 Enviar Notificação'], ['historico', '📋 Histórico']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all',
              aba === id ? 'bg-primary text-white shadow-md' : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'
            )}>
            {label}
          </button>
        ))}
      </div>

      {aba === 'enviar' && (
        <>
          {/* Info sobre FCM */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex gap-3">
            <Bell className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Como funciona</p>
              <p className="text-xs text-blue-700 mt-1">
                As notificações chegam no celular do cliente mesmo com o app fechado, via Firebase Cloud Messaging.
                O cliente precisa ter aberto o app pelo menos uma vez e aceito as permissões de notificação.
              </p>
            </div>
          </div>

          <FormEnvio
            bairrosDisponiveis={bairrosDisponiveis}
            onEnviado={n => { setNotificacoes(p => [n, ...p]); setAba('historico'); }}
          />
        </>
      )}

      {aba === 'historico' && (
        <Card className="space-y-4">
          <h3 className="font-bold text-slate-900">
            Notificações Enviadas
            <span className="ml-2 text-xs font-normal text-slate-400">({notificacoes.length} total)</span>
          </h3>
          {loading
            ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            : <Historico notificacoes={notificacoes} />}
        </Card>
      )}
    </div>
  );
};
