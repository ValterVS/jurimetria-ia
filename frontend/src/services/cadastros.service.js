import api from './api';

const RESOURCE_PATHS = {
  tribunais: '/tribunais',
  comarcas: '/comarcas',
  varas: '/varas',
  juizes: '/juizes',
  desembargadores: '/desembargadores',
  ministros: '/ministros',
  'tipos-parte': '/tipos-parte',
  'tipos-sentenca': '/tipos-sentenca',
  'tipos-acordao': '/tipos-acordao',
  'situacoes-processo': '/situacoes-processo',
};

export function getResourcePath(recurso) {
  const path = RESOURCE_PATHS[recurso];
  if (!path) throw new Error(`Cadastro auxiliar desconhecido: ${recurso}`);
  return path;
}

export async function listarCadastro(recurso, filtros = {}) {
  const { data } = await api.get(getResourcePath(recurso), { params: filtros });
  return data;
}

export async function buscarCadastro(recurso, id) {
  const { data } = await api.get(`${getResourcePath(recurso)}/${id}`);
  return data;
}

export async function criarCadastro(recurso, payload) {
  const { data } = await api.post(getResourcePath(recurso), payload);
  return data;
}

// Devolve o registro que já existe (ignorando maiúscula/acento) ou cria um novo.
export async function obterOuCriarCadastro(recurso, payload) {
  const { data, status } = await api.post(`${getResourcePath(recurso)}/obter-ou-criar`, payload);
  return { item: data, criado: status === 201 };
}

export async function atualizarCadastro(recurso, id, payload) {
  const { data } = await api.put(`${getResourcePath(recurso)}/${id}`, payload);
  return data;
}

export async function removerCadastro(recurso, id) {
  await api.delete(`${getResourcePath(recurso)}/${id}`);
}

// Configuração declarativa de cada um dos 9 cadastros auxiliares.
export const CADASTROS_CONFIG = [
  { chave: 'tribunais', titulo: 'Tribunais', idField: 'id_tribunal', campoNome: 'nome_tribunal' },
  {
    chave: 'comarcas',
    titulo: 'Comarcas',
    idField: 'id_comarca',
    campoNome: 'nome_comarca',
    campoPai: 'id_tribunal',
    paiRecurso: 'tribunais',
    paiLabel: 'Tribunal',
    paiIdField: 'id_tribunal',
    paiNomeField: 'nome_tribunal',
  },
  {
    chave: 'varas',
    titulo: 'Varas',
    idField: 'id_vara',
    campoNome: 'nome_vara',
    campoPai: 'id_comarca',
    paiRecurso: 'comarcas',
    paiLabel: 'Comarca',
    paiIdField: 'id_comarca',
    paiNomeField: 'nome_comarca',
  },
  {
    chave: 'juizes',
    titulo: 'Juízes',
    idField: 'id_juiz',
    campoNome: 'nome_juiz',
    campoPai: 'id_vara',
    paiRecurso: 'varas',
    paiLabel: 'Vara',
    paiIdField: 'id_vara',
    paiNomeField: 'nome_vara',
    paiOpcional: true,
  },
  {
    chave: 'desembargadores',
    titulo: 'Desembargadores',
    idField: 'id_desembargador',
    campoNome: 'nome_desembargador',
    campoPai: 'id_tribunal',
    paiRecurso: 'tribunais',
    paiLabel: 'Tribunal',
    paiIdField: 'id_tribunal',
    paiNomeField: 'nome_tribunal',
    paiOpcional: true,
  },
  {
    chave: 'ministros',
    titulo: 'Ministros',
    idField: 'id_ministro',
    campoNome: 'nome_ministro',
    campoPai: 'id_tribunal',
    paiRecurso: 'tribunais',
    paiLabel: 'Tribunal',
    paiIdField: 'id_tribunal',
    paiNomeField: 'nome_tribunal',
    paiOpcional: true,
  },
  { chave: 'tipos-parte', titulo: 'Tipos de Parte', idField: 'id_tipo_parte', campoNome: 'nome_tipo' },
  { chave: 'tipos-sentenca', titulo: 'Tipos de Sentença', idField: 'id_tipo_sentenca', campoNome: 'tipo_sentenca' },
  { chave: 'tipos-acordao', titulo: 'Tipos de Acórdão', idField: 'id_tipo_acordao', campoNome: 'tipo_acordao' },
  {
    chave: 'situacoes-processo',
    titulo: 'Situações de Processo',
    idField: 'id_situacao',
    campoNome: 'nome_situacao',
  },
];
