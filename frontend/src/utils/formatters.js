export function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === '') return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

export function formatarData(dataIso) {
  if (!dataIso) return '-';
  const [ano, mes, dia] = String(dataIso).slice(0, 10).split('-');
  if (!ano || !mes || !dia) return '-';
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataHora(dataIso) {
  if (!dataIso) return '-';
  return new Date(dataIso).toLocaleString('pt-BR');
}

export function formatarPercentual(valor) {
  if (valor === null || valor === undefined) return '-';
  return `${Number(valor).toFixed(1).replace('.', ',')}%`;
}
