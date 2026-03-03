import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Input, cn } from '../../components/UI';
import {
  Shield, Bell, Database, Key, Link,
  CheckCircle, AlertCircle, Image, Upload, Loader2,
  Trash2, Eye, EyeOff, Plus, Monitor, User, Camera, Globe,
} from 'lucide-react';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, setDoc, getDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadFileToImgBB, fileToBase64 } from '../../lib/imgbbService';
import { useAuth } from '../../contexts/AuthContext';
import type { Announcement, DeviceImage, Plan } from '../../types';

// ─── SaveIcon inline (evita conflito com lucide Save) ─────────
const SaveIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
    <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/>
    <path d="M7 3v4a1 1 0 0 0 1 1h7"/>
  </svg>
);

// ─── UploadZone genérico ────────────────────────────────────────
interface UploadZoneProps {
  currentUrl?: string;
  onUploaded: (url: string) => void;
  label?: string;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  uploadName?: string;
  height?: number;  // px
}

const UploadZone: React.FC<UploadZoneProps> = ({
  currentUrl, onUploaded, label, uploading, setUploading, uploadName, height = 144,
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(currentUrl || '');
  const [error, setError] = useState('');

  useEffect(() => { setPreview(currentUrl || ''); }, [currentUrl]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const b64 = await fileToBase64(file);
    setPreview(b64);
    setUploading(true);
    try {
      const result = await uploadFileToImgBB(file, uploadName || file.name);
      setPreview(result.url);
      onUploaded(result.url);
    } catch (err: any) {
      setError(err.message || 'Erro no upload');
      setPreview(currentUrl || '');
    } finally {
      setUploading(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-slate-700">{label}</p>}
      <div
        onClick={() => !uploading && ref.current?.click()}
        style={{ position: 'relative', width: '100%', height: `${height}px` }}
        className={cn(
          'rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-colors',
          preview ? 'border-primary/30' : 'border-slate-200 hover:border-primary',
          uploading && 'opacity-60 cursor-not-allowed',
        )}
      >
        {preview ? (
          <>
            <img src={preview} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-medium flex items-center gap-2"><Upload className="h-4 w-4" /> Trocar imagem</span>
            </div>
          </>
        ) : (
          <div className="text-center space-y-2 text-slate-400">
            {uploading ? <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" /> : <Image className="h-8 w-8 mx-auto" />}
            <p className="text-xs">{uploading ? 'Enviando para ImgBB...' : 'Clique para selecionar'}</p>
            <p className="text-[10px] text-slate-300">JPEG, PNG, WebP — máx 32MB</p>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
};

// ─── Aba: Meu Perfil ───────────────────────────────────────────
const TabPerfilAdmin: React.FC = () => {
  const { profile } = useAuth();
  const avatarInputRef  = useRef<HTMLInputElement>(null);
  const coverInputRef   = useRef<HTMLInputElement>(null);
  const loginBgInputRef = useRef<HTMLInputElement>(null);

  const [avatarPreview,   setAvatarPreview  ] = useState('');
  const [coverPreview,    setCoverPreview   ] = useState('');
  const [loginBgPreview,  setLoginBgPreview ] = useState('');
  const [uploadingAvatar,  setUploadingAvatar ] = useState(false);
  const [uploadingCover,   setUploadingCover  ] = useState(false);
  const [uploadingLoginBg, setUploadingLoginBg] = useState(false);
  const [avatarSaved,  setAvatarSaved ] = useState(false);
  const [coverSaved,   setCoverSaved  ] = useState(false);
  const [loginBgSaved, setLoginBgSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (profile?.fotoUrl) setAvatarPreview(profile.fotoUrl);
    if (!profile?.uid) return;
    getDoc(doc(db, 'adminSettings', 'profile'))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.coverUrl)   setCoverPreview(d.coverUrl);
          if (d.loginBgUrl) setLoginBgPreview(d.loginBgUrl);
          if (d.avatarUrl && !profile.fotoUrl) setAvatarPreview(d.avatarUrl);
        }
      })
      .catch(() => {});
  }, [profile?.uid, profile?.fotoUrl]);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setErrorMsg(''); setAvatarSaved(false);
    const b64 = await fileToBase64(file);
    setAvatarPreview(b64);
    setUploadingAvatar(true);
    try {
      const result = await uploadFileToImgBB(file, `admin_avatar_${profile.uid}`);
      setAvatarPreview(result.url);
      await updateDoc(doc(db, 'users', profile.uid), { fotoUrl: result.url });
      await setDoc(doc(db, 'adminSettings', 'profile'), { avatarUrl: result.url }, { merge: true });
      setAvatarSaved(true);
      setTimeout(() => setAvatarSaved(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao enviar foto de perfil');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setErrorMsg(''); setCoverSaved(false);
    const b64 = await fileToBase64(file);
    setCoverPreview(b64);
    setUploadingCover(true);
    try {
      const result = await uploadFileToImgBB(file, `admin_cover_${profile.uid}`);
      setCoverPreview(result.url);
      await setDoc(doc(db, 'adminSettings', 'profile'), { coverUrl: result.url }, { merge: true });
      setCoverSaved(true);
      setTimeout(() => setCoverSaved(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao enviar foto de capa');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleLoginBgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setErrorMsg(''); setLoginBgSaved(false);
    const b64 = await fileToBase64(file);
    setLoginBgPreview(b64);
    setUploadingLoginBg(true);
    try {
      const result = await uploadFileToImgBB(file, `login_bg_${profile.uid}`);
      setLoginBgPreview(result.url);
      await setDoc(doc(db, 'adminSettings', 'profile'), { loginBgUrl: result.url }, { merge: true });
      setLoginBgSaved(true);
      setTimeout(() => setLoginBgSaved(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao enviar plano de fundo');
    } finally {
      setUploadingLoginBg(false);
      if (loginBgInputRef.current) loginBgInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">

        {/* ══ FOTO DE CAPA — altura fixa 160px, clicável ══ */}
        <div
          onClick={() => !uploadingCover && coverInputRef.current?.click()}
          style={{
            position: 'relative',
            width: '100%',
            height: '160px',
            cursor: uploadingCover ? 'not-allowed' : 'pointer',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(0,74,173,0.15) 0%, rgba(0,74,173,0.05) 100%)',
          }}
        >
          {/* Imagem de capa ocupa 100% */}
          {coverPreview && (
            <img
              src={coverPreview}
              alt="Capa"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
              referrerPolicy="no-referrer"
            />
          )}

          {/* Overlay de instruções */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
            backgroundColor: coverPreview ? 'rgba(0,0,0,0)' : 'transparent',
            transition: 'background-color 0.2s',
          }}
            className="group hover:!bg-black/30"
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              backgroundColor: coverPreview ? 'rgba(255,255,255,0.15)' : 'rgba(0,74,173,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {uploadingCover
                ? <Loader2 style={{ width: '24px', height: '24px', color: 'white', animation: 'spin 1s linear infinite' }} />
                : <Camera style={{ width: '24px', height: '24px', color: coverPreview ? 'rgba(255,255,255,0.7)' : 'rgba(0,74,173,0.5)' }} />
              }
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: coverPreview ? 'rgba(255,255,255,0.8)' : 'rgba(0,74,173,0.6)' }}>
              {uploadingCover ? 'Enviando...' : (coverPreview ? 'Trocar foto de capa' : 'Clique para adicionar foto de capa')}
            </span>
            {!coverPreview && (
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Aparece no início da página do cliente</span>
            )}
          </div>

          {/* Badge salvo */}
          {coverSaved && (
            <div style={{
              position: 'absolute', top: '12px', right: '12px',
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: '#16a34a', color: 'white',
              padding: '6px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.20)',
            }}>
              <CheckCircle style={{ width: '14px', height: '14px' }} /> Capa salva!
            </div>
          )}

          <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverFile} />
        </div>

        {/* ══ AVATAR sobre a capa ══ */}
        <div className="px-6 pb-6">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginTop: '-40px', marginBottom: '20px' }}>

            {/* Círculo do avatar */}
            <div
              style={{ position: 'relative', flexShrink: 0, cursor: uploadingAvatar ? 'not-allowed' : 'pointer' }}
              onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
            >
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                border: '4px solid white', boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                overflow: 'hidden', backgroundColor: '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                ) : (
                  <User style={{ width: '36px', height: '36px', color: 'rgba(0,74,173,0.3)' }} />
                )}
              </div>

              {/* Botão câmera */}
              <div style={{
                position: 'absolute', bottom: '-2px', right: '-2px',
                width: '28px', height: '28px', borderRadius: '50%',
                backgroundColor: '#004aad', border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.20)',
              }}>
                {uploadingAvatar
                  ? <Loader2 style={{ width: '13px', height: '13px', color: 'white', animation: 'spin 1s linear infinite' }} />
                  : <Camera style={{ width: '13px', height: '13px', color: 'white' }} />
                }
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
            </div>

            {/* Nome e cargo */}
            <div style={{ paddingBottom: '4px' }}>
              <p style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a' }}>{profile?.nome || 'Administrador'}</p>
              <p style={{ fontSize: '13px', color: '#64748b' }}>{profile?.email}</p>
              {avatarSaved && (
                <p style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <CheckCircle style={{ width: '13px', height: '13px' }} /> Foto de perfil salva!
                </p>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs text-red-600">{errorMsg}</p>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">📷 Foto de Perfil</p>
              <p className="text-xs text-blue-600">Clique no círculo do avatar para alterar sua foto.</p>
            </div>
            <div className="p-4 rounded-xl bg-violet-50 border border-violet-100">
              <p className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-1">🖼️ Foto de Capa</p>
              <p className="text-xs text-violet-600">Clique na área de capa acima. Aparece na tela inicial do cliente.</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ══ PLANO DE FUNDO DA TELA DE LOGIN ══ */}
      <Card className="space-y-4">
        <div>
          <p className="font-bold text-slate-900 flex items-center gap-2">
            <span style={{ fontSize: '16px' }}>🔐</span> Plano de Fundo da Tela de Login
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Aparece como fundo na página de login do sistema. Recomendado: imagem paisagem 1280×720 ou maior.
          </p>
        </div>

        {/* Zona de upload */}
        <div
          onClick={() => !uploadingLoginBg && loginBgInputRef.current?.click()}
          style={{
            position: 'relative',
            width: '100%',
            height: '200px',
            borderRadius: '12px',
            overflow: 'hidden',
            cursor: uploadingLoginBg ? 'not-allowed' : 'pointer',
            border: loginBgPreview ? '2px solid rgba(0,74,173,0.2)' : '2px dashed #cbd5e1',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loginBgPreview && (
            <img
              src={loginBgPreview}
              alt="Plano de fundo login"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
              referrerPolicy="no-referrer"
            />
          )}

          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            {uploadingLoginBg ? (
              <>
                <Loader2 style={{ width: '28px', height: '28px', color: loginBgPreview ? 'white' : '#004aad', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '13px', fontWeight: 500, color: loginBgPreview ? 'white' : '#004aad' }}>Enviando imagem...</span>
              </>
            ) : !loginBgPreview ? (
              <>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  backgroundColor: 'rgba(0,74,173,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Image style={{ width: '22px', height: '22px', color: 'rgba(0,74,173,0.4)' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Clique para escolher a imagem de fundo</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>JPEG, PNG, WebP — recomendado 1280×720px ou maior</span>
              </>
            ) : null}
          </div>

          {/* Botão trocar (quando já há imagem) */}
          {loginBgPreview && !uploadingLoginBg && (
            <div style={{
              position: 'absolute', bottom: '10px', right: '10px',
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
              color: 'white', padding: '5px 12px', borderRadius: '99px',
              fontSize: '12px', fontWeight: 500,
            }}>
              <Camera style={{ width: '13px', height: '13px' }} /> Trocar imagem
            </div>
          )}

          {/* Badge salvo */}
          {loginBgSaved && (
            <div style={{
              position: 'absolute', top: '10px', right: '10px',
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: '#16a34a', color: 'white',
              padding: '5px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.20)',
            }}>
              <CheckCircle style={{ width: '13px', height: '13px' }} /> Plano de fundo salvo!
            </div>
          )}

          <input
            ref={loginBgInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleLoginBgFile}
          />
        </div>

        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2">
          <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>💡</span>
          <p className="text-xs text-amber-700">
            Para melhor resultado, use uma imagem horizontal com resolução mínima de 1280×720 pixels.
          </p>
        </div>
      </Card>
    </div>
  );
};

// ─── Aba: Dispositivos ──────────────────────────────────────────
const TabDispositivos: React.FC = () => {
  const [devices, setDevices] = useState<DeviceImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl]   = useState('');
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'deviceImages'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as DeviceImage));
      all.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
      setDevices(all);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newNome || !newUrl) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'deviceImages'), { nome: newNome, descricao: newDesc, imagemUrl: newUrl, ativo: true, criadoEm: new Date().toISOString() });
      setNewNome(''); setNewDesc(''); setNewUrl('');
      await load();
    } finally { setSaving(false); }
  };

  const toggleAtivo = async (d: DeviceImage) => {
    await updateDoc(doc(db, 'deviceImages', d.id), { ativo: !d.ativo });
    setDevices(prev => prev.map(x => x.id === d.id ? { ...x, ativo: !x.ativo } : x));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este dispositivo?')) return;
    await deleteDoc(doc(db, 'deviceImages', id));
    setDevices(prev => prev.filter(x => x.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-2"><Monitor className="h-5 w-5 text-primary" /> Adicionar Dispositivo</h3>
        <UploadZone label="Foto do dispositivo" currentUrl={newUrl} onUploaded={setNewUrl} uploading={uploading} setUploading={setUploading} uploadName="device" height={160} />
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Nome" placeholder="Ex: Roteador Wi-Fi 6" value={newNome} onChange={e => setNewNome(e.target.value)} />
          <Input label="Descrição (opcional)" placeholder="Ex: Dual Band 3000Mbps" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleAdd} isLoading={saving} disabled={!newNome || !newUrl || uploading} className="gap-2">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <h3 className="font-bold text-slate-900">Dispositivos Cadastrados ({devices.filter(d => d.ativo).length} visíveis)</h3>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          : devices.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">Nenhum dispositivo ainda.</p>
          : (
            <div className="grid gap-3 md:grid-cols-2">
              {devices.map(d => (
                <div key={d.id} className={cn('flex gap-3 p-3 rounded-xl border', d.ativo ? 'border-slate-100' : 'border-slate-100 opacity-50')}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid #f1f5f9' }}>
                    <img src={d.imagemUrl} alt={d.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{d.nome}</p>
                    {d.descricao && <p className="text-xs text-slate-400 truncate">{d.descricao}</p>}
                    <span className={cn('mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold', d.ativo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                      {d.ativo ? '● Visível' : '● Oculto'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => toggleAtivo(d)} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-slate-100">
                      {d.ativo ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
                    </button>
                    <button onClick={() => handleDelete(d.id)} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-50">
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </Card>
    </div>
  );
};

// ─── Aba: Planos ────────────────────────────────────────────────
const TabPlanos: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    getDocs(collection(db, 'plans'))
      .then(snap => setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() } as Plan))))
      .catch(e => console.warn(e))
      .finally(() => setLoading(false));
  }, []);

  const handleUploaded = async (planId: string, url: string) => {
    await updateDoc(doc(db, 'plans', planId), { imagemUrl: url });
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, imagemUrl: url } : p));
  };

  return (
    <Card className="space-y-4">
      <h3 className="font-bold text-slate-900 flex items-center gap-2"><Image className="h-5 w-5 text-primary" /> Imagens dos Planos</h3>
      {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : plans.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">Nenhum plano. Cadastre em "Gerenciar Planos".</p>
        : (
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map(plan => (
              <div key={plan.id} className="space-y-2">
                <UploadZone
                  label={plan.nome}
                  currentUrl={plan.imagemUrl}
                  onUploaded={url => handleUploaded(plan.id, url)}
                  uploading={uploadingId === plan.id}
                  setUploading={v => setUploadingId(v ? plan.id : null)}
                  uploadName={`plano_${plan.id}`}
                  height={120}
                />
                <p className="text-xs text-slate-500 text-center">{plan.velocidade} · R$ {Number(plan.valor).toFixed(2)}/mês</p>
              </div>
            ))}
          </div>
        )}
    </Card>
  );
};

// ─── Aba: Anúncios ──────────────────────────────────────────────
const TabAnuncios: React.FC = () => {
  const [anuncios, setAnuncios] = useState<Announcement[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', link: '', imagemUrl: '' });

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'announcements'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
      all.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
      setAnuncios(all);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.titulo || !form.imagemUrl) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'announcements'), { ...form, ativo: true, ordem: anuncios.length, criadoEm: new Date().toISOString() });
      setForm({ titulo: '', descricao: '', link: '', imagemUrl: '' });
      await load();
    } finally { setSaving(false); }
  };

  const toggleAtivo = async (a: Announcement) => {
    await updateDoc(doc(db, 'announcements', a.id), { ativo: !a.ativo });
    setAnuncios(prev => prev.map(x => x.id === a.id ? { ...x, ativo: !x.ativo } : x));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este anúncio?')) return;
    await deleteDoc(doc(db, 'announcements', id));
    setAnuncios(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h3 className="font-bold text-slate-900 flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> Novo Anúncio / Banner</h3>
        <UploadZone label="Imagem do banner" currentUrl={form.imagemUrl} onUploaded={url => setForm(p => ({ ...p, imagemUrl: url }))} uploading={uploading} setUploading={setUploading} uploadName="banner" height={190} />
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Título" placeholder="Ex: Promoção de Julho!" value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} />
          <Input label="Link (opcional)" placeholder="https://..." value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))} />
          <div className="md:col-span-2">
            <Input label="Descrição (opcional)" placeholder="Texto exibido sobre o banner" value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleAdd} isLoading={saving} disabled={!form.titulo || !form.imagemUrl || uploading} className="gap-2">
            <Plus className="h-4 w-4" /> Publicar Anúncio
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <h3 className="font-bold text-slate-900">
          Anúncios Publicados
          <span className="ml-2 text-xs font-normal text-slate-400">({anuncios.filter(a => a.ativo).length} visíveis de {anuncios.length})</span>
        </h3>
        {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          : anuncios.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">Nenhum anúncio. Crie o primeiro acima!</p>
          : (
            <div className="space-y-3">
              {anuncios.map(a => (
                <div key={a.id} className={cn('flex gap-4 p-3 rounded-xl border', a.ativo ? 'border-slate-100 bg-white' : 'border-slate-100 bg-slate-50 opacity-60')}>
                  <div style={{ width: '140px', height: '80px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                    <img src={a.imagemUrl} alt={a.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{a.titulo}</p>
                    {a.descricao && <p className="text-xs text-slate-400 mt-0.5">{a.descricao}</p>}
                    {a.link && <a href={a.link} target="_blank" rel="noreferrer" className="text-xs text-primary mt-1 inline-flex items-center gap-1 hover:underline"><Link className="h-3 w-3" /> {a.link}</a>}
                    <span className={cn('mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold', a.ativo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', a.ativo ? 'bg-emerald-500' : 'bg-slate-400')} />
                      {a.ativo ? 'Visível para clientes' : 'Oculto'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => toggleAtivo(a)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100">
                      {a.ativo ? <Eye className="h-4 w-4 text-emerald-500" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-red-50">
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </Card>
    </div>
  );
};

// ─── Aba Mídia ─────────────────────────────────────────────────
type MidiaTab = 'anuncios' | 'dispositivos';
const TabMidia: React.FC = () => {
  const [sub, setSub] = useState<MidiaTab>('anuncios');
  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {([{ id: 'anuncios', label: '📢 Anúncios' }, { id: 'dispositivos', label: '📡 Dispositivos' }] as const).map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-all', sub === t.id ? 'bg-primary text-white shadow-md' : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50')}>
            {t.label}
          </button>
        ))}
      </div>
      {sub === 'anuncios'     && <TabAnuncios />}
      {sub === 'dispositivos' && <TabDispositivos />}
    </div>
  );
};

// ─── Aba Geral ──────────────────────────────────────────────────
const TabGeral: React.FC = () => {
  const [saved, setSaved] = useState(false);
  return (
    <div className="space-y-6">
      <Card className="space-y-6">
        <h3 className="text-lg font-bold text-slate-900">Informações da Empresa</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nome Fantasia"     defaultValue="VGWEB Telecom" />
          <Input label="CNPJ"              defaultValue="00.000.000/0001-00" />
          <Input label="E-mail de Contato" defaultValue="contato@VGWEB.com.br" />
          <Input label="Telefone/WhatsApp" defaultValue="(00) 00000-0000" />
          <Input label="Cidade"            defaultValue="São Paulo" />
          <Input label="Estado"            defaultValue="SP" />
        </div>
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }} className="gap-2">
            {saved ? <><CheckCircle className="h-4 w-4" /> Salvo!</> : <><SaveIcon /> Salvar</>}
          </Button>
        </div>
      </Card>
    </div>
  );
};

// ─── Aba Segurança ──────────────────────────────────────────────
const TabSeguranca: React.FC = () => {
  const [show, setShow] = useState(false);
  return (
    <Card className="space-y-6">
      <h3 className="text-lg font-bold text-slate-900">Alterar Senha</h3>
      <div className="space-y-4">
        <Input label="Senha Atual"          type={show ? 'text' : 'password'} placeholder="••••••••" />
        <Input label="Nova Senha"           type={show ? 'text' : 'password'} placeholder="••••••••" />
        <Input label="Confirmar Nova Senha" type={show ? 'text' : 'password'} placeholder="••••••••" />
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" onChange={e => setShow(e.target.checked)} /> Mostrar senhas
        </label>
      </div>
      <div className="flex justify-end">
        <Button className="gap-2"><Key className="h-4 w-4" /> Atualizar Senha</Button>
      </div>
    </Card>
  );
};

// ─── Aba Notificações ───────────────────────────────────────────
const TabNotificacoes: React.FC = () => {
  const [t, setT] = useState({ novoPagamento: true, atraso: true, novoChamado: true, clienteBloqueado: false, relatorioSemanal: true });
  const toggle = (k: keyof typeof t) => setT(p => ({ ...p, [k]: !p[k] }));
  return (
    <Card className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">Preferências de Notificação</h3>
      <div className="space-y-3">
        {([
          { k: 'novoPagamento' as const,    l: 'Novo Pagamento Recebido',  d: 'Alerta ao confirmar PIX/boleto' },
          { k: 'atraso' as const,           l: 'Fatura em Atraso',         d: 'Notifica clientes inadimplentes' },
          { k: 'novoChamado' as const,      l: 'Novo Chamado de Suporte',  d: 'Alerta ao abrir ticket' },
          { k: 'clienteBloqueado' as const, l: 'Cliente Bloqueado',        d: 'Bloqueio por inadimplência' },
          { k: 'relatorioSemanal' as const, l: 'Relatório Semanal',        d: 'Resumo toda segunda-feira' },
        ]).map(item => (
          <div key={item.k} className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
            <div><p className="font-medium text-sm text-slate-900">{item.l}</p><p className="text-xs text-slate-500">{item.d}</p></div>
            <button onClick={() => toggle(item.k)} className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', t[item.k] ? 'bg-primary' : 'bg-slate-300')}>
              <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', t[item.k] ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button className="gap-2"><SaveIcon /> Salvar</Button>
      </div>
    </Card>
  );
};

// ─── Aba Integrações ────────────────────────────────────────────
const TabIntegracoes: React.FC = () => {
  const [ixcUrl, setIxcUrl]     = useState('');
  const [ixcToken, setIxcToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting]   = useState(false);
  const [saved, setSaved]       = useState(false);
  const [status, setStatus]     = useState<'idle' | 'ok' | 'error'>('idle');
  const [msg, setMsg]           = useState('');
  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/ixc` : '';

  const test = async () => {
    if (!ixcUrl || !ixcToken) { setStatus('error'); setMsg('Preencha URL e Token.'); return; }
    setTesting(true); setStatus('idle');
    try {
      const res = await fetch('/api/ixc/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ixcUrl, ixcToken }) });
      const data = await res.json();
      res.ok && data.ok ? (setStatus('ok'), setMsg('Conectado!')) : (setStatus('error'), setMsg(data.error || 'Falha.'));
    } catch { setStatus('error'); setMsg('Servidor inacessível.'); }
    finally { setTesting(false); }
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-md"><span className="text-white font-black text-lg">IX</span></div>
          <div><h3 className="font-bold text-slate-900">IXC Soft — ERP do Provedor</h3><p className="text-xs text-slate-500">Clientes, faturas, status e desbloqueios</p></div>
          {status === 'ok' && <span className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Conectado</span>}
        </div>
        <div className="h-px bg-slate-100" />
        <Input label="URL do Servidor IXC" placeholder="https://ixc.suaempresa.com.br" value={ixcUrl} onChange={e => setIxcUrl(e.target.value)} />
        <div className="relative">
          <Input label="Token de Acesso" type={showToken ? 'text' : 'password'} placeholder="Cole o token gerado no IXC" value={ixcToken} onChange={e => setIxcToken(e.target.value)} />
          <button type="button" onClick={() => setShowToken(v => !v)} className="absolute right-3 top-8 text-xs text-slate-400 hover:text-primary">{showToken ? 'Ocultar' : 'Mostrar'}</button>
        </div>
        {status !== 'idle' && (
          <div className={cn('flex items-center gap-3 p-3 rounded-xl text-sm font-medium', status === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200')}>
            {status === 'ok' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} {msg}
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={test} isLoading={testing} className="gap-2"><Link className="h-4 w-4" /> Testar Conexão</Button>
          <Button size="sm" className="gap-2 ml-auto" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }}>
            {saved ? <><CheckCircle className="h-4 w-4" /> Salvo!</> : <><SaveIcon /> Salvar</>}
          </Button>
        </div>
      </Card>
      <Card className="space-y-4">
        <h3 className="font-bold text-slate-900">Webhook — Notificações Automáticas</h3>
        <div className="p-4 bg-slate-50 rounded-xl space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">URL para cadastrar no IXC</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 break-all">{webhookUrl}</code>
            <button onClick={() => navigator.clipboard.writeText(webhookUrl)} className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100">
              <CheckCircle className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-xs font-semibold text-blue-800">Como cadastrar:</p>
          <p className="text-xs text-blue-700 mt-1">IXC → <strong>Configurações → Integrações → Webhooks → Novo</strong> → cole a URL → eventos: Bloqueio, Desbloqueio, Pagamento.</p>
        </div>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
type Tab = 'perfil' | 'geral' | 'midia' | 'seguranca' | 'notificacoes' | 'integracoes';

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('perfil');

  const tabs: { id: Tab; icon: React.ElementType; label: string; badge?: string }[] = [
    { id: 'perfil',       icon: User,     label: 'Meu Perfil',    badge: 'NOVO' },
    { id: 'geral',        icon: Globe,    label: 'Geral' },
    { id: 'midia',        icon: Image,    label: 'Mídia' },
    { id: 'seguranca',    icon: Shield,   label: 'Segurança' },
    { id: 'notificacoes', icon: Bell,     label: 'Notificações' },
    { id: 'integracoes',  icon: Database, label: 'Integrações' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Configurações do Sistema</h1>
        <p className="text-slate-500">Ajuste os parâmetros da VGWEB Telecom</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all text-left',
                activeTab === tab.id ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100')}>
              <tab.icon className="h-5 w-5 flex-shrink-0" />
              {tab.label}
              {tab.badge && (
                <span className={cn('ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide',
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary')}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="md:col-span-2">
          {activeTab === 'perfil'       && <TabPerfilAdmin />}
          {activeTab === 'geral'        && <TabGeral />}
          {activeTab === 'midia'        && <TabMidia />}
          {activeTab === 'seguranca'    && <TabSeguranca />}
          {activeTab === 'notificacoes' && <TabNotificacoes />}
          {activeTab === 'integracoes'  && <TabIntegracoes />}
        </div>
      </div>
    </div>
  );
};
