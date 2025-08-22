import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type: "success" | "warning" | "danger" | "accent" | "muted";
  className?: string;
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const variants = {
    success: "bg-success/20 text-success",
    warning: "bg-warning/20 text-warning", 
    danger: "bg-danger/20 text-danger",
    accent: "bg-accent/20 text-accent",
    muted: "bg-surface-2 text-muted border border-border"
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[type],
        className
      )}
      data-testid={`status-badge-${status.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {type !== "muted" && (
        <span className={cn("w-1.5 h-1.5 rounded-full mr-1", 
          type === "success" && "bg-success",
          type === "warning" && "bg-warning", 
          type === "danger" && "bg-danger",
          type === "accent" && "bg-accent"
        )} />
      )}
      {status}
    </span>
  );
}
