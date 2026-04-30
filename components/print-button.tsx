"use client";

interface PrintButtonProps {
  label?: string;
  className?: string;
}

export function PrintButton({ label = "Afdrukken / PDF", className }: PrintButtonProps) {
  return (
    <button
      onClick={() => window.print()}
      className={className ?? "rounded-lg bg-[#1b3a6b] px-4 py-2 text-sm font-medium text-white hover:bg-[#153058] transition"}
    >
      {label}
    </button>
  );
}
