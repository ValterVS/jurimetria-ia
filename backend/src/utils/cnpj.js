// Validação de CNPJ (formato + dígitos verificadores), aceitando entrada
// com ou sem máscara.

function calcularDigito(cnpjParcial, pesos) {
  const soma = cnpjParcial.reduce((acc, digito, i) => acc + digito * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function isValidCNPJ(valor) {
  if (!valor) return false;
  const digitos = String(valor).replace(/\D/g, '');

  if (digitos.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digitos)) return false; // ex: 00000000000000

  const numeros = digitos.split('').map(Number);
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const digito1 = calcularDigito(numeros.slice(0, 12), pesos1);
  if (digito1 !== numeros[12]) return false;

  const digito2 = calcularDigito(numeros.slice(0, 13), pesos2);
  if (digito2 !== numeros[13]) return false;

  return true;
}

function formatarCNPJ(valor) {
  const digitos = String(valor).replace(/\D/g, '');
  if (digitos.length !== 14) return valor;
  return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

module.exports = { isValidCNPJ, formatarCNPJ };
