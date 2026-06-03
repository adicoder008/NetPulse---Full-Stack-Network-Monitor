import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded border border-edge bg-surface px-3 py-1.5 text-sm text-slate-200",
        "placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-status-activity/50 focus:border-status-activity/50",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "rounded border border-edge bg-surface px-2.5 py-1.5 text-sm text-slate-200",
        "focus:outline-none focus:ring-1 focus:ring-status-activity/50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
