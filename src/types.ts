export type UserRole = 'client' | 'admin';

export interface UserProfile {
  uid: string;
  nome: string;
  email: string;
  cpf: string;
  tipo: UserRole;
  planoId?: string;
  statusConexao: 'online' | 'offline' | 'blocked';
  numeroCliente: string;
  telefone: string;
  fotoUrl?: string;
  ixcId?: string;
  endereco: {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    cep: string;
  };
  asaasId?: string;
  ultimoDesbloqueio?: Date | null;
}

export interface Plan {
  id: string;
  nome: string;
  velocidade: string;
  valor: number;
  beneficios: string[];
  popular?: boolean;
  /**
   * URL da imagem hospedada no ImgBB.
   * Usado em AdminPlans, AdminSettings (TabPlanos) e PlansPage.
   */
  imagemUrl?: string;
  /** @deprecated use imagemUrl */
  imageUrl?: string;
}

export interface Invoice {
  id: string;
  userId: string;
  valor: number;
  vencimento: string;
  status: 'pending' | 'paid' | 'overdue';
  pixCode?: string;
  pixQrCode?: string;
  boletoUrl?: string;
  asaasId: string;
}

export interface Ticket {
  id: string;
  userId: string;
  assunto: string;
  status: 'open' | 'in_progress' | 'closed';
  createdAt: string;
  mensagens: {
    senderId: string;
    text: string;
    timestamp: string;
  }[];
}

export interface Announcement {
  id: string;
  titulo: string;
  descricao?: string;
  imagemUrl: string;
  link?: string;
  ativo: boolean;
  ordem: number;
  criadoEm: string;
}

export interface DeviceImage {
  id: string;
  nome: string;
  descricao?: string;
  imagemUrl: string;
  ativo: boolean;
  criadoEm: string;
}
