"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl" | "full";
};

export function Dialog({ isOpen, onClose, title, description, children, size = "lg" }: DialogProps) {
  const sizeClasses = {
    md: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[95vw]"
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={`relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto rounded-2xl border border-border-subtle bg-card shadow-2xl animate-in zoom-in-95 duration-200 dark:border-border-dark dark:bg-card-dark`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-card/80 px-6 py-4 backdrop-blur-md dark:border-border-dark dark:bg-card-dark/80">
          <div>
            <h3 className="text-lg font-black tracking-tight text-text-primary dark:text-text-primary-dark">
              {title}
            </h3>
            {description && (
              <p className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                {description}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="rounded-xl p-2 text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
