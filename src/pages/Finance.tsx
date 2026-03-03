import React, { useState } from 'react';
import { Card, Button } from '../components/UI';
import { Download, Copy, Filter, ChevronRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../components/UI';

export const FinancePage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

  const invoices = [
    { id: '1', month: 'Março', year: '2024', value: 99.90, status: 'pending', dueDate: '10/03/2024' },
    { id: '2', month: 'Fevereiro', year: '2024', value: 99.90, status: 'paid', dueDate: '10/02/2024' },
    { id: '3', month: 'Janeiro', year: '2024', value: 99.90, status: 'paid', dueDate: '10/01/2024' },
    { id: '4', month: 'Dezembro', year: '2023', value: 89.90, status: 'paid', dueDate: '10/12/2023' },
  ];

  const statusIcons = {
    paid: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Pago' },
    pending: { icon: Clock, color: 'text-accent-red', bg: 'bg-red-50', label: 'Pendente' },
    overdue: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Atrasado' },
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
        <p className="text-slate-500">Gerencie suas faturas e pagamentos</p>
      </header>

      {/* Current Invoice Highlight */}
      <Card className="bg-slate-900 text-white border-none">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">Fatura em aberto</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold">R$ 99,90</span>
              <span className="text-slate-400">vencimento 10/03</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="accent" className="flex-1 md:flex-none">Pagar com PIX</Button>
            <Button variant="secondary" className="flex-1 md:flex-none">Boleto PDF</Button>
          </div>
        </div>
      </Card>

      {/* History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Histórico de Faturas</h2>
          <div className="flex gap-2">
            {['all', 'pending', 'paid'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  filter === f ? 'bg-primary text-white' : 'bg-white text-slate-500 border border-slate-200'
                )}
              >
                {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : 'Pagas'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {invoices
            .filter(inv => filter === 'all' || inv.status === filter)
            .map((invoice, i) => {
              const status = statusIcons[invoice.status as keyof typeof statusIcons];
              return (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', status.bg, status.color)}>
                        <status.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{invoice.month} {invoice.year}</p>
                        <p className="text-xs text-slate-500">Vencimento: {invoice.dueDate}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div className="hidden md:block">
                        <p className="font-bold text-slate-900">R$ {invoice.value.toFixed(2)}</p>
                        <p className={cn('text-xs font-medium', status.color)}>{status.label}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                  </Card>
                </motion.div>
              );
            })}
        </div>
      </div>

      <Button variant="outline" className="w-full border-dashed border-2 py-6 text-slate-500">
        Solicitar desbloqueio de confiança
      </Button>
    </div>
  );
};
