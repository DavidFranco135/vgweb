import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input, cn } from '../components/UI';
import {
  MessageSquare, Phone, HelpCircle, ExternalLink,
  ChevronRight, ChevronDown, Send, X, Loader2,
  Clock, CheckCircle2, AlertCircle, Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Col, Doc } from '../lib/tenant';
import {
  addDoc, getDocs, onSnapshot, orderBy,
  query, updateDoc, doc, arrayUnion,
} from 'firebase/firestore';
import type { Ticket } from '../types';

const statusConfig = {
  open:        { label: 'Aberto',         color: 'text-red-500',     bg: 'bg-red-50',     icon: AlertCircle  },
  in_progress: { label: 'Em Atendimento', color: 'text-blue-500',    bg: 'bg-blue-50',    icon: Clock        },
  closed:      { label: 'Fechado',        color: 'text-emerald-500', bg: 'bg-emerald-50', icon: CheckCircle2 },
};

const categorias = [
  { value: 'tecnico',    label: '🔧 Problema Técnico' },
  { value: 'financeiro', label: '💰 Financeiro / Fatura' },
  { value: 'outros',     label: '💬 Outros' },
];

const faqs = [
  { q: 'Como alterar a senha do Wi-Fi?',   a: 'Acesse o roteador pelo IP 192.168.0.1 ou entre em contato conosco pelo WhatsApp.' },
  { q: 'Minha internet está lenta.',        a: 'Reinicie o roteador por 30 segundos. Se persistir, abra um chamado técnico.' },
  { q: 'Como pegar a 2ª via da fatura?',   a: 'Acesse a aba Financeiro → toque na fatura → copie o código PIX.' },
  { q: 'Qual meu IP fixo?',                a: 'Verifique na tela inicial do app. Se não aparecer, entre em contato.' },
];

// ── Componente: Chat do Chamado ───────────────────────────────────
const TicketChat: React.FC<{ ticket: Ticket; uid: string; onClose: () => void }> = ({ ticket, uid, onClose }) => {
  const [msg,     setMsg    ] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<Ticket>(ticket);

  // Tempo real via onSnapshot
  useEffect(() => {
    const unsub = onSnapshot(Doc.ticket(ticket.id), snap => {
      if (snap.exists()) setLive({ id: snap.id, ...snap.data() } as Ticket);
    });
    return unsub;
  }, [ticket.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [live.mensagens]);

  const enviar = async () => {
    if (!msg.trim() || sending) return;
    setSending(true);
    try {
      await updateDoc(Doc.ticket(ticket.id), {
        mensagens: arrayUnion({
          senderId:  uid,
          text:      msg.trim(),
          timestamp: new Date().toISOString(),
          isAdmin:   false,
        }),
        updatedAt: new Date().toISOString(),
      });
      setMsg('');
    } finally { setSending(false); }
  };

  const s = statusConfig[live.status];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-white"
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white shadow-sm">
        <button onClick={onClose} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
          <X className="h-4 w-4 text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 truncate text-sm">{live.assunto}</p>
          <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', s.bg, s.color)}>
            {s.label}
          </span>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {live.mensagens.map((m, i) => {
          const isMe = m.senderId === uid;
          return (
            <div key={i} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm',
                isMe
                  ? 'bg-primary text-white rounded-br-md'
                  : 'bg-white text-slate-800 rounded-bl-md border border-slate-100',
              )}>
                {!isMe && <p className="text-[10px] font-bold text-primary mb-1">Suporte VgWeb</p>}
                <p className="leading-relaxed">{m.text}</p>
                <p className={cn('text-[10px] mt-1', isMe ? 'text-white/60 text-right' : 'text-slate-400')}>
                  {new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {live.status !== 'closed' ? (
        <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
          <input
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
            placeholder="Digite sua mensagem..."
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={enviar}
            disabled={!msg.trim() || sending}
            className="h-11 w-11 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-50 hover:bg-primary-dark transition-colors"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border-t border-emerald-100 text-center text-sm text-emerald-700 font-medium">
          ✅ Chamado encerrado
        </div>
      )}
    </motion.div>
  );
};

// ── Formulário: Novo Chamado ─────────────────────────────────────
const NovoChamado: React.FC<{ uid: string; nome: string; onCriado: (t: Ticket) => void; onClose: () => void }> = ({
  uid, nome, onCriado, onClose,
}) => {
  const [assunto,   setAssunto  ] = useState('');
  const [categoria, setCategoria] = useState<'tecnico' | 'financeiro' | 'outros'>('tecnico');
  const [mensagem,  setMensagem ] = useState('');
  const [saving,    setSaving   ] = useState(false);
  const [erro,      setErro     ] = useState('');

  const criar = async () => {
    if (!assunto.trim() || !mensagem.trim()) { setErro('Preencha assunto e mensagem.'); return; }
    setSaving(true); setErro('');
    try {
      const ticket: Omit<Ticket, 'id'> = {
        userId:   uid,
        userName: nome,
        assunto:  assunto.trim(),
        categoria,
        status:   'open',
        prioridade: 'media',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mensagens: [{
          senderId:  uid,
          senderNome: nome,
          text:      mensagem.trim(),
          timestamp: new Date().toISOString(),
          isAdmin:   false,
        }],
      };
      const ref = await addDoc(Col.tickets(), ticket);
      onCriado({ id: ref.id, ...ticket } as Ticket);
    } catch (e: any) {
      setErro('Erro ao abrir chamado. Tente novamente.');
    } finally { setSaving(false); }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-white"
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 shadow-sm">
        <button onClick={onClose} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
          <X className="h-4 w-4 text-slate-600" />
        </button>
        <h2 className="font-bold text-slate-900">Abrir Novo Chamado</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Categoria</p>
          <div className="grid grid-cols-3 gap-2">
            {categorias.map(c => (
              <button key={c.value} onClick={() => setCategoria(c.value as any)}
                className={cn(
                  'p-3 rounded-xl text-xs font-medium border transition-all text-center',
                  categoria === c.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                )}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Assunto"
          placeholder="Ex: Internet caiu no período da manhã"
          value={assunto}
          onChange={e => setAssunto(e.target.value)}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Descreva o problema</label>
          <textarea
            value={mensagem}
            onChange={e => setMensagem(e.target.value)}
            placeholder="Descreva com detalhes o que está acontecendo..."
            rows={5}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
          />
        </div>

        {erro && <p className="text-sm text-red-500">{erro}</p>}
      </div>

      <div className="p-4 border-t border-slate-100">
        <Button onClick={criar} isLoading={saving} className="w-full gap-2">
          <Send className="h-4 w-4" /> Enviar Chamado
        </Button>
      </div>
    </motion.div>
  );
};

// ── Página Principal ─────────────────────────────────────────────
export const SupportPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [tickets,      setTickets     ] = useState<Ticket[]>([]);
  const [loading,      setLoading     ] = useState(true);
  const [openFaq,      setOpenFaq     ] = useState<number | null>(null);
  const [chatTicket,   setChatTicket  ] = useState<Ticket | null>(null);
  const [showNovo,     setShowNovo    ] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(Col.tickets(), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
      setTickets(todos.filter(t => t.userId === user.uid));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const whatsappUrl = `https://wa.me/5500000000000?text=${encodeURIComponent('Olá, preciso de suporte VgWeb!')}`;

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {chatTicket && user && (
          <TicketChat ticket={chatTicket} uid={user.uid} onClose={() => setChatTicket(null)} />
        )}
        {showNovo && user && profile && (
          <NovoChamado
            uid={user.uid}
            nome={profile.nome}
            onCriado={t => { setTickets(p => [t, ...p]); setShowNovo(false); setChatTicket(t); }}
            onClose={() => setShowNovo(false)}
          />
        )}
      </AnimatePresence>

      <header>
        <h1 className="text-2xl font-bold text-slate-900">Suporte</h1>
        <p className="text-slate-500">Estamos aqui para ajudar você</p>
      </header>

      {/* Contatos rápidos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-emerald-500 text-white border-none flex flex-col justify-between">
          <div>
            <Phone className="h-8 w-8 mb-4 opacity-80" />
            <h3 className="text-xl font-bold">WhatsApp VgWeb</h3>
            <p className="text-emerald-100 text-sm">Atendimento rápido via chat</p>
          </div>
          <a href={whatsappUrl} target="_blank" rel="noreferrer">
            <Button variant="secondary" className="mt-6 w-full text-emerald-600">Falar agora</Button>
          </a>
        </Card>

        <Card className="bg-primary text-white border-none flex flex-col justify-between">
          <div>
            <MessageSquare className="h-8 w-8 mb-4 opacity-80" />
            <h3 className="text-xl font-bold">Abrir Chamado</h3>
            <p className="text-blue-200 text-sm">Nossa equipe técnica irá te atender</p>
          </div>
          <Button variant="secondary" className="mt-6 w-full text-primary gap-2" onClick={() => setShowNovo(true)}>
            <Plus className="h-4 w-4" /> Novo chamado
          </Button>
        </Card>
      </div>

      {/* Meus chamados */}
      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : tickets.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Meus Chamados</h2>
          {tickets.map(ticket => {
            const s = statusConfig[ticket.status];
            return (
              <Card
                key={ticket.id}
                className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                onClick={() => setChatTicket(ticket)}
              >
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0', s.bg, s.color)}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{ticket.assunto}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(ticket.createdAt).toLocaleDateString('pt-BR')} · {ticket.mensagens.length} mensagem(ns)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', s.bg, s.color)}>
                    {s.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* FAQ */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Dúvidas Frequentes</h2>
        {faqs.map((faq, i) => (
          <Card key={i} className="p-0 overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium text-slate-700 text-sm">{faq.q}</span>
              </div>
              <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform flex-shrink-0', openFaq === i && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {openFaq === i && (
                <motion.div
                  initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <p className="px-4 pb-4 text-sm text-slate-500 pl-12">{faq.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        ))}
      </div>

      {/* Teste de velocidade */}
      <Card className="p-5 border-dashed border-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
            <ExternalLink className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <p className="font-bold text-slate-900">Teste sua velocidade</p>
            <p className="text-sm text-slate-500">Verifique o desempenho da sua conexão</p>
          </div>
        </div>
        <a href="https://fast.com" target="_blank" rel="noreferrer">
          <Button variant="outline">Iniciar Teste</Button>
        </a>
      </Card>
    </div>
  );
};
