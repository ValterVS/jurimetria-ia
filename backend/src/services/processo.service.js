const processoRepository = require('../repositories/processo.repository');
const {
  tribunalRepository,
  comarcaRepository,
  varaRepository,
  juizRepository,
  desembargadorRepository,
  ministroRepository,
  situacaoProcessoRepository,
} = require('../repositories/cadastros.repository');
const { httpError } = require('../utils/httpError');

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

// Cada entrada: [nome do campo, repository, obrigatório?]
const FK_CHECKS = [
  ['id_tribunal', tribunalRepository, true],
  ['id_comarca', comarcaRepository, true],
  ['id_vara', varaRepository, true],
  ['id_situacao', situacaoProcessoRepository, true],
  ['id_juiz', juizRepository, false],
  ['id_desembargador', desembargadorRepository, false],
  ['id_ministro', ministroRepository, false],
];

async function validateForeignKeys(data) {
  for (const [field, repository, required] of FK_CHECKS) {
    const value = data[field];

    if (value === undefined || value === null) {
      if (required) {
        throw httpError(400, `Processo: o campo ${field} é obrigatório.`);
      }
      continue;
    }

    const found = await repository.findById(value);
    if (!found) {
      throw httpError(400, `Processo: o registro referenciado em ${field} (id ${value}) não existe.`);
    }
  }
}

async function list(filters, pagination) {
  return processoRepository.findAll(filters, pagination);
}

async function getById(id) {
  const processo = await processoRepository.findById(id);
  if (!processo) {
    throw httpError(404, 'Processo não encontrado.');
  }
  return processo;
}

async function create(data) {
  await validateForeignKeys(data);

  try {
    return await processoRepository.create(data);
  } catch (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw httpError(409, `Já existe um processo cadastrado com o número ${data.numero_processo}.`);
    }
    throw error;
  }
}

async function update(id, data) {
  await getById(id);
  await validateForeignKeys(data);

  try {
    return await processoRepository.update(id, data);
  } catch (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw httpError(409, `Já existe um processo cadastrado com o número ${data.numero_processo}.`);
    }
    throw error;
  }
}

async function remove(id) {
  await getById(id);
  try {
    await processoRepository.remove(id);
  } catch (error) {
    if (error.code === PG_FOREIGN_KEY_VIOLATION) {
      throw httpError(
        409,
        'Este processo não pode ser removido porque possui partes, pedidos, sentenças ou acórdãos vinculados.'
      );
    }
    throw error;
  }
}

module.exports = { list, getById, create, update, remove };
