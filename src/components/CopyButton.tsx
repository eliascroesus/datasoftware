"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <button onClick={copy} className="btn-ghost shrink-0 px-2.5 py-1.5 text-xs">
      {copied ? <Check size={14} className="text-good" /> : <Copy size={14} />}
      {label ?? (copied ? "Copied" : "Copy")}
    </button>
  );
}
