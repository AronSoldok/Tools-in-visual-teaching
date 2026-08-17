"use client";

import { useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  message,
  confirmLabel = "Да",
  cancelLabel = "Нет",
  hideCancel = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="app-dialog-backdrop" role="presentation" onPointerDown={onCancel}>
      <div
        className="app-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-describedby="app-dialog-message"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p id="app-dialog-message" className="app-dialog-message">
          {message}
        </p>
        <div className="app-dialog-actions">
          <button type="button" className="action-btn action-btn-confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
          {!hideCancel && (
            <button type="button" className="action-btn" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
