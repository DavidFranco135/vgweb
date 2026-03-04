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
  fcmToken?: string;        // token do Firebase Cloud Messaging (notificações push)
  bairro?: string;          // bairro para segmentação de notificações
  endereco: {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    cep: string;
  };
  asaasId?: string;
  ultimoDesbloqueio?: Date | null;
  provedor?: string;
}

export interface Plan {
  id: string;
  nome: string;
  velocidade: string;
  valor: number;
  beneficios: string[];
  popular?: boolean;
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
  referencia?: string;
  asaasId: string;
  // Campos vindos do IXC
  ixcId?: string;
  linhaDigitavel?: string;
}

export interface Ticket {
  id: string;
  userId: string;
  userName?: string;
  assunto: string;
  categoria: 'tecnico' | 'financeiro' | 'outros';
  status: 'open' | 'in_progress' | 'closed';
  prioridade?: 'baixa' | 'media' | 'alta';
  createdAt: string;
  updatedAt?: string;
  mensagens: {
    senderId: string;
    senderNome?: string;
    text: string;
    timestamp: string;
    isAdmin?: boolean;
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

// ── Notificações Push ────────────────────────────────────────────
export type NotificacaoTipo = 'manutencao' | 'financeiro' | 'aviso' | 'promocao';
export type NotificacaoAlvo = 'todos' | 'bairro' | 'usuario';

export interface Notificacao {
  id: string;
  titulo: string;
  corpo: string;
  tipo: NotificacaoTipo;
  alvo: NotificacaoAlvo;
  bairros?: string[];       // lista de bairros (quando alvo = 'bairro')
  usuarioId?: string;       // uid específico (quando alvo = 'usuario')
  enviadoPor: string;       // uid do admin
  enviadoEm: string;        // ISO timestamp
  totalEnviados?: number;
  status: 'enviando' | 'enviado' | 'erro';
}

// ── Dashboard Admin ──────────────────────────────────────────────
export interface DashboardStats {
  totalClientes: number;
  clientesAtivos: number;
  clientesBloqueados: number;
  receitaMensal: number;
  inadimplentes: number;
  chamadosAbertos: number;
  chamadosEmAndamento: number;
}
