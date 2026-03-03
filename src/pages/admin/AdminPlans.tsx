import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, Button, Input, cn } from '../../components/UI';
import { Plus, Trash2, Edit2, X, Check, Upload, Loader2, ImageIcon } from 'lucide-react';
import { Plan } from '../../types';
import { uploadFileToImgBB, fileToBase64 } from '../../lib/imgbbService';

// ── Upload de imagem via ImgBB ────────────────────────────────────
const ImgUpload: React.FC<{ currentUrl?: string; onUploaded: (url: string) => void; label?: string }> = ({
  currentUrl, onUploaded, label,
}) => {
  const inputRef                    = useRef<HTMLInputElement>(null);
  const [preview,   setPreview  ]   = useState<string | null>(currentUrl || null);
  const [uploading, setUploading]   = useState(false);
  const [error,     setError    ]   = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const b64 = await fileToBase64(file);
    setPreview(b64);
    setUploading(true);
    try {
      const res = await uploadFileToImgBB(file, label || file.name);
      setPreview(res.url); onUploaded(res.url);
    } catch (err: any) {
      setError(err.message || 'Erro no upload'); setPreview(currentUrl || null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      {label && <p className="text-sm font-medium text-slate-700">{label}</p>}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          'relative h-28 w-full rounded-xl border-2 border-dashed overflow-hidden cursor-pointer transition-colors',
          uploading ? 'opacity-60 cursor-not-allowed border-primary/40' : 'hover:border-primary border-slate-200',
          preview && 'border-primary/30',
        )}
      >
        {preview ? (
          <>
            <img src={preview} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" /> Trocar</span>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            {uploading ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : <ImageIcon className="h-7 w-7" />}
            <p className="text-xs">{uploading ? 'Enviando...' : 'Toque para selecionar'}</p>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
export const AdminPlans: React.FC = () => {
  const [plans,     setPlans    ] = useState<Plan[]>([]);
  const [loading,   setLoading  ] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing  ] = useState<Plan | null>(null);
  const [saving,    setSaving   ] = useState(false);

  const [nome,       setNome      ] = useState('');
  const [velocidade, setVelocidade] = useState('');
  const [valor,      setValor     ] = useState('');
  const [beneficios, setBeneficios] = useState('');
  const [popular,    setPopular   ] = useState(false);
  const [imagemUrl,  setImagemUrl ] = useState('');

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'plans'));
      setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() } as Plan)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !velocidade || !valor) return;
    setSaving(true);
    try {
      const data = {
        nome, velocidade,
        valor: parseFloat(valor),
        beneficios: beneficios.split(',').map(b => b.trim()).filter(Boolean),
        popular, imagemUrl,
      };
      if (editing) await updateDoc(doc(db, 'plans', editing.id), data);
      else         await addDoc(collection(db, 'plans'), data);
      resetForm(); await fetchPlans();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const resetForm = () => {
    setNome(''); setVelocidade(''); setValor('');
    setBeneficios(''); setPopular(false); setImagemUrl('');
    setEditing(null); setModalOpen(false);
  };

  const handleEdit = (plan: Plan) => {
    setEditing(plan); setNome(plan.nome); setVelocidade(plan.velocidade);
    setValor(plan.valor.toString()); setBeneficios(plan.beneficios.join(', '));
    setPopular(plan.popular || false); setImagemUrl(plan.imagemUrl || '');
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este plano?')) return;
    try { await deleteDoc(doc(db, 'plans', id)); await fetchPlans(); }
    catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4 md:space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Gerenciar Planos</h1>
          <p className="text-sm text-slate-500">Adicione ou edite os planos oferecidos</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Novo Plano
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map(plan => (
            <Card key={plan.id} className="overflow-hidden p-0 flex flex-col">
              <div className="h-36 bg-slate-100 relative flex-shrink-0">
                {plan.imagemUrl
                  ? <img src={plan.imagemUrl} alt={plan.nome} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  : <div className="h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5"><ImageIcon className="h-10 w-10 text-primary/30" /></div>
                }
                {plan.popular && (
                  <div className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">Mais Popular</div>
                )}
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button onClick={() => handleEdit(plan)} className="p-1.5 bg-white/90 backdrop-blur rounded-full text-slate-600 hover:text-primary shadow-sm transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(plan.id)} className="p-1.5 bg-white/90 backdrop-blur rounded-full text-slate-600 hover:text-red-500 shadow-sm transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="p-4 flex-1">
                <h3 className="font-bold text-slate-900">{plan.nome}</h3>
                <p className="text-xl font-bold text-primary mt-0.5">R$ {plan.valor.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{plan.velocidade}</p>
                <ul className="mt-3 space-y-1.5">
                  {plan.beneficios.map((b, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" /> {b}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
          {plans.length === 0 && (
            <div className="col-span-full text-center py-16 text-sm text-slate-400">
              Nenhum plano cadastrado. Clique em "Novo Plano" para começar.
            </div>
          )}
        </div>
      )}

      {/* Modal — desliza de baixo no mobile, centraliza no desktop */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <Card className="w-full sm:max-w-lg rounded-t-2xl rounded-b-none sm:rounded-2xl max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5 sticky top-0 bg-white z-10 pt-1 pb-3 border-b border-slate-100">
              <h2 className="text-lg font-bold">{editing ? 'Editar Plano' : 'Novo Plano'}</h2>
              <button onClick={resetForm} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <X className="h-4 w-4 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pb-2">
              <Input label="Nome do Plano" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Giga Fibra 500MB" required />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Velocidade" value={velocidade} onChange={e => setVelocidade(e.target.value)} placeholder="500MB" required />
                <Input label="Valor (R$)" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="99.90" required />
              </div>
              <Input label="Benefícios (separados por vírgula)" value={beneficios} onChange={e => setBeneficios(e.target.value)} placeholder="Wi-Fi Grátis, Suporte 24h" />
              <ImgUpload label="Imagem do Plano" currentUrl={imagemUrl} onUploaded={setImagemUrl} />
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                <input type="checkbox" checked={popular} onChange={e => setPopular(e.target.checked)} className="h-4 w-4 accent-primary" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Marcar como "Mais Popular"</p>
                  <p className="text-xs text-slate-500">Destaca no catálogo do cliente</p>
                </div>
              </label>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" className="flex-1" isLoading={saving} disabled={!nome || !velocidade || !valor}>
                  {editing ? 'Salvar' : 'Criar Plano'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
