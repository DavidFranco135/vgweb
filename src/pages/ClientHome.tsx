import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, cn } from '../components/UI';
import {
  Wifi, WifiOff, AlertTriangle, Download, Copy,
  Headphones, FileText, X, CheckCircle, ChevronLeft, ChevronRight,
  ExternalLink, Monitor,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getDocs } from 'firebase/firestore';
import { Col } from '../lib/tenant';
import { getAvatarUrl } from '../lib/imgbbService';
import type { Announcement, DeviceImage } from '../types';

const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ open, onClose, title, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
          initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <button onClick={onClose} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
              <X className="h-4 w-4 text-slate-600" />
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const PixModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [copied, setCopied] = useState(false);
  const pixCode = '00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540599.905802BR5920VgWeb Telecom6009SAO PAULO62070503***6304ABCD';
  const handleCopy = () => { navigator.clipboard.writeText(pixCode); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <Modal open={open} onClose={onClose} title="Pagar com PIX">
      <div className="space-y-5">
        <div className="text-center p-6 bg-slate-50 rounded-xl space-y-3">
          <p className="text-sm text-slate-500">Valor a pagar</p>
          <p className="text-4xl font-bold text-slate-900">R$ 99,90</p>
          <p className="text-xs text-slate-400">Vencimento: 10/03/2024</p>
        </div>
        <div className="flex justify-center">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PIX_VGWEB_99.90" alt="QR Code PIX" className="h-48 w-48 rounded-xl border border-slate-200" />
        </div>
        <button onClick={handleCopy} className={cn('w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all', copied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>
          {copied ? <><CheckCircle className="h-4 w-4" /> Copiado!</> : <><Copy className="h-4 w-4" /> Copiar código PIX</>}
        </button>
      </div>
    </Modal>
  );
};

const SegundaViaModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <Modal open={open} onClose={onClose} title="2ª Via da Fatura">
    <div className="space-y-4">
      {[{ mes: 'Março 2024', valor: 'R$ 99,90', status: 'Em aberto', cor: 'text-red-500' }, { mes: 'Fevereiro 2024', valor: 'R$ 99,90', status: 'Pago', cor: 'text-emerald-500' }, { mes: 'Janeiro 2024', valor: 'R$ 99,90', status: 'Pago', cor: 'text-emerald-500' }].map((f, i) => (
        <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
          <div><p className="font-medium text-slate-900">{f.mes}</p><p className={cn('text-sm font-medium', f.cor)}>{f.status}</p></div>
          <div className="flex items-center gap-3"><p className="font-bold text-slate-900">{f.valor}</p><button className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"><Download className="h-4 w-4" /></button></div>
        </div>
      ))}
    </div>
  </Modal>
);

const DesbloqueioModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [sent, setSent] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Desbloqueio Emergencial">
      {sent ? (
        <div className="text-center py-6 space-y-3">
          <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto"><CheckCircle className="h-8 w-8 text-emerald-500" /></div>
          <p className="font-bold text-slate-900">Solicitação enviada!</p>
          <p className="text-sm text-slate-500">Sua conexão será desbloqueada em até 30 minutos. Prazo de 48h para regularização.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800 font-medium">⚠️ Desbloqueio de confiança</p>
            <p className="text-xs text-amber-700 mt-1">Você terá 48h para pagar a fatura em aberto após o desbloqueio.</p>
          </div>
          <Button variant="accent" className="w-full" onClick={() => setSent(true)}>Solicitar Desbloqueio</Button>
        </div>
      )}
    </Modal>
  );
};

// ── Galeria de Anúncios — slide com imagem inteira ──────────────
const AnnouncementGallery: React.FC = () => {
  const [items, setItems]     = useState<Announcement[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Suporte a arrastar/swipe
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const colRef = Col.announcements();
        const snap   = await getDocs(colRef);
        const all    = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
        const ativos = all
          .filter(a => a.ativo === true)
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
        setItems(ativos);
      } catch (e) {
        console.error('[Anúncios] ERRO:', e);
      } finally { setLoading(false); }
    })();
  }, []);

  // Auto-avanço a cada 5 s
  useEffect(() => {
    if (items.length < 2) return;
    timerRef.current = setTimeout(() => setCurrent(c => (c + 1) % items.length), 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, items.length]);

  const go = (dir: 1 | -1) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrent(c => (c + dir + items.length) % items.length);
  };

  // Handlers de arrastar (mouse + touch)
  const onDragStart = (clientX: number) => { dragStart.current = clientX; };
  const onDragEnd   = (clientX: number) => {
    if (dragStart.current === null) return;
    const delta = dragStart.current - clientX;
    if (Math.abs(delta) > 40) go(delta > 0 ? 1 : -1);
    dragStart.current = null;
  };

  if (loading) return <div className="rounded-2xl bg-slate-100 animate-pulse" style={{ height: 220 }} />;
  if (items.length === 0) return null;  // some silenciosamente se não há anúncios

  const item = items[current];
  const [imgLoaded, setImgLoaded] = useState(false);
  useEffect(() => { setImgLoaded(false); }, [current]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-md select-none"
      onMouseDown={e  => onDragStart(e.clientX)}
      onMouseUp={e    => onDragEnd(e.clientX)}
      onMouseLeave={() => { dragStart.current = null; }}
      onTouchStart={e => onDragStart(e.touches[0].clientX)}
      onTouchEnd={e   => onDragEnd(e.changedTouches[0].clientX)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.3 }}
          style={{ position: 'relative' }}
        >
          <div style={{ width: '100%', backgroundColor: '#0a0a0a', minHeight: '220px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!imgLoaded && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.15)', borderTopColor: 'rgba(255,255,255,0.6)', animation: 'spin 0.8s linear infinite' }} />
                <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
              </div>
            )}
            <img
              src={item.imagemUrl}
              alt={item.titulo}
              draggable={false}
              onLoad={() => setImgLoaded(true)}
              style={{
                width:      '100%',
                display:    'block',
                objectFit:  'contain',
                maxHeight:  '420px',
                opacity:    imgLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            />
          </div>

          {/* Gradiente + texto sobre a imagem */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex flex-col justify-end p-4 pointer-events-none">
            <p className="text-white font-bold leading-tight drop-shadow">{item.titulo}</p>
            {item.descricao && <p className="text-white/80 text-xs mt-0.5 drop-shadow">{item.descricao}</p>}
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-white/90 hover:text-white font-medium underline w-fit pointer-events-auto"
              >
                Saiba mais <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Botões de navegar (visíveis quando há mais de 1 anúncio) */}
      {items.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white backdrop-blur-sm transition-colors z-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white backdrop-blur-sm transition-colors z-10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dots indicadores */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); setCurrent(i); }}
                className={cn('h-1.5 rounded-full transition-all', i === current ? 'bg-white w-5' : 'bg-white/50 w-1.5')}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Carrossel de Dispositivos ───────────────────────────────────
const DeviceCarousel: React.FC = () => {
  const [items, setItems]     = useState<DeviceImage[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(Col.deviceImages());
        setItems(snap.docs
          .map(d => ({ id: d.id, ...d.data() } as DeviceImage))
          .filter(d => d.ativo));
      } catch { }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="h-36 rounded-2xl bg-slate-100 animate-pulse" />;
  if (items.length === 0) return null;

  const item = items[current];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Monitor className="h-4 w-4" /> Equipamentos
        </h3>
        {items.length > 1 && (
          <div className="flex gap-1">
            {items.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={cn('h-1.5 rounded-full transition-all', i === current ? 'bg-primary w-5' : 'bg-slate-200 w-1.5')} />
            ))}
          </div>
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={item.id}
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="h-20 w-20 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 border border-slate-100">
            <img src={item.imagemUrl} alt={item.nome} className="h-full w-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate">{item.nome}</p>
            {item.descricao && <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{item.descricao}</p>}
          </div>
          {items.length > 1 && (
            <div className="flex flex-col gap-1">
              <button onClick={() => setCurrent(c => (c - 1 + items.length) % items.length)}
                className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5 text-slate-600" />
              </button>
              <button onClick={() => setCurrent(c => (c + 1) % items.length)}
                className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ── Tela Principal ──────────────────────────────────────────────
export const ClientHome: React.FC = () => {
  const { profile } = useAuth();
  const navigate    = useNavigate();
  const [modal, setModal] = useState<'pix' | 'segunda_via' | 'desbloqueio' | null>(null);

  const statusConfig = {
    online:  { icon: Wifi,          color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Conectado' },
    offline: { icon: WifiOff,       color: 'text-red-500',     bg: 'bg-red-50',     label: 'Desconectado' },
    blocked: { icon: AlertTriangle, color: 'text-amber-500',   bg: 'bg-amber-50',   label: 'Bloqueado' },
  };
  const currentStatus = statusConfig[profile?.statusConexao as keyof typeof statusConfig ?? 'offline'] ?? statusConfig.offline;
  const avatarUrl = getAvatarUrl(profile?.uid ?? '', profile?.fotoUrl);

  return (
    <div className="space-y-6">
      <PixModal         open={modal === 'pix'}         onClose={() => setModal(null)} />
      <SegundaViaModal  open={modal === 'segunda_via'} onClose={() => setModal(null)} />
      <DesbloqueioModal open={modal === 'desbloqueio'} onClose={() => setModal(null)} />

      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Olá, {profile?.nome?.split(' ')[0] ?? 'Cliente'}</h1>
          <p className="text-slate-500">Nº do cliente: {profile?.numeroCliente}</p>
        </div>
        <button onClick={() => navigate('/profile')} className="h-12 w-12 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-md hover:ring-2 hover:ring-primary transition-all">
          <img src={avatarUrl} alt="Avatar" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        </button>
      </header>

      {/* Galeria de anúncios — imagem inteira, botões arrastar */}
      <AnnouncementGallery />

      {/* Status + Fatura */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Status da Conexão</span>
              <div className={cn('flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase', currentStatus.bg, currentStatus.color)}>
                <currentStatus.icon className="h-3 w-3" />{currentStatus.label}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-900">500MB</p>
              <p className="text-slate-500">Plano VG Fibra</p>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-sm">
              <span className="text-slate-500">IP: 187.45.122.10</span>
              <button className="text-primary font-medium hover:underline" onClick={() => navigate('/profile')}>Ver detalhes</button>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="h-full border-l-4 border-l-accent-red">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Fatura Atual</span>
              <span className="px-3 py-1 rounded-full bg-red-50 text-accent-red text-xs font-bold uppercase">Em Aberto</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-900">R$ 99,90</p>
              <p className="text-slate-500">Vencimento: 10 de Março</p>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="accent" className="flex-1" onClick={() => setModal('pix')}>PAGAR AGORA</Button>
              <Button variant="outline" className="px-3" onClick={() => setModal('segunda_via')}>
                <Download className="h-5 w-5" />
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {([
          { label: 'Gerar PIX',   icon: Copy,         color: 'bg-blue-500',    action: () => setModal('pix') },
          { label: '2ª Via',      icon: FileText,      color: 'bg-indigo-500',  action: () => setModal('segunda_via') },
          { label: 'Desbloqueio', icon: AlertTriangle, color: 'bg-amber-500',   action: () => setModal('desbloqueio') },
          { label: 'Suporte',     icon: Headphones,    color: 'bg-emerald-500', action: () => navigate('/support') },
        ] as const).map((a, i) => (
          <button key={i} onClick={a.action} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:bg-slate-50 hover:shadow-md transition-all active:scale-95">
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-white', a.color)}>
              <a.icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-700">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Equipamentos cadastrados pelo admin */}
      <DeviceCarousel />

      {/* Indique e Ganhe */}
      <Card className="bg-primary text-white overflow-hidden relative">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">Indique e Ganhe!</h3>
          <p className="text-blue-200 mb-4 max-w-xs">Indique um amigo e ganhe 50% de desconto na sua próxima fatura.</p>
          <Button variant="secondary" size="sm">Saber mais</Button>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
          <Wifi className="h-40 w-40" />
        </div>
      </Card>
    </div>
  );
};
