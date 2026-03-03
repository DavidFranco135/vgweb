/**
 * imgbbService.ts
 * Serviço centralizado para upload e gestão de imagens via ImgBB API
 * Coloque em: src/lib/imgbbService.ts
 *
 * Chave API: 78953306acdb3b320cab654efd93728f
 * Docs: https://api.imgbb.com/
 */

const IMGBB_API_KEY = '78953306acdb3b320cab654efd93728f';
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

// ── Tipos ────────────────────────────────────────────────────────

export interface ImgBBResponse {
  data: {
    id: string;
    title: string;
    url_viewer: string;
    url: string;           // URL direta da imagem (use esta)
    display_url: string;   // URL para exibição
    thumb: {
      url: string;         // miniatura
    };
    delete_url: string;    // URL para deletar a imagem
  };
  success: boolean;
  status: number;
}

export interface UploadResult {
  url: string;
  thumbUrl: string;
  deleteUrl: string;
  id: string;
}

// ── Cache local (evita re-uploads desnecessários) ────────────────

const CACHE_KEY_PREFIX = 'imgbb_cache_';

function getCached(key: string): string | null {
  try {
    return localStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
  } catch {
    return null;
  }
}

function setCache(key: string, url: string): void {
  try {
    localStorage.setItem(`${CACHE_KEY_PREFIX}${key}`, url);
  } catch {
    // ignora erros de storage (ex: modo privado)
  }
}

// ── Função principal de upload ───────────────────────────────────

/**
 * Faz upload de uma imagem para o ImgBB e retorna a URL pública.
 *
 * @param imageSource - Pode ser: File, base64 string, ou URL de blob
 * @param name        - Nome descritivo da imagem (opcional)
 * @param cacheKey    - Chave para cache local (opcional, evita re-upload)
 */
export async function uploadToImgBB(
  imageSource: File | string,
  name?: string,
  cacheKey?: string
): Promise<UploadResult> {
  // Verifica cache primeiro
  if (cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return parsed;
    }
  }

  const formData = new FormData();
  formData.append('key', IMGBB_API_KEY);

  if (name) {
    formData.append('name', name);
  }

  // Aceita File, base64 com prefixo data:, ou base64 puro
  if (imageSource instanceof File) {
    formData.append('image', imageSource);
  } else if (imageSource.startsWith('data:')) {
    // Remove o prefixo "data:image/jpeg;base64,"
    const base64 = imageSource.split(',')[1];
    formData.append('image', base64);
  } else {
    formData.append('image', imageSource);
  }

  const response = await fetch(IMGBB_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`ImgBB erro HTTP: ${response.status}`);
  }

  const data: ImgBBResponse = await response.json();

  if (!data.success) {
    throw new Error('ImgBB: upload falhou');
  }

  const result: UploadResult = {
    url:       data.data.url,
    thumbUrl:  data.data.thumb.url,
    deleteUrl: data.data.delete_url,
    id:        data.data.id,
  };

  // Salva no cache
  if (cacheKey) {
    setCache(cacheKey, JSON.stringify(result));
  }

  return result;
}

/**
 * Faz upload de um arquivo de imagem selecionado pelo usuário
 * (resultado de um <input type="file">)
 */
export async function uploadFileToImgBB(
  file: File,
  name?: string
): Promise<UploadResult> {
  // Valida tipo de arquivo
  if (!file.type.startsWith('image/')) {
    throw new Error('Apenas imagens são permitidas (JPEG, PNG, GIF, etc.)');
  }

  // Valida tamanho (ImgBB aceita até 32MB)
  const MAX_SIZE = 32 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error('Imagem muito grande. Tamanho máximo: 32MB');
  }

  return uploadToImgBB(file, name || file.name);
}

/**
 * Converte File para base64 (útil para preview antes do upload)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * URLs padrão para imagens de planos (já hospedadas no ImgBB)
 * Substitua pelas URLs reais após fazer o upload manual das imagens
 * de cada plano no painel do ImgBB ou via setupPlansImages()
 */
export const PLAN_IMAGES = {
  '500mb': 'https://i.ibb.co/placeholder/plan-500mb.jpg',
  '800mb': 'https://i.ibb.co/placeholder/plan-800mb.jpg',
  '1gb':   'https://i.ibb.co/placeholder/plan-1gb.jpg',
};

/**
 * URL de fallback para avatar quando não há foto de perfil
 * Gerado via DiceBear mas pode ser substituído por uma imagem do ImgBB
 */
export function getAvatarUrl(uid: string, customUrl?: string): string {
  if (customUrl) return customUrl;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;
}
