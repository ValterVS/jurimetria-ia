const parteRepository = require('../repositories/parte.repository');
const { httpError } = require('../utils/httpError');

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

async function list(filters) {
  return parteRepository.findAll(filters);
}

async function getById(id) {
  const parte = await parteRepository.findById(id);
  if (!parte) {
    throw httpError(404, 'Parte não encontrada.');
  }
  return parte;
}

async function create(data) {
  try {
    return await parteRepository.create(data);
  } catch (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw httpError(409, 'Já existe uma parte cadastrada com esse CPF/CNPJ.');
    }
    throw error;
  }
}

async function update(id, data) {
  await getById(id);
  try {
    return await parteRepository.update(id, data);
  } catch (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      throw httpError(409, 'Já existe uma parte cadastrada com esse CPF/CNPJ.');
    }
    throw error;
  }
}

async function remove(id) {
  await getById(id);
  try {
    await parteRepository.remove(id);
  } catch (error) {
    if (error.code === PG_FOREIGN_KEY_VIOLATION) {
      throw httpError(409, 'Esta parte não pode ser removida porque está vinculada a um ou mais processos.');
    }
    throw error;
  }
}

module.exports = { list, getById, create, update, remove };
