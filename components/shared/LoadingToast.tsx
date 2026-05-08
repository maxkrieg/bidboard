"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

interface LoadingToastContextValue {
  showLoading: () => void;
  hideLoading: () => void;
}

const LoadingToastContext = createContext<LoadingToastContextValue | null>(null);

function LoadingToastDisplay() {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const id = setInterval(
      () => setDots((d) => (d.length >= 3 ? "." : d + ".")),
      500
    );
    return () => clearInterval(id);
  }, []);
  return createPortal(
    <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center">
      <div className="rounded-lg bg-indigo-600 px-6 py-2.5 shadow-2xl drop-shadow-xl">
        <span className="text-sm font-semibold text-white">
          Loading<span className="inline-block w-5 text-left">{dots}</span>
        </span>
      </div>
    </div>,
    document.body
  );
}

export function LoadingToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const showLoading = useCallback(() => setIsVisible(true), []);
  const hideLoading = useCallback(() => setIsVisible(false), []);

  return (
    <LoadingToastContext.Provider value={{ showLoading, hideLoading }}>
      {children}
      {isVisible && <LoadingToastDisplay />}
    </LoadingToastContext.Provider>
  );
}

export function useLoadingToast() {
  const ctx = useContext(LoadingToastContext);
  if (!ctx) throw new Error("useLoadingToast must be used within LoadingToastProvider");
  return ctx;
}
