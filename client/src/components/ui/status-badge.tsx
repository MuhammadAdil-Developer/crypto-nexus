import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type: "success" | "warning" | "danger" | "accent" | "muted";
  className?: string;
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const variants = {
    success: "bg-green-900/30 text-green-400 border-green-800/50",
    warning: "bg-yellow-900/30 text-yellow-400 border-yellow-800/50", 
    danger: "bg-red-900/30 text-red-400 border-red-800/50",
    accent: "bg-blue-900/30 text-blue-400 border-blue-800/50",
    muted: "bg-gray-800/50 text-gray-400 border-gray-700/50"
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variants[type],
        className
      )}
      data-testid={`status-badge-${status.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {type !== "muted" && (
        <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", 
          type === "success" && "bg-green-500",
          type === "warning" && "bg-yellow-500", 
          type === "danger" && "bg-red-500",
          type === "accent" && "bg-blue-500"
        )} />
      )}
      {status}
    </span>
  );
}
