"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { logApi, telegramApi, RunLog } from "@/lib/api";
import { formatThaiDateTime } from "@/lib/utils";
import StatusBadge from "@/components/saraban/StatusBadge";

export default function NotificationsPage() {
  const [testResult, setTestResult] = useState<string | null>(null);

  const logsQuery = useQuery({
    queryKey: ["logs", "telegram"],
    queryFn: () => logApi.list(50),
    refetchInterval: 60000,
  });

  const telegramTestMutation = useMutation({
    mutationFn: telegramApi.test,
    onSuccess: (data) => {
      if (data.ok) {
        setTestResult(`✅ ส่งทดสอบสำเร็จ! Bot: ${data.bot ?? "unknown"}`);
      } else {
        setTestResult(`❌ ล้มเหลว: ${data.error ?? "unknown error"}`);
      }
    },
    onError: (err: Error) => {
      setTestResult(`❌ Error: ${err.message}`);
    },
  });

  const sentLogs: RunLog[] = (logsQuery.data ?? []).filter((l) => l.telegram_sent);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">การแจ้งเตือน</h1>
        <div className="flex items-center gap-3">
          {testResult && (
            <span className={`text-sm ${testResult.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
              {testResult}
            </span>
          )}
          <button
            onClick={() => {
              setTestResult(null);
              telegramTestMutation.mutate();
            }}
            disabled={telegramTestMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {telegramTestMutation.isPending ? "⏳ กำลังส่ง..." : "📤 ส่งทดสอบ"}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-700">
          📩 แสดงเฉพาะรายการที่มีการส่งแจ้งเตือนไปยัง Telegram เท่านั้น
        </p>
      </div>

      {/* Notification Cards */}
      {logsQuery.isLoading ? (
        <div className="text-center py-12 text-gray-400">⏳ กำลังโหลด...</div>
      ) : logsQuery.isError ? (
        <div className="text-center py-12 text-red-500">❌ โหลดข้อมูลล้มเหลว</div>
      ) : sentLogs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-lg font-medium">ยังไม่มีการแจ้งเตือน</p>
          <p className="text-sm mt-1">การแจ้งเตือน Telegram จะปรากฏที่นี่</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sentLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Left: info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatThaiDateTime(log.started_at)}
                    </span>
                    {log.drs && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">
                        DRS {log.drs}
                      </span>
                    )}
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      📩 Telegram ส่งแล้ว
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={log.status ?? undefined} />
                    </div>
                    <span className="text-gray-600">
                      📄 เอกสารใหม่:{" "}
                      <strong className="text-gray-900">{log.new_docs}</strong> รายการ
                    </span>
                    {log.trigger && (
                      <span className="text-gray-500 text-xs">
                        trigger: {log.trigger}
                      </span>
                    )}
                  </div>

                  {log.error_msg && (
                    <p className="text-xs text-red-600 mt-2 bg-red-50 rounded p-2">
                      ❌ {log.error_msg}
                    </p>
                  )}
                </div>

                {/* Right: finished */}
                {log.finished_at && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">เสร็จเมื่อ</p>
                    <p className="text-xs text-gray-500">{formatThaiDateTime(log.finished_at)}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats footer */}
      {!logsQuery.isLoading && sentLogs.length > 0 && (
        <p className="text-center text-xs text-gray-400">
          แสดง {sentLogs.length} รายการที่มีการแจ้งเตือน Telegram
        </p>
      )}
    </div>
  );
}
