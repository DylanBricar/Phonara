import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Tailwind max-width class for the panel. Defaults to max-w-lg. */
  maxWidthClassName?: string;
}

/**
 * Lightweight modal dialog rendered in a portal with a blurred backdrop,
 * Escape-to-close, scroll-locked body, and a sticky header/footer.
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidthClassName = "max-w-lg",
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <style>{`
        @keyframes parler-dialog-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes parler-dialog-pop {
          from { opacity: 0; transform: translateY(8px) scale(0.97) }
          to { opacity: 1; transform: translateY(0) scale(1) }
        }
      `}</style>
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        style={{ animation: "parler-dialog-fade 120ms ease-out" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full ${maxWidthClassName} max-h-[86vh] flex flex-col bg-background border border-mid-gray/20 rounded-2xl shadow-2xl overflow-hidden`}
        style={{ animation: "parler-dialog-pop 160ms cubic-bezier(0.16,1,0.3,1)" }}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-mid-gray/15">
            <div className="min-w-0">
              {title && (
                <h2 className="text-base font-semibold leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-text/55 mt-1">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 -mr-1 -mt-0.5 p-1.5 rounded-lg text-text/40 hover:text-text hover:bg-mid-gray/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 border-t border-mid-gray/15 flex items-center justify-end gap-2 bg-mid-gray/[0.03]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
