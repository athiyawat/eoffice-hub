"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/documents", label: "เอกสาร", icon: "📄" },
  { href: "/schedule", label: "กำหนดการ", icon: "🗓️" },
  { href: "/notifications", label: "การแจ้งเตือน", icon: "🔔" },
  { href: "/logs", label: "ประวัติการทำงาน", icon: "📋" },
  { href: "/settings", label: "ตั้งค่า", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-indigo-700 text-white flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-indigo-600">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📬</span>
          <div>
            <p className="font-bold text-lg leading-tight">e-Office</p>
            <p className="text-indigo-200 text-sm leading-tight">Saraban</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-indigo-100 hover:bg-indigo-600 hover:text-white"
              )}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-indigo-600">
        <p className="text-indigo-300 text-xs text-center">e-Office Saraban</p>
        <p className="text-indigo-400 text-xs text-center mt-0.5">v1.0.0</p>
      </div>
    </aside>
  );
}
