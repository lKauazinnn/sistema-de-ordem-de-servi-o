export type UserRole = "admin" | "gerente" | "atendente" | "tecnico";

export type OsStatus =
  | "aberta"
  | "diagnostico"
  | "aguardando_aprovacao"
  | "aguardando_pecas"
  | "execucao"
  | "concluida"
  | "entregue"
  | "cancelada";

export interface Cliente {
  id: string;
  nome_razao_social: string;
  cpf_cnpj: string;
  telefone: string;
  email: string | null;
  endereco: string | null;
  cep: string | null;
}

export interface OrdemServico {
  id: string;
  numero_sequencial: number;
  cliente_id: string;
  tecnico_id: string;
  tipo_equipamento: string;
  marca: string;
  modelo: string;
  serial_imei: string;
  problema_relatado: string;
  prioridade: "baixa" | "media" | "alta" | "urgente";
  prazo_estimado: string;
  status: OsStatus;
  observacoes_internas: string | null;
  created_at: string;
}

export interface Produto {
  id: string;
  nome: string;
  sku: string;
  categoria: string;
  unidade_medida: string;
  estoque_atual: number;
  estoque_minimo: number;
  preco_custo: number;
  preco_venda: number;
}

export interface DashboardResumo {
  abertas: number;
  andamento: number;
  concluidas: number;
  canceladas: number;
  aguardando_aprovacao: number;
}

export interface OsPorTecnicoItem {
  tecnico: string;
  total: number;
}

export interface ReceitaMensalItem {
  mes: string;
  receita: number;
  notas: number;
  ticket_medio: number;
}

export interface FaturamentoResumo {
  mesAtual: number;
  mesAnterior: number;
  ticketMedio: number;
  notasMesAtual: number;
  variacaoPercentual: number;
}

export interface FaturamentoFormaPagamentoItem {
  forma: string;
  total: number;
}

export interface NotaServicoResumo {
  id: string;
  numero?: number;
  total: number;
  forma_pagamento: string | null;
  created_at: string;
}
