/**
 * ═══════════════════════════════════════════════════════
 *  ixcService.ts  —  Integração GigaNet App ↔ IXC Soft
 *  Coloque este arquivo em: src/lib/ixcService.ts
 * ═══════════════════════════════════════════════════════
 *
 *  A API do IXC é REST + autenticação Basic (token em Base64).
 *  Formato: Authorization: Basic base64("token_usuario:token_senha")
 *  Todos os retornos são JSON.
 *
 *  Variáveis de ambiente necessárias em .env.local:
 *    IXC_URL=https://ixc.suaempresa.com.br
 *    IXC_TOKEN=seu_token_gerado_no_ixc
 */

import axios, { AxiosInstance } from 'axios';

// ── Tipos de retorno da API IXC ─────────────────────────────────

export interface IXCCliente {
  id: string;
  razao: string;           // nome completo
  cnpj_cpf: string;        // CPF/CNPJ
  email: string;
  telefone_celular: string;
  ativo: 'S' | 'N';        // S = ativo, N = inativo
  status_internet: 'A' | 'B' | 'CA' | 'FA';
  // A = Ativo | B = Bloqueado manual | CA = Cancelado | FA = Financeiro/bloqueado
}

export interface IXCContrato {
  id: string;
  id_cliente: string;
  status: 'A' | 'B' | 'CA' | 'FA';
  plano: string;
  id_plano: string;
  mensalidade: string;     // valor em string "99.90"
  data_vencimento: string; // "10"
}

export interface IXCFatura {
  id: string;
  id_cliente: string;
  valor: string;
  vencimento: string;      // "2024-03-10"
  status: 'A' | 'B' | 'P'; // A = aberto, B = baixado/pago, P = pendente
  referencia: string;
  linha_digitavel?: string; // código de boleto
  pix_qrcode?: string;
  pix_copia_cola?: string;
}

export interface IXCStatusConexao {
  online: boolean;
  status: 'online' | 'offline' | 'blocked';
  ip?: string;
  bloqueado_financeiro: boolean;
}

// ── Cliente HTTP do IXC ─────────────────────────────────────────

function createIXCClient(): AxiosInstance {
  const url   = process.env.IXC_URL;
  const token = process.env.IXC_TOKEN;

  if (!url || !token) {
    throw new Error('IXC_URL e IXC_TOKEN devem estar definidos no .env.local');
  }

  // O IXC usa Basic Auth com o token encodado em Base64
  const auth = Buffer.from(token).toString('base64');

  return axios.create({
    baseURL: `${url}/webservice/v1`,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type':  'application/json',
      'ixcsoft':       'listar', // cabeçalho obrigatório para listagens
    },
    timeout: 10000,
  });
}

// ── Funções de Integração ───────────────────────────────────────

/**
 * Busca um cliente pelo CPF no IXC.
 * Endpoint: GET /cliente?cpf_cnpj=xxx
 */
export async function getClienteIXCporCPF(cpf: string): Promise<IXCCliente | null> {
  try {
    const ixc = createIXCClient();
    const { data } = await ixc.post('/cliente', {
      qtype:    'cliente.cnpj_cpf',
      query:    cpf.replace(/\D/g, ''), // remove pontuação
      oper:     '=',
      page:     '1',
      rp:       '1',
      sortname: 'cliente.id',
      sortorder:'asc',
    });
    const registros = data?.registros;
    if (registros && registros.length > 0) {
      return registros[0] as IXCCliente;
    }
    return null;
  } catch (err: any) {
    console.error('[IXC] Erro ao buscar cliente por CPF:', err.message);
    return null;
  }
}

/**
 * Busca um cliente pelo ID interno do IXC.
 * Endpoint: GET /cliente/{id}
 */
export async function getClienteIXCporID(idIXC: string): Promise<IXCCliente | null> {
  try {
    const ixc = createIXCClient();
    const { data } = await ixc.get(`/cliente/${idIXC}`);
    return data as IXCCliente;
  } catch (err: any) {
    console.error('[IXC] Erro ao buscar cliente por ID:', err.message);
    return null;
  }
}

/**
 * Consulta o status de conexão do cliente via contrato IXC.
 * O campo status do contrato indica se está ativo, bloqueado financeiro, etc.
 */
export async function getStatusConexao(idClienteIXC: string): Promise<IXCStatusConexao> {
  try {
    const ixc = createIXCClient();

    // Busca contratos ativos do cliente
    const { data } = await ixc.post('/cliente_servicos', {
      qtype:    'cliente_servicos.id_cliente',
      query:    idClienteIXC,
      oper:     '=',
      page:     '1',
      rp:       '10',
      sortname: 'cliente_servicos.id',
      sortorder:'asc',
    });

    const contratos: IXCContrato[] = data?.registros || [];
    const contrato = contratos.find(c => c.status === 'A' || c.status === 'FA');

    if (!contrato) {
      return { online: false, status: 'offline', bloqueado_financeiro: false };
    }

    const bloqueadoFinanceiro = contrato.status === 'FA';
    const bloqueadoManual     = contrato.status === 'B';

    if (bloqueadoFinanceiro || bloqueadoManual) {
      return { online: false, status: 'blocked', bloqueado_financeiro: bloqueadoFinanceiro };
    }

    return { online: true, status: 'online', bloqueado_financeiro: false };
  } catch (err: any) {
    console.error('[IXC] Erro ao consultar status:', err.message);
    return { online: false, status: 'offline', bloqueado_financeiro: false };
  }
}

/**
 * Busca as faturas em aberto de um cliente.
 * Retorna as últimas faturas pendentes.
 */
export async function getFaturasCliente(idClienteIXC: string): Promise<IXCFatura[]> {
  try {
    const ixc = createIXCClient();
    const { data } = await ixc.post('/fn_areceber', {
      qtype:    'fn_areceber.id_cliente',
      query:    idClienteIXC,
      oper:     '=',
      page:     '1',
      rp:       '12',       // últimas 12 faturas
      sortname: 'fn_areceber.vencimento',
      sortorder:'desc',
    });
    return (data?.registros || []) as IXCFatura[];
  } catch (err: any) {
    console.error('[IXC] Erro ao buscar faturas:', err.message);
    return [];
  }
}

/**
 * Solicita desbloqueio de confiança para o cliente.
 * O IXC tem um endpoint especial para isso.
 */
export async function solicitarDesbloqueioConfianca(idContratoIXC: string): Promise<boolean> {
  try {
    const ixc = createIXCClient();
    // Endpoint especial do IXC para desbloqueio de confiança
    const { data } = await ixc.post('/desbloqueio_confianca', {
      id_contrato: idContratoIXC,
    });
    return data?.type !== 'error';
  } catch (err: any) {
    console.error('[IXC] Erro no desbloqueio de confiança:', err.message);
    return false;
  }
}

/**
 * Gera um PIX para uma fatura específica.
 */
export async function gerarPixFatura(idFatura: string): Promise<{ pixCode?: string; qrCode?: string } | null> {
  try {
    const ixc = createIXCClient();
    const { data } = await ixc.get(`/fn_areceber/${idFatura}`);

    return {
      pixCode: data?.pix_copia_cola || '',
      qrCode:  data?.pix_qrcode    || '',
    };
  } catch (err: any) {
    console.error('[IXC] Erro ao gerar PIX:', err.message);
    return null;
  }
}
