"use client";

import type { FieldSpec } from "@/lib/client-types";

export function Field({
  field,
  value,
  onChange,
  secretSaved,
}: {
  field: FieldSpec;
  value: any;
  onChange: (v: any) => void;
  secretSaved?: boolean;
}) {
  const common =
    "input " + (field.type === "textarea" ? "min-h-[120px] font-mono text-xs" : "");

  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-200">
          {field.label}
          {field.required ? <span className="text-bad"> *</span> : null}
        </span>
      </div>

      {field.type === "textarea" ? (
        <textarea
          className={common}
          placeholder={
            secretSaved ? "•••••••• saved — leave blank to keep" : field.placeholder
          }
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "select" ? (
        <select
          className="input"
          value={value ?? field.defaultValue ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === "boolean" ? (
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={
            "flex h-6 w-11 items-center rounded-full border transition " +
            (value
              ? "border-brand/40 bg-brand/40"
              : "border-panel-border bg-white/[0.05]")
          }
        >
          <span
            className={
              "h-4 w-4 rounded-full bg-white transition " +
              (value ? "translate-x-5" : "translate-x-1")
            }
          />
        </button>
      ) : (
        <input
          type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
          className={common}
          placeholder={
            secretSaved ? "•••••••• saved — leave blank to keep" : field.placeholder
          }
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.help ? (
        <p className="mt-1 text-xs text-faint">{field.help}</p>
      ) : null}
    </label>
  );
}
