import React, { useState, useRef, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { Doc, PROVEDOR_ID } from '../lib/tenant';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Button, Input, Card } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { uploadFileToImgBB, fileToBase64 } from '../lib/imgbbService';
import { AvatarCircle } from '../components/AvatarCircle';

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers: email ↔ Auth
//
//  O Firebase Auth é GLOBAL (não isolado por provedor).
//  Para que o mesmo e-mail possa ser usado em provedores diferentes,
//  armazenamos no Auth um e-mail interno com sufixo do provedor:
//
//    "joao@gmail.com"  (provedor "VgWeb")
//    →  Auth email: "joao@gmail.com+VgWebnet"
//
//  O e-mail real (sem sufixo) é guardado no Firestore, campo "email".
//  Na tela o usuário digita sempre o e-mail real; a conversão é transparente.
// ─────────────────────────────────────────────────────────────────────────────
function toAuthEmail(realEmail: string): string {
  // Remove qualquer sufixo anterior para ser idempotente
  const base = realEmail.toLowerCase().trim();
  // Se já tem o sufixo deste provedor não duplica
  const suffix = `+${PROVEDOR_ID}`;
  if (base.endsWith(suffix)) return base;
  const [local, domain] = base.split('@');
  return `${local}${suffix}@${domain}`;
}

export const LoginPage: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email,    setEmail   ] = useState('');
  const [password, setPassword] = useState('');
  const [nome,     setNome    ] = useState('');
  const [cpf,      setCpf     ] = useState('');
  const [loading,  setLoading ] = useState(false);
  const [error,    setError   ] = useState('');
  const navigate = useNavigate();

  // foto de perfil no cadastro
  const avatarInputRef                    = useRef<HTMLInputElement>(null);
  const [avatarSrc,   setAvatarSrc  ]     = useState('');
  const [avatarUrl,   setAvatarUrl  ]     = useState('');
  const [uploadingAv, setUploadingAv]     = useState(false);
  const [avStatus,    setAvStatus   ]     = useState<'idle'|'ok'|'error'>('idle');

  // logo do admin + plano de fundo do login
  const [logoUrl,    setLogoUrl   ] = useState('');
  const [loginBgUrl, setLoginBgUrl] = useState('');
  useEffect(() => {
    getDoc(Doc.profile())
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          if (d?.avatarUrl)  setLogoUrl(d.avatarUrl);
          if (d?.loginBgUrl) setLoginBgUrl(d.loginBgUrl);
        }
      })
      .catch(() => {});
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAv(true); setAvStatus('idle');
    const b64 = await fileToBase64(file);
    setAvatarSrc(b64);
    try {
      const res = await uploadFileToImgBB(file, `avatar_${Date.now()}`);
      setAvatarUrl(res.url);
      setAvatarSrc(res.url);
      setAvStatus('ok');
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
      // E-mail interno do Auth (com sufixo do provedor)
      const authEmail = toAuthEmail(email);

      if (isRegistering) {
        const cred    = await createUserWithEmailAndPassword(auth, authEmail, password);
        const isAdmin = email.toLowerCase() === (import.meta.env.VITE_ADMIN_EMAIL ?? 'vgwebadm@gmail.com').toLowerCase();
        await setDoc(Doc.user(cred.user.uid), {
          uid:            cred.user.uid,
          nome,
          email,          // e-mail real (sem sufixo) — exibido no app
          cpf,
          tipo:           isAdmin ? 'admin' : 'client',
          statusConexao:  'offline',
          numeroCliente:  Math.floor(100000 + Math.random() * 900000).toString(),
          telefone:       '',
          fotoUrl:        avatarUrl || null,
          provedor:       PROVEDOR_ID,
          endereco:       { rua: '', numero: '', bairro: '', cidade: '', cep: '' },
        });
        navigate(isAdmin ? '/admin' : '/');
      } else {
        await signInWithEmailAndPassword(auth, authEmail, password);
        navigate('/');
      }
    } catch (err: any) {
      if      (err.code === 'auth/email-already-in-use') setError('Este e-mail já está em uso neste provedor.');
      else if (err.code === 'auth/weak-password')         setError('Senha deve ter pelo menos 6 caracteres.');
      else if (err.code === 'auth/invalid-credential' ||
               err.code === 'auth/user-not-found' ||
               err.code === 'auth/wrong-password')        setError('E-mail ou senha incorretos.');
      else                                                setError('Erro na autenticação. Verifique seus dados.');
    } finally { setLoading(false); }
  };

  const switchMode = () => {
    setIsRegistering(v => !v); setError('');
    setAvatarSrc(''); setAvatarUrl(''); setAvStatus('idle');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: '#f1f5f9',
        ...(loginBgUrl ? {
          backgroundImage: `url(${loginBgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        } : {}),
      }}
    >
      {/* ── Card glassmorphism — div puro para transparência real ── */}
      <div style={{
        width: '100%', maxWidth: '448px', position: 'relative', zIndex: 1,
        borderRadius: '24px', padding: '32px',
        backgroundColor: loginBgUrl ? 'rgba(255,255,255,0.18)' : 'white',
        backdropFilter: loginBgUrl ? 'blur(16px) saturate(1.5)' : 'none',
        WebkitBackdropFilter: loginBgUrl ? 'blur(16px) saturate(1.5)' : 'none',
        boxShadow: loginBgUrl
          ? '0 8px 48px rgba(0,0,0,0.22), inset 0 0 0 1px rgba(255,255,255,0.25)'
          : '0 4px 24px rgba(0,0,0,0.08)',
        border: loginBgUrl ? '1px solid rgba(255,255,255,0.28)' : '1px solid #f1f5f9',
      }}>

        {/* Força labels e inputs brancos quando há imagem de fundo */}
        {loginBgUrl && (
          <style>{`
            .login-glass label               { color: rgba(255,255,255,0.92) !important; text-shadow: 0 1px 3px rgba(0,0,0,0.3); }
            .login-glass input               { background: rgba(255,255,255,0.18) !important; border-color: rgba(255,255,255,0.35) !important; color: white !important; }
            .login-glass input::placeholder  { color: rgba(255,255,255,0.50) !important; }
            .login-glass input:focus         { background: rgba(255,255,255,0.25) !important; border-color: rgba(255,255,255,0.70) !important; outline: none; box-shadow: 0 0 0 3px rgba(255,255,255,0.15); }
          `}</style>
        )}

        {/* Campos mais escuros quando não há imagem de fundo */}
        {!loginBgUrl && (
          <style>{`
            .login-default input               { background: #f1f5f9 !important; border-color: #cbd5e1 !important; color: #0f172a !important; }
            .login-default input::placeholder  { color: #94a3b8 !important; }
            .login-default input:focus         { background: #e8f0fe !important; border-color: #004aad !important; box-shadow: 0 0 0 3px rgba(0,74,173,0.10); }
            .login-default label               { color: #374151 !important; }
          `}</style>
        )}

        <div className={loginBgUrl ? 'login-glass' : 'login-default'}>

        {/* ═══ Logo ═══ */}
        <div className="flex flex-col items-center mb-6">
         <AvatarCircle src={logoUrl} size={176} shadow="none" />
          <h1
            className="mt-4 text-2xl font-bold"
            style={{ color: loginBgUrl ? 'white' : '#0f172a', textShadow: loginBgUrl ? '0 1px 4px rgba(0,0,0,0.4)' : 'none' }}
          >
            VgWeb Telecom
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: loginBgUrl ? 'rgba(255,255,255,0.82)' : '#64748b', textShadow: loginBgUrl ? '0 1px 3px rgba(0,0,0,0.3)' : 'none' }}
          >
            {isRegistering ? 'Crie sua conta de assinante' : 'Acesse sua central do assinante'}
          </p>
        </div>

        {/* ═══ Foto de perfil — só no cadastro ═══ */}
        {isRegistering && (
          <div className="flex flex-col items-center mb-6">
            <p style={{ fontSize: '13px', color: loginBgUrl ? 'rgba(255,255,255,0.85)' : '#64748b', marginBottom: '14px', fontWeight: 500 }}>
              Foto de perfil <span style={{ color: loginBgUrl ? 'rgba(255,255,255,0.55)' : '#94a3b8' }}>(opcional)</span>
            </p>
            <AvatarCircle src={avatarSrc} size={96} loading={uploadingAv} onClick={() => !uploadingAv && avatarInputRef.current?.click()} />
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
            <div style={{ height: '20px', marginTop: '10px', display: 'flex', alignItems: 'center' }}>
              {uploadingAv                          && <p style={{ fontSize: '12px', color: loginBgUrl ? 'white' : '#004aad', fontWeight: 500 }}>Enviando...</p>}
              {!uploadingAv && avStatus === 'ok'    && <p style={{ fontSize: '12px', color: loginBgUrl ? '#86efac' : '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}><CheckCircle style={{ width: 13, height: 13 }} /> Foto adicionada!</p>}
              {!uploadingAv && avStatus === 'error' && <p style={{ fontSize: '12px', color: loginBgUrl ? '#fca5a5' : '#dc2626' }}>Erro no upload. Tente novamente.</p>}
              {!uploadingAv && avStatus === 'idle'  && <p style={{ fontSize: '12px', color: loginBgUrl ? 'rgba(255,255,255,0.60)' : '#94a3b8' }}>{avatarSrc ? 'Toque para trocar' : 'Toque no círculo para adicionar'}</p>}
            </div>
          </div>
        )}

        {/* ═══ Formulário ═══ */}
        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <>
              <Input label="Nome Completo" placeholder="Seu nome completo" value={nome}     onChange={e => setNome(e.target.value)}     required />
              <Input label="CPF"           placeholder="000.000.000-00"   value={cpf}      onChange={e => setCpf(e.target.value)}      required />
            </>
          )}
          <Input label="E-mail" type="email"    placeholder="seu@email.com" value={email}    onChange={e => setEmail(e.target.value)}    required />
          <Input label="Senha"  type="password" placeholder="••••••••"      value={password} onChange={e => setPassword(e.target.value)} required />

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '12px', backgroundColor: loginBgUrl ? 'rgba(239,68,68,0.25)' : '#fef2f2', border: loginBgUrl ? '1px solid rgba(239,68,68,0.45)' : '1px solid #fecaca' }}>
              <p style={{ fontSize: '13px', color: loginBgUrl ? '#fca5a5' : '#dc2626', textAlign: 'center' }}>{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={loading}>
            {isRegistering ? 'Criar Conta' : 'Entrar'}
          </Button>

          <div className="text-center space-y-2 pt-1">
            <button
              type="button"
              onClick={switchMode}
              style={{ color: loginBgUrl ? 'rgba(255,255,255,0.90)' : undefined, textShadow: loginBgUrl ? '0 1px 3px rgba(0,0,0,0.3)' : 'none', fontWeight: 600, fontSize: '13px', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', display: 'block', width: '100%' }}
            >
              {isRegistering ? 'Já tem conta? Entre aqui' : 'Não tem conta? Crie uma agora'}
            </button>
            {!isRegistering && (
              <button
                type="button"
                style={{ color: loginBgUrl ? 'rgba(255,255,255,0.55)' : '#94a3b8', fontSize: '13px', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Esqueceu sua senha?
              </button>
            )}

            {/* Marca registrada */}
            <p style={{
              marginTop: '18px',
              fontSize: '11px',
              color: loginBgUrl ? 'rgba(255,255,255,0.45)' : '#cbd5e1',
              letterSpacing: '0.06em',
              userSelect: 'none',
            }}>
              Produzido por ®Niklaus
            </p>
          </div>
        </form>

        </div>{/* fim .login-glass */}
      </div>

    </div>
  );
};
