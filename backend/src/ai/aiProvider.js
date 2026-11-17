
const anthropicProvider = require('./providers/anthropicProvider');

function getAIProvider() {
  return anthropicProvider;
}

module.exports = { getAIProvider };
