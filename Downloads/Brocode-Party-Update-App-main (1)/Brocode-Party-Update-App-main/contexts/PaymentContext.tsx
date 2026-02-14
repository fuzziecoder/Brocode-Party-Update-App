import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface PaymentStatus {
  userId: string;
  paid: boolean;
}

interface PaymentContextType {
  payments: Record<string, PaymentStatus>;
  markPaid: (userId: string) => void;
  undoPaid: (userId: string) => void;
}

const PaymentContext = createContext<PaymentContextType | null>(null);

const PAYMENT_STORAGE_KEY = "brocode_payments";

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<Record<string, PaymentStatus>>(() => {
    const saved = localStorage.getItem(PAYMENT_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  /* Persist payments */
  useEffect(() => {
    localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(payments));
  }, [payments]);

  const markPaid = (userId: string) => {
    setPayments((prev) => ({
      ...prev,
      [userId]: { userId, paid: true },
    }));
  };

  const undoPaid = (userId: string) => {
    setPayments((prev) => ({
      ...prev,
      [userId]: { userId, paid: false },
    }));
  };

  return (
    <PaymentContext.Provider value={{ payments, markPaid, undoPaid }}>
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayments() {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error("usePayments must be used within PaymentProvider");
  }
  return context;
}
