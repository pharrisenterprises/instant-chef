"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose?: () => void;
  title?: string;
  message?: string;
  subMessage?: string;
};

export default function ChefCookingModal({
  open,
  onClose,
  title = "The chef is cooking your menus…",
  message = "Sit tight—your personalized menus will be ready in a few minutes.",
  subMessage = "We’ll notify the page automatically when they’re done.",
}: Props) {
  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Card */}
      <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="p-6">
          {/* Chef avatar */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
            {/* Chef hat SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 64 64"
              className="h-9 w-9"
              aria-hidden="true"
            >
              <path
                d="M20 40h24v10a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2V40z"
                fill="#e5e7eb"
              />
              <path
                d="M16 28h32v10H16z"
                fill="#111827"
              />
              <path
                d="M32 8c-5.3 0-9.6 3.7-10.7 8.6C18.3 17 16 19.6 16 22.8 16 26.8 19.2 30 23.2 30h17.6c4 0 7.2-3.2 7.2-7.2 0-3.2-2.3-5.8-5.3-6.2C41.6 11.7 37.3 8 32 8z"
                fill="#f3f4f6"
              />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-center text-lg font-semibold text-neutral-900">
            {title}
          </h3>

          {/* Message */}
          <p className="mt-2 text-center text-sm text-neutral-700">
            {message}
          </p>
          {subMessage ? (
            <p className="mt-1 text-center text-xs text-neutral-500">
              {subMessage}
            </p>
          ) : null}

          {/* Progress line */}
          <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-neutral-200">
            <div className="animate-[progress_1.6s_ease-in-out_infinite] h-1 w-1/3 rounded-full bg-neutral-900" />
          </div>

          {/* Close */}
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              Hide window
            </button>
          </div>
        </div>
      </div>

      {/* tiny CSS keyframe for the progress bar */}
      <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(15%);
          }
          100% {
            transform: translateX(120%);
          }
        }
      `}</style>
    </div>
  );
}
