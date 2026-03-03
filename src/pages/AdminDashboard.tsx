import React, { useState, useRef } from 'react';
import { Card, cn } from '../components/UI';
import { Users, CreditCard, Headphones, ArrowDownRight, Upload, Loader2, CheckCircle, X, ImageIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { uploadFileToImgBB, fileToBase64 } from '../lib/imgbbService';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

// ── Dados do gráfico ─────────────────────────────────────────────
const chartData = [
  { name: 'Jan', revenue: 45000, clients: 400 },
  { name: 'Fev', revenue: 52000, clients: 450 },
  { name: 'Mar', revenue: 48000, clients: 480 },
  { name: 'Abr', revenue: 61000, clients: 520 },
  { name: 'Mai', revenue: 59000, clients: 550 },
  { name: 'Jun', revenue: 68000, clients: 600 },
];

// ── Modal: Gerenciar Imagem do Plano ─────────────────────────────
interface PlanImageModalProps {
  planName: string;
  planId: string;
  currentUrl?: string;
  onClose: () => void;
  onSaved: (planId: string, url: string) => void;
}

const PlanImageModal: React.FC<PlanImageModalProps> = ({ planName, planId, currentUrl, onClose, onSaved }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess(false);

    const base64 = await fileToBase64(file);
    setPreview(base64);
    setUploading(true);

    try {
      const result = await uploadFileToImgBB(file, `plano_${planId}`);

      // Atualiza no Firestore a imagem do plano
      await updateDoc(doc(db, 'plans', planId), { imagemUrl: result.url });

      setPreview(result.url);
      setSuccess(true);
      onSaved(planId, result.url);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar imagem.');
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Imagem do Plano</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-slate-500">{planName}</p>

        {/* Preview da imagem */}
        <div
          className="h-40 w-full rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <div className="text-center space-y-2">
              <ImageIcon className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-400">Clique para selecionar imagem</p>
              <p className="text-xs text-slate-300">JPEG, PNG, WebP — máx. 32MB</p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {error && <p className="text-xs text-red-500 text-center">{error}</p>}

        {success && (
          <p className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
            <CheckCircle className="h-4 w-4" /> Imagem salva com sucesso!
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60"
          >
            {uploading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
              : <><Upload className="h-4 w-4" /> {preview ? 'Trocar imagem' : 'Selecionar'}</>
            }
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Dashboard Principal ──────────────────────────────────────────
export const AdminDashboard: React.FC = () => {
  const [planModal, setPlanModal] = useState<{ id: string; nome: string; url?: string } | null>(null);
  const [planImages, setPlanImages] = useState<Record<string, string>>({});

  const stats = [
    { label: 'Total Clientes',   value: '1,284', icon: Users,        trend: '+12%', color: 'text-blue-600',    bg: 'bg-blue-50' },
    { label: 'Receita Mensal',   value: 'R$ 124k',icon: CreditCard,  trend: '+8.4%',color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Inadimplência',    value: '4.2%',   icon: ArrowDownRight,trend: '-2%',color: 'text-red-600',     bg: 'bg-red-50' },
    { label: 'Chamados Abertos', value: '18',     icon: Headphones,  trend: '-5',   color: 'text-amber-600',   bg: 'bg-amber-50' },
  ];

  // Planos de exemplo (em produção viriam do Firestore)
  const plans = [
    { id: 'plan_500mb', nome: '500MB VG Fibra',  velocidade: '500MB', valor: 99.90 },
    { id: 'plan_800mb', nome: '800MB VG Ultra',  velocidade: '800MB', valor: 129.90 },
    { id: 'plan_1gb',   nome: '1 VG Wi-Fi 6',    velocidade: '1GB',   valor: 199.90 },
  ];

  const handleImageSaved = (planId: string, url: string) => {
    setPlanImages(prev => ({ ...prev, [planId]: url }));
  };

  return (
    <div className="space-y-8">
      {/* Modal de imagem do plano */}
      {planModal && (
        <PlanImageModal
          planId={planModal.id}
          planName={planModal.nome}
          currentUrl={planImages[planModal.id] || planModal.url}
          onClose={() => setPlanModal(null)}
          onSaved={handleImageSaved}
        />
      )}

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Visão geral da VGWEB Telecom</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">Exportar Relatório</button>
          <button className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">Novo Cliente</button>
        </div>
      </header>

      {/* Cards de estatísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', stat.bg, stat.color)}>
                <stat.icon className="h-6 w-6" />
              </div>
              <span className={cn('text-xs font-bold px-2 py-1 rounded-full', stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>
                {stat.trend}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Crescimento de Receita</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="revenue" fill="#004aad" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Novos Assinantes</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="clients" stroke="#004aad" strokeWidth={3} dot={{ r: 4, fill: '#004aad', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Gerenciar imagens dos planos */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Imagens dos Planos</h3>
            <p className="text-sm text-slate-500">Clique em um plano para adicionar ou trocar a imagem (hospedado no ImgBB)</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map(plan => (
            <div
              key={plan.id}
              className="relative rounded-xl overflow-hidden border border-slate-100 cursor-pointer hover:shadow-md transition-all group"
              onClick={() => setPlanModal(plan)}
            >
              {/* Imagem ou placeholder */}
              <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                {planImages[plan.id] ? (
                  <img src={planImages[plan.id]} alt={plan.nome} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-xs">Sem imagem</span>
                  </div>
                )}
                {/* Overlay ao hover */}
                <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex items-center gap-2 text-white text-sm font-medium">
                    <Upload className="h-4 w-4" />
                    {planImages[plan.id] ? 'Trocar imagem' : 'Adicionar imagem'}
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-slate-900 text-sm">{plan.nome}</p>
                <p className="text-xs text-slate-500">{plan.velocidade} · R$ {plan.valor.toFixed(2)}/mês</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Últimos chamados */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">Últimos Chamados</h3>
          <button className="text-sm text-primary font-medium hover:underline">Ver todos</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Assunto</th>
                <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { name: 'João Silva',    subject: 'Lentidão na conexão',  date: 'Hoje, 10:45',    status: 'Aberto',        color: 'text-amber-600',   bg: 'bg-amber-50' },
                { name: 'Maria Oliveira',subject: 'Dúvida na fatura',     date: 'Hoje, 09:12',    status: 'Em andamento',  color: 'text-blue-600',    bg: 'bg-blue-50' },
                { name: 'Carlos Souza', subject: 'Mudança de endereço',   date: 'Ontem, 16:30',   status: 'Fechado',       color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map((ticket, i) => (
                <tr key={i} className="group hover:bg-slate-50 transition-colors">
                  <td className="py-4 font-medium text-slate-700">{ticket.name}</td>
                  <td className="py-4 text-slate-600">{ticket.subject}</td>
                  <td className="py-4 text-slate-500 text-sm">{ticket.date}</td>
                  <td className="py-4">
                    <span className={cn('px-2 py-1 rounded-full text-[10px] font-bold uppercase', ticket.bg, ticket.color)}>
                      {ticket.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
