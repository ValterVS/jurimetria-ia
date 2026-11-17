const { ministroRepository, tribunalRepository } = require('../../repositories/cadastros.repository');
const { createCatalogService } = require('../../services/catalogService.factory');
const { createCatalogController } = require('../../controllers/catalogController.factory');
const { createCatalogSchema } = require('../../validators/catalogValidator');
const { createCatalogRouter } = require('../catalogRoutes.factory');

const service = createCatalogService({
  repository: ministroRepository,
  resourceName: 'Ministro',
  nameColumn: 'nome_ministro',
  parentRepository: tribunalRepository,
  parentRequired: false, // ministro.id_tribunal é nullable no schema original
  normalizeNames: true,
});

const controller = createCatalogController({
  service,
  repository: ministroRepository,
  resourceName: 'Ministro',
});

const schema = createCatalogSchema({
  nameColumn: 'nome_ministro',
  maxLength: 120,
  parentColumn: 'id_tribunal',
  parentRequired: false,
});

module.exports = createCatalogRouter({ controller, schema });
