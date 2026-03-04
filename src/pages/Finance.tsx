import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, cn } from '../components/UI';
import {
  Download, Copy, ChevronRight, CheckCircle2, Clock,
  AlertCircle, QrCode, Loader2, RefreshCw, FileText,
  Unlock, CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';

// ── Helpers ──────────────────────────────────────────────────────
async function authHeader() {
  const token = await auth.currentUser?.getIdToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ── Tipos locais ─────────────────────────────────────────────────
interface FaturaIXC {
  id: string;
  valor: string;
  vencimento: string;
  status: 'A' | 'B' | 'P';
  referencia: string;
  pix_copia_cola?: string;
  pix_qrcode?: string;
  linha_digitavel?: string;
}

const statusMap = {
  A: { icon: Clock,        color: 'text-amber-500',   bg: 'bg-amber-50',   label: 'Pendente' },
  P: { icon: AlertCircle,  color: 'text-red-600',     bg: 'bg-red-50',     label: 'Vencida'  },
  B: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Pago'     },
};

// ── Modal PIX ────────────────────────────────────────────────────
const PixModal: React.FC<{
  fatura: FaturaIXC | null;
  onClose: () => void;
}> = ({ fatura, onClose }) => {
  const [pixData, setPixData] = useState<{ pixCode?: string; qrCode?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied,  setCopied ] = useState(false);

  useEffect(() => {
    if (!fatura) return;
    // Se o IXC já retornou o pix na listagem, usa direto
    if (fatura.pix_copia_cola) {
      setPixData({ pixCode: fatura.pix_copia_cola, qrCode: fatura.pix_qrcode });
      return;
    }
    // Senão busca da API
    (async () => {
      setLoading(true);
      try {
        const h = await authHeader();
        const r = await fetch(`/api/ixc/pix/${fatura.id}`, { headers: h });
        const d = await r.json();
        setPixData(d);
      } catch { setPixData(null); }
      finally { setLoading(false); }
    })();
  }, [fatura]);

  const copiar = () => {
    if (!pixData?.pixCode) return;
    navigator.clipboard.writeText(pixData.pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!fatura) return null;
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-5"
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Pagar com PIX</h2>
            <button onClick={onClose} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">✕</button>
          </div>

          <div className="text-center p-5 bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-500">Vencimento: {fatura.vencimento}</p>
            <p className="text-4xl font-bold text-slate-900 mt-1">
              R$ {parseFloat(fatura.valor).toFixed(2).replace('.', ',')}
            </p>
            <p className="text-xs text-slate-400 mt-1">{fatura.referencia}</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pixData?.qrCode ? (
            <div className="flex justify-center">
              <img src={pixData.qrCode} alt="QR Code PIX" className="h-48 w-48 rounded-xl border border-slate-200" />
            </div>
          ) : (
            <div className="flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixData?.pixCode || fatura.id)}`}
                alt="QR Code PIX"
                className="h-48 w-48 rounded-xl border border-slate-200"
              />
            </div>
          )}

          {pixData?.pixCode && (
            <button
              onClick={copiar}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all',
                copied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              {copied
                ? <><CheckCircle className="h-4 w-4" /> Copiado!</>
                : <><Copy className="h-4 w-4" /> Copiar código PIX</>}
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ── Página Principal ─────────────────────────────────────────────
export const FinancePage: React.FC = () => {
  const { profile } = useAuth();
  const [faturas,    setFaturas   ] = useState<FaturaIXC[]>([]);
  const [loading,    setLoading   ] = useState(true);
  const [error,      setError     ] = useState('');
  const [filter,     setFilter    ] = useState<'all' | 'A' | 'B'>('all');
  const [pixFatura,  setPixFatura ] = useState<FaturaIXC | null>(null);
  const [desbloq,    setDesbloq   ] = useState<'idle' | 'loading' | 'ok' | 'erro'>('idle');
  const [desbloqMsg, setDesbloqMsg] = useState('');

  const faturaAberta = faturas.find(f => f.status === 'A' || f.status === 'P');

  const fetchFaturas = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const h = await authHeader();
      const r = await fetch('/api/ixc/faturas', { headers: h });
      if (!r.ok) throw new Error('Erro ao buscar faturas');
      const d = await r.json();
      setFaturas(d.faturas || []);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar faturas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFaturas(); }, [fetchFaturas]);

  const solicitarDesbloqueio = async () => {
    setDesbloq('loading'); setDesbloqMsg('');
    try {
      const h = await authHeader();
      const r = await fetch('/api/ixc/desbloqueio', { method: 'POST', headers: h });
      const d = await r.json();
      if (r.ok) { setDesbloq('ok'); setDesbloqMsg(d.message); }
      else       { setDesbloq('erro'); setDesbloqMsg(d.error); }
    } catch {
      setDesbloq('erro'); setDesbloqMsg('Erro de conexão. Tente novamente.');
    }
  };

  const filtered = faturas.filter(f => filter === 'all' || f.status === filter);

  return (
    <div className="space-y-6">
      <PixModal fatura={pixFatura} onClose={() => setPixFatura(null)} />

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
          <p className="text-slate-500">Gerencie suas faturas e pagamentos</p>
        </div>
        <button
          onClick={fetchFaturas}
          className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary transition-colors"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </header>

      {/* Fatura em aberto */}
      {loading ? (
        <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
      ) : faturaAberta ? (
        <Card className="bg-slate-900 text-white border-none">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                {faturaAberta.status === 'P' ? '⚠️ Fatura vencida' : 'Fatura em aberto'}
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  R$ {parseFloat(faturaAberta.valor).toFixed(2).replace('.', ',')}
                </span>
                <span className="text-slate-400">venc. {faturaAberta.vencimento}</span>
              </div>
              <p className="text-slate-500 text-sm mt-1">{faturaAberta.referencia}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="accent" className="flex-1 md:flex-none gap-2" onClick={() => setPixFatura(faturaAberta)}>
                <QrCode className="h-4 w-4" /> Pagar com PIX
              </Button>
              {faturaAberta.linha_digitavel && (
                <Button variant="secondary" className="flex-1 md:flex-none gap-2">
                  <FileText className="h-4 w-4" /> Boleto
                </Button>
              )}
            </div>
          </div>
        </Card>
      ) : !loading && faturas.length > 0 ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-emerald-900">Conta em dia! ✅</p>
              <p className="text-sm text-emerald-700">Você não possui faturas em aberto.</p>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Erro */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Histórico */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Histórico de Faturas</h2>
          <div className="flex gap-2">
            {([['all', 'Todas'], ['A', 'Pendentes'], ['B', 'Pagas']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v as any)}
                className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  filter === v ? 'bg-primary text-white' : 'bg-white text-slate-500 border border-slate-200')}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">Nenhuma fatura encontrada.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((fatura, i) => {
              const s = statusMap[fatura.status] ?? statusMap.A;
              const isPendente = fatura.status === 'A' || fatura.status === 'P';
              return (
                <motion.div key={fatura.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', s.bg, s.color)}>
                        <s.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{fatura.referencia || `Fatura #${fatura.id}`}</p>
                        <p className="text-xs text-slate-500">Vencimento: {fatura.vencimento}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden md:block">
                        <p className="font-bold text-slate-900">R$ {parseFloat(fatura.valor).toFixed(2).replace('.', ',')}</p>
                        <p className={cn('text-xs font-medium', s.color)}>{s.label}</p>
                      </div>
                      {isPendente && (
                        <button
                          onClick={() => setPixFatura(fatura)}
                          className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                          title="Pagar com PIX"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                      )}
                      <ChevronRight className="h-5 w-5 text-slate-300" />
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desbloqueio de confiança */}
      {profile?.statusConexao === 'blocked' && (
        <div className="space-y-3">
          {desbloq === 'ok' ? (
            <Card className="border-emerald-200 bg-emerald-50 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-emerald-900">Desbloqueio solicitado!</p>
                <p className="text-sm text-emerald-700">{desbloqMsg}</p>
              </div>
            </Card>
          ) : (
            <>
              {desbloq === 'erro' && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{desbloqMsg}</div>
              )}
              <Button
                variant="outline"
                className="w-full border-dashed border-2 py-6 text-slate-600 gap-2 hover:border-primary hover:text-primary"
                onClick={solicitarDesbloqueio}
                isLoading={desbloq === 'loading'}
              >
                <Unlock className="h-5 w-5" />
                Solicitar desbloqueio de confiança (48h)
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
