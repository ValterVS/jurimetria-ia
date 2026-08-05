import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const COLORS = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(({ id, message, type }) => {
          const Icon = ICONS[type] || Info;
          return (
            <div
              key={id}
              className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-md ${COLORS[type]}`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de um ToastProvider.');
  return ctx;
}
