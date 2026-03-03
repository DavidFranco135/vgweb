import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, cn } from '../components/UI';
import {
  Wifi, WifiOff, AlertTriangle, Download, Copy,
  Headphones, FileText, X, CheckCircle, ChevronLeft, ChevronRight,
  ExternalLink, Router, Zap, Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAvatarUrl } from '../lib/imgbbService';
import type { Announcement, DeviceImage, Plan } from '../types';

// ── Modal Genérico ─────────────────────────────────────────────
const Modal: React.FC<{
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}> = ({ open, onClose, title, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
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
  return (
    <Modal open={open} onClose={onClose} title="Pagar com PIX">
      <div className="space-y-5">
        <div className="text-center p-6 bg-slate-50 rounded-xl">
          <p className="text-sm text-slate-500">Valor a pagar</p>
          <p className="text-4xl font-bold text-slate-900 mt-1">R$ 99,90</p>
          <p className="text-xs text-slate-400 mt-1">Vencimento: 10/03/2024</p>
        </div>
        <div className="flex justify-center">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PIX_VGWEB_99.90" alt="QR Code" className="h-48 w-48 rounded-xl border border-slate-200" />
        </div>
        <div className="p-3 bg-slate-100 rounded-xl text-[10px] text-slate-600 break-all font-mono">{pixCode}</div>
        <Button onClick={() => { navigator.clipboard.writeText(pixCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className={cn('w-full gap-2', copied && 'bg-emerald-500')}>
          {copied ? <><CheckCircle className="h-4 w-4" /> Copiado!</> : <><Copy className="h-4 w-4" /> Copiar código PIX</>}
        </Button>
      </div>
    </Modal>
  );
};

const SegundaViaModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => (
  <Modal open={open} onClose={onClose} title="2ª Via de Fatura">
    <div className="space-y-4">
      {[
        { month: 'Março 2024',     value: 'R$ 99,90', paid: false },
        { month: 'Fevereiro 2024', value: 'R$ 99,90', paid: true },
        { month: 'Janeiro 2024',   value: 'R$ 99,90', paid: true },
      ].map((inv, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div>
            <p className="font-semibold text-slate-900 text-sm">{inv.month}</p>
            <p className="text-xs text-slate-500">{inv.value}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn('text-[10px] font-bold uppercase px-2 py-1 rounded-full', inv.paid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')}>{inv.paid ? 'Pago' : 'Em aberto'}</span>
            <button className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"><Download className="h-4 w-4 text-slate-500" /></button>
          </div>
        </div>
      ))}
    </div>
  </Modal>
);

const DesbloqueioModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [sent, setSent] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Solicitar Desbloqueio">
      {!sent ? (
        <div className="space-y-5">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">Solicite desbloqueio de confiança por até 48h enquanto regulariza o pagamento.</p>
          </div>
          <Button className="w-full" onClick={() => setSent(true)}>Solicitar Desbloqueio</Button>
        </div>
      ) : (
        <div className="text-center space-y-4 py-4">
          <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Desbloqueio Solicitado!</h3>
          <p className="text-sm text-slate-500">Nossa equipe irá processar em até 10 minutos.</p>
          <Button className="w-full" onClick={onClose}>Fechar</Button>
        </div>
      )}
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
//  CARROSSEL UNIVERSAL — altura FIXA, imagem ocupa 100% da área
//  SEM classes Tailwind JIT (aspect-[]) — usa style inline
// ══════════════════════════════════════════════════════════════
interface Slide { id: string; imageUrl: string; title: string; subtitle?: string; link?: string; }

const Carousel: React.FC<{
  slides: Slide[];
  autoplay?: boolean;
  height: number;          // altura em pixels (fixo)
  showOverlay?: boolean;
  bgColor?: string;        // cor de fundo quando a imagem não preenche
  fit?: 'cover' | 'contain'; // como a imagem é redimensionada
}> = ({ slides, autoplay = true, height, showOverlay = true, bgColor = '#0f172a', fit = 'contain' }) => {
  const [idx, setIdx]     = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    if (!autoplay || slides.length < 2) return;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setIdx(i => (i + 1) % slides.length), 4500);
  };

  useEffect(() => {
    if (paused) { if (timer.current) clearInterval(timer.current); return; }
    startTimer();
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [paused, slides.length]);

  const go = (dir: 1 | -1) => {
    setIdx(i => (i + dir + slides.length) % slides.length);
    startTimer();
  };

  if (!slides.length) return null;
  const s = slides[idx];

  return (
    // Container com altura FIXA via style — funciona sem JIT
    <div
      style={{ position: 'relative', width: '100%', height: `${height}px`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', backgroundColor: bgColor }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={s.id}
          style={{ position: 'absolute', inset: 0 }}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
        >
          {/* IMAGEM — cobre 100% do container */}
          <img
            src={s.imageUrl}
            alt={s.title}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: fit,        // ← respeita a prop (contain = imagem inteira)
              objectPosition: 'center',
            }}
            referrerPolicy="no-referrer"
            onError={e => {
              (e.target as HTMLImageElement).src =
                `https://placehold.co/900x${height}/004aad/ffffff?text=${encodeURIComponent(s.title)}`;
            }}
          />

          {/* Gradiente rodapé para texto */}
          {showOverlay && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)',
            }} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Texto */}
      {showOverlay && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px', zIndex: 10 }}>
          <AnimatePresence mode="wait">
            <motion.div key={s.id + '_t'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.12 }}>
              <p style={{ color: 'white', fontWeight: 700, fontSize: '14px', lineHeight: 1.3, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{s.title}</p>
              {s.subtitle && <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '12px', marginTop: '2px' }}>{s.subtitle}</p>}
              {s.link && (
                <a href={s.link} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.9)', textDecoration: 'underline', zIndex: 20, position: 'relative' }}>
                  Saiba mais <ExternalLink style={{ width: '12px', height: '12px' }} />
                </a>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Botões prev/next — sempre visíveis */}
      {slides.length > 1 && (
        <>
          <button onClick={() => go(-1)} style={{
            position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 20,
            width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer',
            backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
          }}>
            <ChevronLeft style={{ width: '20px', height: '20px' }} />
          </button>
          <button onClick={() => go(1)} style={{
            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 20,
            width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer',
            backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
          }}>
            <ChevronRight style={{ width: '20px', height: '20px' }} />
          </button>

          {/* Dots */}
          <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 20, display: 'flex', gap: '6px', alignItems: 'center' }}>
            {slides.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} style={{
                borderRadius: '99px', border: 'none', cursor: 'pointer', transition: 'all 0.3s',
                width: i === idx ? '20px' : '6px', height: '6px',
                backgroundColor: i === idx ? 'white' : 'rgba(255,255,255,0.55)',
                padding: 0,
              }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── Carrossel de Anúncios ──────────────────────────────────────
const AnnouncementSlider: React.FC = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, 'announcements'))
      .then(snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as Announcement) }));
        const active = all.filter(a => a.ativo !== false).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
        setSlides(active.map(a => ({ id: a.id, imageUrl: a.imagemUrl, title: a.titulo, subtitle: a.descricao, link: a.link })));
      })
      .catch(e => console.warn('Anúncios:', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ width: '100%', height: '200px', borderRadius: '16px', backgroundColor: '#e2e8f0', animation: 'pulse 2s infinite' }} />
    );
  }
  if (!slides.length) return null;

  return <Carousel slides={slides} autoplay height={220} showOverlay fit="contain" bgColor="#0f172a" />;
};

// ── Carrossel de Dispositivos ──────────────────────────────────
const DeviceSlider: React.FC = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, 'deviceImages'))
      .then(snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as DeviceImage) }));
        const active = all.filter(d => d.ativo !== false).sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
        setSlides(active.map(d => ({ id: d.id, imageUrl: d.imagemUrl, title: d.nome, subtitle: d.descricao })));
      })
      .catch(e => console.warn('Dispositivos:', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !slides.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
          <Router className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Equipamentos Disponíveis</span>
      </div>
      <Carousel slides={slides} autoplay={false} height={200} showOverlay fit="contain" bgColor="#f1f5f9" />
    </div>
  );
};

// ── Banner de capa do admin ────────────────────────────────────
// Lê coverUrl de adminSettings/profile e exibe no topo
const CoverBanner: React.FC = () => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'adminSettings', 'profile'))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.coverUrl) setCoverUrl(data.coverUrl);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Não renderiza nada enquanto carrega (evita "piscar")
  if (!loaded || !coverUrl) return null;

  return (
    <div style={{
      width: '100%',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
      backgroundColor: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <img
        src={coverUrl}
        alt="Capa VgWeb"
        style={{
          width: '100%',
          maxHeight: '200px',
          objectFit: 'contain',
          objectPosition: 'center',
          display: 'block',
        }}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

// ── Seção de Planos ────────────────────────────────────────────
const PlanSection: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, 'plans'))
      .then(snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Plan));
        setPlans(all.sort((a, b) => (a.valor ?? 0) - (b.valor ?? 0)));
      })
      .catch(e => console.warn('Planos:', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ height: '120px', borderRadius: '16px', backgroundColor: '#e2e8f0', animation: 'pulse 2s infinite' }} />
  );
  if (!plans.length) return null;

  const getImage = (plan: Plan) => (plan as any).imagemUrl || (plan as any).imageUrl;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Cabeçalho */}
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
          <Zap className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Planos Disponíveis</span>
      </div>

      {/* Cards horizontais com scroll */}
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '6px', scrollSnapType: 'x mandatory' }}>
        {plans.map(plan => (
          <div
            key={plan.id}
            style={{
              minWidth: '220px', maxWidth: '220px',
              borderRadius: '16px', overflow: 'hidden',
              border: plan.popular ? '2px solid #004aad' : '1px solid #e2e8f0',
              backgroundColor: 'white',
              boxShadow: plan.popular ? '0 4px 16px rgba(0,74,173,0.18)' : '0 2px 8px rgba(0,0,0,0.06)',
              flexShrink: 0,
              scrollSnapAlign: 'start',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Popular badge */}
            {plan.popular && (
              <div style={{ backgroundColor: '#004aad', color: 'white', fontSize: '10px', fontWeight: 800, textAlign: 'center', padding: '4px 0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                ⭐ Mais Popular
              </div>
            )}

            {/* Imagem do plano */}
            <div style={{ width: '100%', height: '110px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {getImage(plan) ? (
                <img
                  src={getImage(plan)}
                  alt={plan.nome}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Wifi style={{ width: '40px', height: '40px', color: 'rgba(0,74,173,0.2)' }} />
              )}
            </div>

            {/* Info */}
            <div style={{ padding: '14px 14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', margin: 0 }}>{plan.nome}</p>

              {/* Velocidade */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap style={{ width: '13px', height: '13px', color: '#004aad' }} />
                <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>{plan.velocidade}</span>
              </div>

              {/* Preço */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginTop: '2px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>R$</span>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#004aad', lineHeight: 1 }}>
                  {plan.valor.toFixed(2).split('.')[0]}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#004aad' }}>,{plan.valor.toFixed(2).split('.')[1]}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '2px' }}>/mês</span>
              </div>

              {/* Benefícios (até 3) */}
              {plan.beneficios?.slice(0, 3).map((b: string, j: number) => (
                <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <Check style={{ width: '9px', height: '9px', color: '#16a34a' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
//  PÁGINA PRINCIPAL DO CLIENTE
// ══════════════════════════════════════════════════════════════
export const ClientHome: React.FC = () => {
  const { profile } = useAuth();
  const navigate    = useNavigate();
  const [modal, setModal] = useState<'pix' | 'segunda_via' | 'desbloqueio' | null>(null);

  const statusConfig = {
    online:  { icon: Wifi,          color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Conectado' },
    offline: { icon: WifiOff,       color: 'text-red-500',     bg: 'bg-red-50',     label: 'Desconectado' },
    blocked: { icon: AlertTriangle, color: 'text-amber-500',   bg: 'bg-amber-50',   label: 'Bloqueado' },
  };
  const status = statusConfig[profile?.statusConexao ?? 'offline'];
  const avatar = getAvatarUrl(profile?.uid ?? '', profile?.fotoUrl);

  return (
    <div className="space-y-6">
      <PixModal         open={modal === 'pix'}         onClose={() => setModal(null)} />
      <SegundaViaModal  open={modal === 'segunda_via'} onClose={() => setModal(null)} />
      <DesbloqueioModal open={modal === 'desbloqueio'} onClose={() => setModal(null)} />

      {/* ── FOTO DE CAPA (definida pelo admin em Configurações → Meu Perfil) ── */}
      <CoverBanner />

      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Olá, {profile?.nome?.split(' ')[0] ?? 'Cliente'}
          </h1>
          <p className="text-slate-500">Nº do cliente: {profile?.numeroCliente}</p>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="h-12 w-12 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-md hover:ring-2 hover:ring-primary transition-all"
        >
          <img src={avatar} alt="Avatar" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        </button>
      </header>

      {/* ── SLIDE DE ANÚNCIOS ── */}
      <AnnouncementSlider />

      {/* Cards status + fatura */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Status da Conexão</span>
              <div className={cn('flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase', status.bg, status.color)}>
                <status.icon className="h-3 w-3" />{status.label}
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
          { label: 'Gerar PIX',   icon: Copy,          color: 'bg-blue-500',    action: () => setModal('pix') },
          { label: '2ª Via',      icon: FileText,       color: 'bg-indigo-500',  action: () => setModal('segunda_via') },
          { label: 'Desbloqueio', icon: AlertTriangle,  color: 'bg-amber-500',   action: () => setModal('desbloqueio') },
          { label: 'Suporte',     icon: Headphones,     color: 'bg-emerald-500', action: () => navigate('/support') },
        ] as const).map((a, i) => (
          <button key={i} onClick={a.action}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:bg-slate-50 hover:shadow-md transition-all active:scale-95">
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-white', a.color)}>
              <a.icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-700">{a.label}</span>
          </button>
        ))}
      </div>

      {/* ── SLIDE DE DISPOSITIVOS ── */}
      <DeviceSlider />

      {/* ── PLANOS DISPONÍVEIS ── */}
      <PlanSection />

      {/* Banner indicação */}
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
