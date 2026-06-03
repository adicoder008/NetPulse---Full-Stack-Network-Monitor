import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

const variants = {
  primary: "bg-status-activity/90 text-white hover:bg-status-activity border-status-activity/50",
  secondary: "bg-surface-overlay text-slate-200 hover:bg-surface-raised border-edge",
  ghost: "bg-transparent text-slate-300 hover:bg-surface-overlay border-transparent",
  danger: "bg-status-critical/15 text-status-critical hover:bg-status-critical/25 border-status-critical/30"
};

const sizes = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm"
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded border font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
