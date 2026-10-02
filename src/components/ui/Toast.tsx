// Petit message de confirmation affiché quelques secondes, avec action facultative.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastMsg { text: string; action?: { label: string; run: () => void } }
const Ctx = createContext<(t: ToastMsg | string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((t: ToastMsg | string) => {
    setMsg(typeof t === 'string' ? { text: t } : t);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 3500);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && (
        <div className="toast" role="status">
          <span>{msg.text}</span>
          {msg.action && <button onClick={() => { msg.action!.run(); setMsg(null); }}>{msg.action.label}</button>}
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
