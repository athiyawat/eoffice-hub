import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import Sidebar from "@/components/saraban/Sidebar";

export const metadata: Metadata = {
  title: "e-Office Saraban Manager",
  description: "ระบบจัดการสารบรรณ e-Office อัตโนมัติ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto p-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
