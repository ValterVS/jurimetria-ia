// JSDoc typedefs para intellisense (projeto em JS puro, sem TypeScript)

/**
 * @typedef {Object} Processo
 * @property {number} id_processo
 * @property {string} numero_processo
 * @property {string|null} categoria
 * @property {number} id_tribunal
 * @property {string} nome_tribunal
 * @property {number} id_comarca
 * @property {string} nome_comarca
 * @property {number} id_vara
 * @property {string} nome_vara
 * @property {string} data_distribuicao
 * @property {number|null} valor_causa
 * @property {number} id_situacao
 * @property {string} nome_situacao
 * @property {number|null} id_juiz
 * @property {string|null} nome_juiz
 * @property {number|null} id_desembargador
 * @property {string|null} nome_desembargador
 * @property {number|null} id_ministro
 * @property {string|null} nome_ministro
 */

/**
 * @typedef {'Pendente'|'Em Análise'|'Concluída'|'Erro'} StatusAnalise
 */

/**
 * @typedef {Object} AnaliseDecisao
 * @property {number} id_analise
 * @property {StatusAnalise} status
 * @property {string|null} plataforma_utilizada
 * @property {number|null} input_tokens
 * @property {number|null} output_tokens
 * @property {Object|null} insights_json
 * @property {string} data_processamento
 * @property {string|null} erro_log
 */

export {};
