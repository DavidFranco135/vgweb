import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, Button, Input, cn } from '../../components/UI';
import { Search, CheckCircle2, Clock, AlertCircle, Filter, Download, Plus } from 'lucide-react';
import { Invoice } from '../../types';

export const AdminInvoices: React.FC = () => {
  const [invoices,    setInvoices   ] = useState<Invoice[]>([]);
  const [loading,     setLoading    ] = useState(true);
  const [searchTerm,  setSearchTerm ] = useState('');

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const q    = query(collection(db, 'invoices'), orderBy('vencimento', 'desc'));
      const snap = await getDocs(q);
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const statusMap = {
    paid:    { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Pago' },
    pending: { icon: Clock,        color: 'text-amber-500',   bg: 'bg-amber-50',   label: 'Pendente' },
    overdue: { icon: AlertCircle,  color: 'text-red-600',     bg: 'bg-red-50',     label: 'Atrasado' },
  };

  const filtered = invoices.filter(inv =>
    !searchTerm ||
    inv.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-4 md:space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Faturas</h1>
          <p className="text-sm text-slate-500">Controle financeiro e recebimentos</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Gerar Fatura
        </Button>
      </div>

      {/* Barra de busca */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por cliente ou ID..."
            className="pl-9 text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2 flex-shrink-0">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filtrar</span>
        </Button>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Desktop: tabela */}
          <Card className="p-0 overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[560px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ID</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Valor</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Vencimento</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(inv => {
                    const s = statusMap[inv.status as keyof typeof statusMap] || statusMap.pending;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-xs font-mono text-slate-500">#{inv.id.slice(0, 8)}</td>
                        <td className="p-4 font-medium text-slate-700 text-sm">{inv.userId}</td>
                        <td className="p-4 font-bold text-slate-900">R$ {inv.valor?.toFixed(2)}</td>
                        <td className="p-4 text-sm text-slate-600">{inv.vencimento}</td>
                        <td className="p-4">
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1', s.bg, s.color)}>
                            <s.icon className="h-3 w-3" /> {s.label}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button className="p-1.5 text-slate-400 hover:text-primary transition-colors">
                            <Download className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <p className="text-center py-12 text-sm text-slate-500">Nenhuma fatura encontrada.</p>
            )}
          </Card>

          {/* Mobile: cards empilhados */}
          <div className="sm:hidden space-y-3">
            {filtered.length === 0 && (
              <p className="text-center py-10 text-sm text-slate-500">Nenhuma fatura encontrada.</p>
            )}
            {filtered.map(inv => {
              const s = statusMap[inv.status as keyof typeof statusMap] || statusMap.pending;
              return (
                <Card key={inv.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">#{inv.id.slice(0, 8)}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1', s.bg, s.color)}>
                      <s.icon className="h-3 w-3" /> {s.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">Cliente</p>
                      <p className="text-sm font-medium text-slate-700">{inv.userId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Vencimento</p>
                      <p className="text-sm text-slate-600">{inv.vencimento}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <p className="font-bold text-slate-900">R$ {inv.valor?.toFixed(2)}</p>
                    <button className="p-1.5 text-slate-400 hover:text-primary transition-colors">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
