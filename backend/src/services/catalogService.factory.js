const { httpError } = require('../utils/httpError');
const { normalizarChave, formatarNome } = require('../utils/nomeCatalogo');

// códigos de erro do PostgreSQL tratados de forma amigável
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

// Fábrica de service para os catálogos simples. Com normalizeNames, o nome é
// padronizado ("lins" -> "Lins") e duplicatas que só diferem por maiúscula/
// acento (dentro do mesmo registro pai) são tratadas como o mesmo registro.
function createCatalogService({
  repository,
  resourceName,
  nameColumn,
  parentRepository = null,
  parentRequired = false,
  normalizeNames = false,
}) {
  function prepare(data) {
    return normalizeNames ? { ...data, [nameColumn]: formatarNome(data[nameColumn]) } : data;
  }

  async function findDuplicate(data, excludeId = null) {
    if (!normalizeNames) return null;
    const parentId = repository.parentColumn ? data[repository.parentColumn] : undefined;
    const candidatos = await repository.findAll(parentId ? { parentId } : {});
    const chave = normalizarChave(data[nameColumn]);
    return (
      candidatos.find(
        (c) => c[repository.idColumn] !== excludeId && normalizarChave(c[nameColumn]) === chave
      ) || null
    );
  }

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

  async function insert(data) {
    try {
      return await repository.create(data);
    } catch (error) {
      if (error.code === PG_UNIQUE_VIOLATION) {
        throw httpError(409, `${resourceName}: já existe um registro com esse ${nameColumn}.`);
      }
      throw error;
    }
  }

  async function create(data) {
    if (repository.parentColumn) {
      await ensureParentExists(data[repository.parentColumn]);
    }

    const prepared = prepare(data);
    const existente = await findDuplicate(prepared);
    if (existente) {
      throw httpError(409, `${resourceName}: já existe um registro com esse nome ("${existente[nameColumn]}").`);
    }

    return insert(prepared);
  }

  // usado pelo cadastro "na hora" nos formulários: devolve o registro que já
  // existe (ignorando maiúscula/acento) ou cria um novo
  async function findOrCreate(data) {
    if (repository.parentColumn) {
      await ensureParentExists(data[repository.parentColumn]);
    }

    const prepared = prepare(data);
    const existente = await findDuplicate(prepared);
    if (existente) return { item: existente, created: false };

    return { item: await insert(prepared), created: true };
  }

  async function update(id, data) {
    await getById(id); // garante 404 amigável antes de tentar o update

    if (repository.parentColumn) {
      await ensureParentExists(data[repository.parentColumn]);
    }

    const prepared = prepare(data);
    const existente = await findDuplicate(prepared, id);
    if (existente) {
      throw httpError(409, `${resourceName}: já existe um registro com esse nome ("${existente[nameColumn]}").`);
    }

    try {
      return await repository.update(id, prepared);
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

  return { list, getById, create, findOrCreate, update, remove };
}

module.exports = { createCatalogService, PG_UNIQUE_VIOLATION, PG_FOREIGN_KEY_VIOLATION };
