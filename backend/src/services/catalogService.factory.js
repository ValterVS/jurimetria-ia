const { httpError } = require('../utils/httpError');

// Códigos de erro do PostgreSQL que tratamos de forma amigável em vez de
// deixar vazar a mensagem crua do driver para o cliente.
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

// Fábrica de service para os catálogos simples. Concentra as regras de
// negócio comuns a todas essas tabelas: nome obrigatório, existência do
// registro pai (quando houver) e tradução de erros de constraint do banco
// em respostas HTTP compreensíveis.
function createCatalogService({ repository, resourceName, nameColumn, parentRepository = null, parentRequired = false }) {
  async function ensureParentExists(parentId) {
    if (parentId === undefined || parentId === null) {
      if (parentRequired) {
        throw httpError(400, `${resourceName}: o campo de vínculo com o registro pai é obrigatório.`);
      }
      return;
    }

    const parent = await parentRepository.findById(parentId);
    if (!parent) {
      throw httpError(400, `${resourceName}: o registro pai informado (id ${parentId}) não existe.`);
    }
  }

  async function list(filters) {
    return repository.findAll(filters);
  }

  async function getById(id) {
    const item = await repository.findById(id);
    if (!item) {
      throw httpError(404, `${resourceName} não encontrado.`);
    }
    return item;
  }

  async function create(data) {
    if (repository.parentColumn) {
      await ensureParentExists(data[repository.parentColumn]);
    }

    try {
      return await repository.create(data);
    } catch (error) {
      if (error.code === PG_UNIQUE_VIOLATION) {
        throw httpError(409, `${resourceName}: já existe um registro com esse ${nameColumn}.`);
      }
      throw error;
    }
  }

  async function update(id, data) {
    await getById(id); // garante 404 amigável antes de tentar o update

    if (repository.parentColumn) {
      await ensureParentExists(data[repository.parentColumn]);
    }

    try {
      return await repository.update(id, data);
    } catch (error) {
      if (error.code === PG_UNIQUE_VIOLATION) {
        throw httpError(409, `${resourceName}: já existe um registro com esse ${nameColumn}.`);
      }
      throw error;
    }
  }

  async function remove(id) {
    await getById(id);

    try {
      await repository.remove(id);
    } catch (error) {
      if (error.code === PG_FOREIGN_KEY_VIOLATION) {
        throw httpError(
          409,
          `${resourceName} não pode ser removido porque está em uso por outros registros do sistema.`
        );
      }
      throw error;
    }
  }

  return { list, getById, create, update, remove };
}

module.exports = { createCatalogService, PG_UNIQUE_VIOLATION, PG_FOREIGN_KEY_VIOLATION };
