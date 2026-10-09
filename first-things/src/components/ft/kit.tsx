import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function George({ size = 56, mood = "happy", className }: { size?: number | undefined; mood?: "happy" | "wink" | "cheer" | undefined; className?: string | undefined }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={cn("shrink-0", className)} aria-label="George">
      <ellipse cx="50" cy="56" rx="40" ry="38" className="fill-george" />
      <path d="M22 28 L30 10 L40 24 Z M78 28 L70 10 L60 24 Z" className="fill-george" />
      <ellipse cx="50" cy="66" rx="24" ry="20" className="fill-george-soft" />
      <circle cx="36" cy="48" r="11" className="fill-card" />
      <circle cx="64" cy="48" r="11" className="fill-card" />
      {mood === "wink" ? (
        <path d="M58 49 Q64 44 70 49" strokeWidth="3.5" fill="none" className="stroke-foreground" strokeLinecap="round" />
      ) : (
        <circle cx="64" cy="49" r="5" className="fill-foreground" />
      )}
      <circle cx="36" cy="49" r="5" className="fill-foreground" />
      <path d="M45 58 L50 64 L55 58 Z" className="fill-accent-foreground" />
      {mood === "cheer" && <path d="M40 72 Q50 82 60 72" strokeWidth="3" fill="none" className="stroke-foreground" strokeLinecap="round" />}
    </svg>
  );
}

export function Btn({ variant = "primary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "george" | "danger" | undefined }) {
  const v = {
    primary: "bg-primary text-primary-foreground hover:opacity-90 shadow-sm",
    george: "bg-george text-foreground hover:opacity-90 shadow-sm",
    outline: "border border-input bg-card text-foreground hover:bg-muted",
    ghost: "text-foreground hover:bg-muted",
    danger: "text-destructive hover:bg-destructive/10",
  }[variant];
  return (
    <button
      {...p}
      className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40", v, className)}
    />
  );
}

export function Field({ label, hint, error, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string | undefined; error?: string | undefined }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        {...p}
        className={cn("w-full rounded-xl border bg-card px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring", error ? "border-destructive" : "border-input")}
      />
      {error ? <span className="mt-1 block text-xs text-destructive">{error}</span> : hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Bubble({ children, from = "george" }: { children: ReactNode; from?: "george" | "user" | undefined }) {
  return (
    <div className={cn("flex animate-pop", from === "user" ? "justify-end" : "items-end gap-2")}>
      {from === "george" && <George size={28} />}
      <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug", from === "george" ? "rounded-bl-sm bg-george-soft" : "rounded-br-sm bg-primary text-primary-foreground")}>
        {children}
      </div>
    </div>
  );
}

export function Step({ n, of, onBack }: { n: number; of: number; onBack?: () => void | undefined }) {
  return (
    <div className="flex items-center gap-3 pb-4">
      {onBack && <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>}
      <div className="flex flex-1 gap-1">
        {Array.from({ length: of }).map((_, i) => (
          <div key={i} className={cn("h-1 flex-1 rounded-full", i < n ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition", on ? "bg-primary" : "bg-input")}>
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all", on ? "left-5" : "left-0.5")} />
    </button>
  );
}

export function AppIcon({ color, glyph, name, locked, onClick }: { color: string; glyph: string; name: string; locked?: boolean | undefined; onClick?: () => void | undefined }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      <span className="relative grid h-14 w-14 place-items-center rounded-2xl text-xl font-bold text-primary-foreground shadow" style={{ background: color }}>
        {glyph}
        {locked && <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-foreground text-[10px] text-background">🔒</span>}
      </span>
      <span className="text-[11px]">{name}</span>
    </button>
  );
}
