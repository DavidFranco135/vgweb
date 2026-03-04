import React, { useState, useRef, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Doc, PROVEDOR_ID } from '../lib/tenant';
import { setDoc, getDoc } from 'firebase/firestore';
import { Button, Input } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Building2 } from 'lucide-react';
import { uploadFileToImgBB, fileToBase64 } from '../lib/imgbbService';
import { AvatarCircle } from '../components/AvatarCircle';

// ── Helper: email com sufixo do provedor ─────────────────────────
function toAuthEmail(realEmail: string): string {
  const base   = realEmail.toLowerCase().trim();
  const suffix = `+${PROVEDOR_ID}`;
  if (base.endsWith(suffix)) return base;
  const [local, domain] = base.split('@');
  return `${local}${suffix}@${domain}`;
}

// ── Tela de Primeiro Acesso Admin ────────────────────────────────
const PrimeiroAcessoAdmin: React.FC<{
  uid:         string;
  email:       string;
  bgUrl:       string;
  onConcluido: () => void;
}> = ({ uid, email, bgUrl, onConcluido }) => {
  const [nome,      setNome     ] = useState('');
  const [telefone,  setTelefone ] = useState('');
  const [loading,   setLoading  ] = useState(false);
  const [erro,      setErro     ] = useState('');

  const avatarInputRef                      = useRef<HTMLInputElement>(null);
  const [avatarSrc,   setAvatarSrc  ]       = useState('');
  const [avatarUrl,   setAvatarUrl  ]       = useState('');
  const [uploadingAv, setUploadingAv]       = useState(false);
  const [avStatus,    setAvStatus   ]       = useState<'idle'|'ok'|'error'>('idle');

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAv(true); setAvStatus('idle');
    const b64 = await fileToBase64(file);
    setAvatarSrc(b64);
    try {
      const res = await uploadFileToImgBB(file, `avatar_admin_${Date.now()}`);
      setAvatarUrl(res.url); setAvatarSrc(res.url); setAvStatus('ok');
    } catch {
      setAvatarUrl(''); setAvatarSrc(''); setAvStatus('error');
    } finally {
      setUploadingAv(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const concluir = async () => {
    if (!nome.trim()) { setErro('Informe seu nome.'); return; }
    setLoading(true); setErro('');
    try {
      await setDoc(Doc.user(uid), {
        uid,
        nome:          nome.trim(),
        email,
        cpf:           '',
        tipo:          'admin',
        statusConexao: 'online',
        numeroCliente: '',
        telefone:      telefone.trim(),
        fotoUrl:       avatarUrl || null,
        provedor:      PROVEDOR_ID,
        endereco:      { rua: '', numero: '', bairro: '', cidade: '', cep: '' },
      });
      onConcluido();
    } catch {
      setErro('Erro ao salvar. Tente novamente.');
    } finally { setLoading(false); }
  };

  const g = !!bgUrl;

  return (
    <div style={{
      width: '100%', maxWidth: '448px', borderRadius: '24px', padding: '32px',
      backgroundColor: g ? 'rgba(255,255,255,0.18)' : 'white',
      backdropFilter: g ? 'blur(16px) saturate(1.5)' : 'none',
      WebkitBackdropFilter: g ? 'blur(16px) saturate(1.5)' : 'none',
      boxShadow: g ? '0 8px 48px rgba(0,0,0,0.22), inset 0 0 0 1px rgba(255,255,255,0.25)' : '0 4px 24px rgba(0,0,0,0.08)',
      border: g ? '1px solid rgba(255,255,255,0.28)' : '1px solid #f1f5f9',
    }}>
      {g && <style>{`.fg label{color:rgba(255,255,255,0.92)!important;text-shadow:0 1px 3px rgba(0,0,0,0.3)}.fg input{background:rgba(255,255,255,0.18)!important;border-color:rgba(255,255,255,0.35)!important;color:white!important}.fg input::placeholder{color:rgba(255,255,255,0.50)!important}.fg input:focus{background:rgba(255,255,255,0.25)!important;border-color:rgba(255,255,255,0.70)!important;box-shadow:0 0 0 3px rgba(255,255,255,0.15)}`}</style>}
      {!g && <style>{`.fg input{background:#f1f5f9!important;border-color:#cbd5e1!important;color:#0f172a!important}.fg input::placeholder{color:#94a3b8!important}.fg input:focus{background:#e8f0fe!important;border-color:#004aad!important;box-shadow:0 0 0 3px rgba(0,74,173,0.10)}.fg label{color:#374151!important}`}</style>}

      <div className="fg">
        {/* Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div style={{ width:56, height:56, borderRadius:'16px', background:'linear-gradient(135deg,#004aad,#0070f3)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
            <Building2 style={{ width:28, height:28, color:'white' }} />
          </div>
          <h2 style={{ fontSize:'20px', fontWeight:800, color: g ? 'white' : '#0f172a', textShadow: g ? '0 1px 4px rgba(0,0,0,0.4)' : 'none' }}>
            Primeiro Acesso
          </h2>
          <p style={{ fontSize:'13px', marginTop:6, color: g ? 'rgba(255,255,255,0.75)' : '#64748b' }}>
            Configure sua conta de administrador para começar a usar o sistema.
          </p>
        </div>

        {/* Foto */}
        <div className="flex flex-col items-center mb-5">
          <p style={{ fontSize:'13px', color: g ? 'rgba(255,255,255,0.85)' : '#64748b', marginBottom:10, fontWeight:500 }}>
            Foto de perfil <span style={{ color: g ? 'rgba(255,255,255,0.50)' : '#94a3b8' }}>(opcional)</span>
          </p>
          <AvatarCircle src={avatarSrc} size={80} loading={uploadingAv} onClick={() => !uploadingAv && avatarInputRef.current?.click()} />
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }} onChange={handleAvatarChange} />
          <div style={{ height:18, marginTop:8 }}>
            {uploadingAv                        && <p style={{ fontSize:'12px', color: g ? 'white' : '#004aad' }}>Enviando...</p>}
            {!uploadingAv && avStatus === 'ok'  && <p style={{ fontSize:'12px', color: g ? '#86efac' : '#16a34a', display:'flex', alignItems:'center', gap:4 }}><CheckCircle style={{ width:12, height:12 }} /> Foto adicionada!</p>}
            {!uploadingAv && avStatus === 'idle'&& <p style={{ fontSize:'12px', color: g ? 'rgba(255,255,255,0.55)' : '#94a3b8' }}>Toque no círculo para adicionar</p>}
          </div>
        </div>

        {/* Email readonly */}
        <div className="space-y-4">
          <div>
            <label style={{ fontSize:'13px', fontWeight:600, display:'block', marginBottom:6, color: g ? 'rgba(255,255,255,0.92)' : '#374151' }}>E-mail</label>
            <div style={{ padding:'10px 14px', borderRadius:'12px', background: g ? 'rgba(255,255,255,0.10)' : '#f8fafc', border: g ? '1px solid rgba(255,255,255,0.20)' : '1px solid #e2e8f0', color: g ? 'rgba(255,255,255,0.70)' : '#94a3b8', fontSize:'14px' }}>
              {email}
            </div>
          </div>
          <Input label="Seu nome completo" placeholder="Ex: João Silva"      value={nome}     onChange={e => setNome(e.target.value)}     required />
          <Input label="Telefone / WhatsApp" placeholder="(00) 90000-0000"   value={telefone} onChange={e => setTelefone(e.target.value)} />
        </div>

        {erro && (
          <div style={{ marginTop:16, padding:'10px 14px', borderRadius:'12px', backgroundColor: g ? 'rgba(239,68,68,0.25)' : '#fef2f2', border: g ? '1px solid rgba(239,68,68,0.45)' : '1px solid #fecaca' }}>
            <p style={{ fontSize:'13px', color: g ? '#fca5a5' : '#dc2626', textAlign:'center' }}>{erro}</p>
          </div>
        )}

        <Button onClick={concluir} isLoading={loading} className="w-full mt-5">
          Concluir Configuração
        </Button>

        <p style={{ marginTop:16, fontSize:'11px', textAlign:'center', color: g ? 'rgba(255,255,255,0.40)' : '#cbd5e1', letterSpacing:'0.06em', userSelect:'none' }}>
          Produzido por ®Niklaus
        </p>
      </div>
    </div>
  );
};

// ── Página de Login ──────────────────────────────────────────────
export const LoginPage: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email,    setEmail   ] = useState('');
  const [password, setPassword] = useState('');
  const [nome,     setNome    ] = useState('');
  const [cpf,      setCpf     ] = useState('');
  const [loading,  setLoading ] = useState(false);
  const [error,    setError   ] = useState('');

  // Primeiro acesso admin
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);
  const [adminUid,       setAdminUid      ] = useState('');
  const [adminEmail,     setAdminEmail    ] = useState('');

  const navigate = useNavigate();

  const avatarInputRef                    = useRef<HTMLInputElement>(null);
  const [avatarSrc,   setAvatarSrc  ]     = useState('');
  const [avatarUrl,   setAvatarUrl  ]     = useState('');
  const [uploadingAv, setUploadingAv]     = useState(false);
  const [avStatus,    setAvStatus   ]     = useState<'idle'|'ok'|'error'>('idle');

  const [logoUrl,    setLogoUrl   ] = useState('');
  const [loginBgUrl, setLoginBgUrl] = useState('');

  useEffect(() => {
    getDoc(Doc.profile()).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d?.avatarUrl)  setLogoUrl(d.avatarUrl);
        if (d?.loginBgUrl) setLoginBgUrl(d.loginBgUrl);
      }
    }).catch(() => {});
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAv(true); setAvStatus('idle');
    const b64 = await fileToBase64(file);
    setAvatarSrc(b64);
    try {
      const res = await uploadFileToImgBB(file, `avatar_${Date.now()}`);
      setAvatarUrl(res.url); setAvatarSrc(res.url); setAvStatus('ok');
    } catch {
      setAvatarUrl(''); setAvatarSrc(''); setAvStatus('error');
    } finally {
      setUploadingAv(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const authEmail = toAuthEmail(email);

      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, authEmail, password);
        await setDoc(Doc.user(cred.user.uid), {
          uid:           cred.user.uid,
          nome, email, cpf,
          tipo:          'client',
          statusConexao: 'offline',
          numeroCliente: Math.floor(100000 + Math.random() * 900000).toString(),
          telefone:      '',
          fotoUrl:       avatarUrl || null,
          provedor:      PROVEDOR_ID,
          endereco:      { rua:'', numero:'', bairro:'', cidade:'', cep:'' },
        });
        navigate('/');
      } else {
        const cred    = await signInWithEmailAndPassword(auth, authEmail, password);
        const userDoc = await getDoc(Doc.user(cred.user.uid));

        if (!userDoc.exists()) {
          // Sem documento no Firestore → primeiro acesso admin
          setAdminUid(cred.user.uid);
          setAdminEmail(email);
          setPrimeiroAcesso(true);
          return;
        }

        navigate(userDoc.data()?.tipo === 'admin' ? '/admin' : '/');
      }
    } catch (err: any) {
      if      (err.code === 'auth/email-already-in-use') setError('Este e-mail já está em uso neste provedor.');
      else if (err.code === 'auth/weak-password')         setError('Senha deve ter pelo menos 6 caracteres.');
      else if (err.code === 'auth/invalid-credential' ||
               err.code === 'auth/user-not-found'     ||
               err.code === 'auth/wrong-password')        setError('E-mail ou senha incorretos.');
      else                                                setError('Erro na autenticação. Verifique seus dados.');
    } finally { setLoading(false); }
  };

  const g = !!loginBgUrl;

  // ── Primeiro Acesso ─────────────────────────────────────────
  if (primeiroAcesso) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor:'#f1f5f9', ...(loginBgUrl ? { backgroundImage:`url(${loginBgUrl})`, backgroundSize:'cover', backgroundPosition:'center' } : {}) }}>
        <PrimeiroAcessoAdmin uid={adminUid} email={adminEmail} bgUrl={loginBgUrl} onConcluido={() => navigate('/admin')} />
      </div>
    );
  }

  // ── Login / Cadastro ────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor:'#f1f5f9', ...(loginBgUrl ? { backgroundImage:`url(${loginBgUrl})`, backgroundSize:'cover', backgroundPosition:'center', backgroundRepeat:'no-repeat' } : {}) }}>

      <div style={{
        width:'100%', maxWidth:'448px', position:'relative', zIndex:1,
        borderRadius:'24px', padding:'32px',
        backgroundColor: g ? 'rgba(255,255,255,0.18)' : 'white',
        backdropFilter: g ? 'blur(16px) saturate(1.5)' : 'none',
        WebkitBackdropFilter: g ? 'blur(16px) saturate(1.5)' : 'none',
        boxShadow: g ? '0 8px 48px rgba(0,0,0,0.22), inset 0 0 0 1px rgba(255,255,255,0.25)' : '0 4px 24px rgba(0,0,0,0.08)',
        border: g ? '1px solid rgba(255,255,255,0.28)' : '1px solid #f1f5f9',
      }}>
        {g && <style>{`.lg label{color:rgba(255,255,255,0.92)!important;text-shadow:0 1px 3px rgba(0,0,0,0.3)}.lg input{background:rgba(255,255,255,0.18)!important;border-color:rgba(255,255,255,0.35)!important;color:white!important}.lg input::placeholder{color:rgba(255,255,255,0.50)!important}.lg input:focus{background:rgba(255,255,255,0.25)!important;border-color:rgba(255,255,255,0.70)!important;outline:none;box-shadow:0 0 0 3px rgba(255,255,255,0.15)}`}</style>}
        {!g && <style>{`.lg input{background:#f1f5f9!important;border-color:#cbd5e1!important;color:#0f172a!important}.lg input::placeholder{color:#94a3b8!important}.lg input:focus{background:#e8f0fe!important;border-color:#004aad!important;box-shadow:0 0 0 3px rgba(0,74,173,0.10)}.lg label{color:#374151!important}`}</style>}

        <div className="lg">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <AvatarCircle src={logoUrl} size={176} shadow="0 8px 24px rgba(0,74,173,0.28)" />
            <h1 className="mt-4 text-2xl font-bold" style={{ color: g ? 'white' : '#0f172a', textShadow: g ? '0 1px 4px rgba(0,0,0,0.4)' : 'none' }}>
              VgWeb Telecom
            </h1>
            <p className="text-sm mt-1" style={{ color: g ? 'rgba(255,255,255,0.82)' : '#64748b', textShadow: g ? '0 1px 3px rgba(0,0,0,0.3)' : 'none' }}>
              {isRegistering ? 'Crie sua conta de assinante' : 'Acesse sua central do assinante'}
            </p>
          </div>

          {/* Foto — só cadastro */}
          {isRegistering && (
            <div className="flex flex-col items-center mb-6">
              <p style={{ fontSize:'13px', color: g ? 'rgba(255,255,255,0.85)' : '#64748b', marginBottom:14, fontWeight:500 }}>
                Foto de perfil <span style={{ color: g ? 'rgba(255,255,255,0.55)' : '#94a3b8' }}>(opcional)</span>
              </p>
              <AvatarCircle src={avatarSrc} size={96} loading={uploadingAv} onClick={() => !uploadingAv && avatarInputRef.current?.click()} />
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }} onChange={handleAvatarChange} />
              <div style={{ height:20, marginTop:10, display:'flex', alignItems:'center' }}>
                {uploadingAv                          && <p style={{ fontSize:'12px', color: g ? 'white' : '#004aad', fontWeight:500 }}>Enviando...</p>}
                {!uploadingAv && avStatus === 'ok'    && <p style={{ fontSize:'12px', color: g ? '#86efac' : '#16a34a', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}><CheckCircle style={{ width:13, height:13 }} /> Foto adicionada!</p>}
                {!uploadingAv && avStatus === 'error' && <p style={{ fontSize:'12px', color: g ? '#fca5a5' : '#dc2626' }}>Erro no upload. Tente novamente.</p>}
                {!uploadingAv && avStatus === 'idle'  && <p style={{ fontSize:'12px', color: g ? 'rgba(255,255,255,0.60)' : '#94a3b8' }}>{avatarSrc ? 'Toque para trocar' : 'Toque no círculo para adicionar'}</p>}
              </div>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <>
                <Input label="Nome Completo" placeholder="Seu nome completo" value={nome} onChange={e => setNome(e.target.value)} required />
                <Input label="CPF"           placeholder="000.000.000-00"   value={cpf}  onChange={e => setCpf(e.target.value)}  required />
              </>
            )}
            <Input label="E-mail" type="email"    placeholder="seu@email.com" value={email}    onChange={e => setEmail(e.target.value)}    required />
            <Input label="Senha"  type="password" placeholder="••••••••"      value={password} onChange={e => setPassword(e.target.value)} required />

            {error && (
              <div style={{ padding:'10px 14px', borderRadius:'12px', backgroundColor: g ? 'rgba(239,68,68,0.25)' : '#fef2f2', border: g ? '1px solid rgba(239,68,68,0.45)' : '1px solid #fecaca' }}>
                <p style={{ fontSize:'13px', color: g ? '#fca5a5' : '#dc2626', textAlign:'center' }}>{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={loading}>
              {isRegistering ? 'Criar Conta' : 'Entrar'}
            </Button>

            <div className="text-center space-y-2 pt-1">
              <button type="button" onClick={() => { setIsRegistering(v => !v); setError(''); setAvatarSrc(''); setAvatarUrl(''); setAvStatus('idle'); }}
                style={{ color: g ? 'rgba(255,255,255,0.90)' : undefined, textShadow: g ? '0 1px 3px rgba(0,0,0,0.3)' : 'none', fontWeight:600, fontSize:'13px', textDecoration:'underline', background:'none', border:'none', cursor:'pointer', display:'block', width:'100%' }}>
                {isRegistering ? 'Já tem conta? Entre aqui' : 'Não tem conta? Crie uma agora'}
              </button>
              {!isRegistering && (
                <button type="button" style={{ color: g ? 'rgba(255,255,255,0.55)' : '#94a3b8', fontSize:'13px', textDecoration:'underline', background:'none', border:'none', cursor:'pointer' }}>
                  Esqueceu sua senha?
                </button>
              )}
              <p style={{ marginTop:18, fontSize:'11px', color: g ? 'rgba(255,255,255,0.45)' : '#cbd5e1', letterSpacing:'0.06em', userSelect:'none' }}>
                Produzido por ®Niklaus
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
