import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, Button, cn } from '../../components/UI';
import { Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { Ticket } from '../../types';

const statusConfig = {
  open:        { label: 'Aberto',         color: 'text-red-500',     bg: 'bg-red-50',     icon: AlertCircle  },
  in_progress: { label: 'Em Atendimento', color: 'text-blue-500',    bg: 'bg-blue-50',    icon: Clock        },
  closed:      { label: 'Fechado',        color: 'text-emerald-500', bg: 'bg-emerald-50', icon: CheckCircle2 },
};

export const AdminTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const q    = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const counts = {
    open:        tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    closed:      tickets.filter(t => t.status === 'closed').length,
  };

  return (
    <div className="space-y-4 md:space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Chamados de Suporte</h1>
        <p className="text-sm text-slate-500">Atenda as solicitações dos seus clientes</p>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 md:p-4 bg-red-50 border-red-100">
          <p className="text-[10px] md:text-xs font-bold text-red-500 uppercase tracking-wider">Abertos</p>
          <p className="text-xl md:text-2xl font-bold text-red-700 mt-1">{counts.open}</p>
        </Card>
        <Card className="p-3 md:p-4 bg-blue-50 border-blue-100">
          <p className="text-[10px] md:text-xs font-bold text-blue-500 uppercase tracking-wider leading-tight">Em Andamento</p>
          <p className="text-xl md:text-2xl font-bold text-blue-700 mt-1">{counts.in_progress}</p>
        </Card>
        <Card className="p-3 md:p-4 bg-emerald-50 border-emerald-100">
          <p className="text-[10px] md:text-xs font-bold text-emerald-500 uppercase tracking-wider">Resolvidos</p>
          <p className="text-xl md:text-2xl font-bold text-emerald-700 mt-1">{counts.closed}</p>
        </Card>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : tickets.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">
          Nenhum chamado registrado.
        </Card>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {tickets.map(ticket => {
            const s = statusConfig[ticket.status as keyof typeof statusConfig] ?? statusConfig.open;
            return (
              <Card
                key={ticket.id}
                className="p-3 md:p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                {/* Ícone de status */}
                <div className={cn(
                  'h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  s.bg, s.color,
                )}>
                  <s.icon className="h-4 w-4 md:h-5 md:w-5" />
                </div>

                {/* Dados */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm md:text-base truncate">{ticket.assunto}</h3>
                  <p className="text-xs text-slate-500 truncate">
                    {ticket.userId} · {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Badge status + chevron */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn(
                    'hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                    s.bg, s.color,
                  )}>
                    {s.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
