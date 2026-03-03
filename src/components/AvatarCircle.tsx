// src/components/AvatarCircle.tsx
// Círculo 100% preenchido — usa clip-path para corte pixel-perfect sem borda branca
import React from 'react';
import { Camera, Loader2, User } from 'lucide-react';

interface AvatarCircleProps {
  src:      string;          // URL da imagem (vazio = placeholder)
  size:     number;          // px
  loading?: boolean;
  onClick?: () => void;
  shadow?:  string;          // box-shadow opcional no wrapper externo
}

export const AvatarCircle: React.FC<AvatarCircleProps> = ({
  src, size, loading = false, onClick, shadow = '0 4px 18px rgba(0,0,0,0.18)',
}) => {
  const cam = Math.round(size * 0.28);   // badge câmera proporcional

  return (
    <div
      onClick={onClick}
      style={{
        position:   'relative',
        width:      `${size}px`,
        height:     `${size}px`,
        flexShrink: 0,
        cursor:     onClick ? (loading ? 'not-allowed' : 'pointer') : 'default',
        // Sombra no wrapper — FORA do clip, nunca aparece como borda branca
        filter:     `drop-shadow(${shadow})`,
      }}
    >
      {/* ── Círculo de imagem — clip-path corta tudo, ZERO borda residual ── */}
      <div style={{
        width:     `${size}px`,
        height:    `${size}px`,
        // clip-path em vez de border-radius+overflow — não deixa resíduo de cor
        clipPath:  'circle(50% at 50% 50%)',
        WebkitClipPath: 'circle(50% at 50% 50%)',
      }}>
        {src ? (
          <img
            src={src}
            alt="Avatar"
            style={{
              width:          '100%',
              height:         '100%',
              objectFit:      'cover',        // preenche o círculo inteiro
              objectPosition: 'center',
              display:        'block',
            }}
            referrerPolicy="no-referrer"
          />
        ) : (
          // Placeholder: fundo cinza + ícone — mesma cor, sem anel
          <div style={{
            width:           '100%',
            height:          '100%',
            backgroundColor: '#e2e8f0',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
          }}>
            <User
              style={{ width: size * 0.44, height: size * 0.44, color: '#94a3b8' }}
              strokeWidth={1.5}
            />
          </div>
        )}
      </div>

      {/* ── Badge câmera — só aparece quando há onClick ── */}
      {onClick && (
        <div style={{
          position:        'absolute',
          bottom:          '1px',
          right:           '1px',
          width:           `${cam}px`,
          height:          `${cam}px`,
          borderRadius:    '50%',
          backgroundColor: '#004aad',
          // outline no lugar de border — não afeta o tamanho do elemento
          outline:         '2.5px solid white',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          boxShadow:       '0 1px 4px rgba(0,0,0,0.25)',
          zIndex:          2,
        }}>
          {loading
            ? <Loader2 style={{ width: cam * 0.52, height: cam * 0.52, color: 'white', animation: 'spin 1s linear infinite' }} />
            : <Camera  style={{ width: cam * 0.52, height: cam * 0.52, color: 'white' }} />
          }
        </div>
      )}
    </div>
  );
};
