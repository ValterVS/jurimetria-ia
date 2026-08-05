export default function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <p className="text-sm font-medium text-red-800">{message || 'Ocorreu um erro inesperado.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-sm font-medium text-red-700 underline">
          Tentar novamente
        </button>
      )}
    </div>
  );
}
