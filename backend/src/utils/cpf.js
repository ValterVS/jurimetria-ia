// Validação de CPF (formato + dígitos verificadores), aceitando entrada
// com ou sem máscara.

function calcularDigito(cpfParcial, pesos) {
  const soma = cpfParcial.reduce((acc, digito, i) => acc + digito * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function isValidCPF(valor) {
  if (!valor) return false;
  const digitos = String(valor).replace(/\D/g, '');

  if (digitos.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false; // ex: 000.000.000-00

  const numeros = digitos.split('').map(Number);
  const pesos1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

  const digito1 = calcularDigito(numeros.slice(0, 9), pesos1);
  if (digito1 !== numeros[9]) return false;

  const digito2 = calcularDigito(numeros.slice(0, 10), pesos2);
  if (digito2 !== numeros[10]) return false;

  return true;
}

function formatarCPF(valor) {
  const digitos = String(valor).replace(/\D/g, '');
  if (digitos.length !== 11) return valor;
  return digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

module.exports = { isValidCPF, formatarCPF };
