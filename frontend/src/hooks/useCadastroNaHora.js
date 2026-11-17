import { useCallback } from 'react';
import { useToast } from '../contexts/ToastContext.jsx';
import { obterOuCriarCadastro } from '../services/cadastros.service.js';

// Cadastra na hora um item de catálogo (ou reaproveita o que já existe,
// ignorando maiúscula/acento), inclui na lista de opções da tela e devolve
// { id, nome } no formato esperado pelo CatalogCombobox.
export default function useCadastroNaHora() {
  const { showToast } = useToast();

  return useCallback(
    async ({ recurso, payload, campoNome, idField, setLista, rotulo }) => {
      const { item, criado } = await obterOuCriarCadastro(recurso, payload);
      setLista((prev) => (prev.some((x) => x[idField] === item[idField]) ? prev : [...prev, item]));
      showToast(
        criado
          ? `${rotulo} "${item[campoNome]}" cadastrado(a).`
          : `${rotulo} "${item[campoNome]}" já existia e foi selecionado(a).`,
        criado ? 'success' : 'info'
      );
      return { id: item[idField], nome: item[campoNome] };
    },
    [showToast]
  );
}

export function paraOpcoes(lista, idField, campoNome) {
  return lista.map((x) => ({ id: x[idField], nome: x[campoNome] }));
}
