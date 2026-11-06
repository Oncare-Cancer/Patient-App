import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { SosSheet } from '@/components/ui/SosSheet';

type SosContextValue = {
  open: () => void;
  close: () => void;
  visible: boolean;
};

const SosContext = createContext<SosContextValue | undefined>(undefined);

/**
 * Holds the emergency sheet for the whole app.
 *
 * It lives above the router so SOS works on every screen including login and
 * guest mode (section 11: "Works without login"), and so a single sheet instance
 * is shared rather than one per screen.
 */
export function SosProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  const value = useMemo(() => ({ open, close, visible }), [open, close, visible]);

  return (
    <SosContext.Provider value={value}>
      {children}
      <SosSheet visible={visible} onClose={close} />
    </SosContext.Provider>
  );
}

export function useSos() {
  const ctx = useContext(SosContext);
  if (!ctx) throw new Error('useSos must be used inside SosProvider');
  return ctx;
}
