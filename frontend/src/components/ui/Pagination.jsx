import Button from './Button.jsx';

export default function Pagination({ total, limit, offset, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="flex items-center justify-between px-1 py-3 text-sm text-slate-500">
      <span>
        {total} registro(s) - página {currentPage} de {totalPages}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>
          Anterior
        </Button>
        <Button variant="secondary" disabled={currentPage >= totalPages} onClick={() => onChange(offset + limit)}>
          Próxima
        </Button>
      </div>
    </div>
  );
}
