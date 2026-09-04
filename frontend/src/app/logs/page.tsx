"use client";

import { useQuery } from "@tanstack/react-query";
import { logApi } from "@/lib/api";
import { formatThaiDateTime, cn } from "@/lib/utils";

const LOG_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  success: { label: "✅ สำเร็จ", color: "bg-green-100 text-green-800" },
  error: { label: "❌ ผิดพลาด", color: "bg-red-100 text-red-800" },
  token_expired: { label: "⏳ Token หมดอายุ", color: "bg-orange-100 text-orange-800" },
  running: { label: "🔄 กำลังทำงาน", color: "bg-blue-100 text-blue-800" },
};

function LogStatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-gray-400 text-xs">-</span>;
  const cfg = LOG_STATUS_CONFIG[status] ?? {
    label: status,
    color: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", cfg.color)}>
      {cfg.label}
    </span>
  );
}

export default function LogsPage() {
  const logsQuery = useQuery({
    queryKey: ["logs", "all"],
    queryFn: () => logApi.list(50),
    refetchInterval: 30000,
  });

  const logs = logsQuery.data ?? [];

  const successCount = logs.filter((l) => l.status === "success").length;
  const errorCount = logs.filter((l) => l.status === "error" || l.status === "token_expired").length;
  const totalNewDocs = logs.reduce((acc, l) => acc + (l.new_docs ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ประวัติการทำงาน</h1>
        {logsQuery.isFetching && (
          <span className="text-xs text-gray-400 animate-pulse">🔄 กำลังอัปเดต...</span>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{logs.length}</p>
          <p className="text-xs text-gray-500 mt-1">รอบทั้งหมด</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-100 p-4 text-center">
          <p className="text-3xl font-bold text-green-700">{successCount}</p>
          <p className="text-xs text-green-500 mt-1">✅ สำเร็จ</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-center">
          <p className="text-3xl font-bold text-red-700">{errorCount}</p>
          <p className="text-xs text-red-500 mt-1">❌ ผิดพลาด</p>
        </div>
        <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4 text-center">
          <p className="text-3xl font-bold text-indigo-700">{totalNewDocs}</p>
          <p className="text-xs text-indigo-500 mt-1">📄 เอกสารใหม่ทั้งหมด</p>
        </div>
      </div>

      {/* Table */}
      {logsQuery.isLoading ? (
        <div className="text-center py-12 text-gray-400">⏳ กำลังโหลด...</div>
      ) : logsQuery.isError ? (
        <div className="text-center py-12 text-red-500">❌ โหลดข้อมูลล้มเหลว</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-lg font-medium">ยังไม่มีประวัติ</p>
          <p className="text-sm mt-1">ประวัติการทำงานจะแสดงที่นี่หลังจากรัน sweep</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">เวลาเริ่ม</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Trigger</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">DRS</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">เอกสารใหม่</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Telegram</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ข้อผิดพลาด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                    {formatThaiDateTime(log.started_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                    {log.trigger ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {log.drs ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${log.new_docs > 0 ? "text-indigo-700" : "text-gray-400"}`}>
                      {log.new_docs}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <LogStatusBadge status={log.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {log.telegram_sent ? (
                      <span className="text-green-600 text-base" title="ส่งแล้ว">✅</span>
                    ) : (
                      <span className="text-gray-300 text-base" title="ไม่ส่ง">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {log.error_msg ? (
                      <span className="text-red-600 text-xs line-clamp-2" title={log.error_msg}>
                        {log.error_msg}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        แสดง {logs.length} รายการล่าสุด · อัปเดตทุก 30 วินาที
      </p>
    </div>
  );
}
