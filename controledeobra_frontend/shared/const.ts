export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';


// Status de Atividades Detalhados
export const STATUS_DETALHADOS = [
  "Nenhum item",
  "Iniciada",
  "Em andamento",
  "Concluída",
  "Não iniciada",
  "Paralisada",
  "Não executada"
];

// Períodos do Dia
export const PERIODOS_DIA = ["Manhã", "Tarde", "Noite"];

// Tipos de Profissionais
export const TIPOS_PROFISSIONAIS = ["Padrão", "Personalizada", "Grupo"];

// Equipamentos Padrão
export const EQUIPAMENTOS_PADRAO = [
  { nome: "Betoneira", descricao: "Equipamento para misturar concreto" },
  { nome: "Caminhão Basculante", descricao: "Transporte de materiais" },
  { nome: "Compactador de solo", descricao: "Compactação de terreno" },
  { nome: "Escavadeira", descricao: "Escavação e movimentação de terra" },
  { nome: "Guindaste", descricao: "Elevação de cargas" },
  { nome: "Picareta", descricao: "Ferramenta manual de escavação" },
  { nome: "Pá Carregadeira", descricao: "Carregamento de materiais" },
  { nome: "Retro Escavadeira", descricao: "Escavação e limpeza" }
];

// Profissionais Padrão
export const PROFISSIONAIS_PADRAO = [
  { nome: "Ajudante", tipo: "Padrão" },
  { nome: "Eletricista", tipo: "Padrão" },
  { nome: "Engenheiro", tipo: "Padrão" },
  { nome: "Estagiário", tipo: "Padrão" },
  { nome: "Gesseiro", tipo: "Padrão" },
  { nome: "Mestre de Obra", tipo: "Padrão" },
  { nome: "Pedreiro", tipo: "Padrão" },
  { nome: "Servente", tipo: "Padrão" },
  { nome: "Técnico em Edificações", tipo: "Padrão" }
];
