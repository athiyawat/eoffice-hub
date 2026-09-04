import { cn, URGENCY_CONFIG, STATUS_CONFIG, CATEGORY_CONFIG } from "@/lib/utils";

interface StatusBadgeProps {
  urgency?: string;
  status?: string;
  category?: string;
  className?: string;
}

export default function StatusBadge({ urgency, status, category, className }: StatusBadgeProps) {
  if (urgency) {
    const cfg = URGENCY_CONFIG[urgency as keyof typeof URGENCY_CONFIG];
    if (cfg) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
            cfg.color,
            className
          )}
        >
          <span>{cfg.icon}</span>
          <span>{cfg.label}</span>
        </span>
      );
    }
  }

  if (status) {
    const cfg = STATUS_CONFIG[status];
    if (cfg) {
      return (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
            cfg.color,
            className
          )}
        >
          {cfg.label}
        </span>
      );
    }
  }

  if (category) {
    const cfg = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
    if (cfg) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
            cfg.color,
            className
          )}
        >
          <span>{cfg.icon}</span>
          <span>{cfg.label}</span>
        </span>
      );
    }
  }

  // Fallback for unknown values
  const label = urgency ?? status ?? category ?? "-";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600",
        className
      )}
    >
      {label}
    </span>
  );
}
