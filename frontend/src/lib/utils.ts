import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const URGENCY_CONFIG = {
  "ด่วนที่สุด": { label: "ด่วนที่สุด", color: "bg-red-100 text-red-800 border-red-200", icon: "🔴" },
  "ด่วนมาก": { label: "ด่วนมาก", color: "bg-orange-100 text-orange-800 border-orange-200", icon: "🟠" },
  "ด่วน": { label: "ด่วน", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: "🟡" },
  "ปกติ": { label: "ปกติ", color: "bg-gray-100 text-gray-700 border-gray-200", icon: "📄" },
} as const;

export const CATEGORY_CONFIG = {
  meeting: { label: "ประชุม", color: "bg-blue-100 text-blue-800", icon: "📅" },
  action_required: { label: "มอบหมาย", color: "bg-purple-100 text-purple-800", icon: "⚡" },
  announcement: { label: "แจ้งเวียน", color: "bg-teal-100 text-teal-800", icon: "📢" },
  information: { label: "แจ้งทราบ", color: "bg-slate-100 text-slate-700", icon: "ℹ️" },
} as const;

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  "รอรับ": { label: "รอรับ", color: "bg-amber-100 text-amber-800" },
  "รอส่ง": { label: "รอส่ง", color: "bg-sky-100 text-sky-800" },
  "ส่งแล้ว": { label: "ส่งแล้ว", color: "bg-green-100 text-green-800" },
  "ปิดงาน": { label: "ปิดงาน", color: "bg-gray-100 text-gray-600" },
  "ปฏิเสธการรับ": { label: "ปฏิเสธ", color: "bg-red-100 text-red-800" },
  "ตีกลับเอกสาร": { label: "ตีกลับ", color: "bg-rose-100 text-rose-800" },
};

export function formatThaiDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("th-TH", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatThaiDateTime(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("th-TH", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}
