"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { healthApi, documentApi, sweepApi, logApi, SweepResult } from "@/lib/api";
import { formatThaiDateTime } from "@/lib/utils";
import DocumentCard from "@/components/saraban/DocumentCard";
import StatusBadge from "@/components/saraban/StatusBadge";

export default function DashboardPage() {
  const [sweepDrs, setSweepDrs] = useState("2");
  const [sweepResult, setSweepResult] = useState<SweepResult | null>(null);

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: healthApi.check,
    refetchInterval: 30000,
  });

  const docsQuery = useQuery({
    queryKey: ["documents", "pending"],
    queryFn: () => documentApi.list({ pending_only: true, limit: 5 }),
    refetchInterval: 60000,
  });

  const logsQuery = useQuery({
    queryKey: ["logs", "recent"],
    queryFn: () => logApi.list(5),
    refetchInterval: 30000,
  });

  const sweepMutation = useMutation({
    mutationFn: () => sweepApi.run(sweepDrs),
    onSuccess: (data) => {
      setSweepResult(data);
      alert(
        `✅ Sweep เสร็จสิ้น\n` +
        `• เอกสารใหม่: ${data.new_docs_count} รายการ\n` +
        `• จาก API: ${data.api_docs_count} รายการ\n` +
        `• Telegram: ${data.telegram_sent ? "ส่งแล้ว" : "ไม่ส่ง"}`
      );
    },
    onError: (err: Error) => {
      alert(`❌ Sweep ล้มเหลว: ${err.message}`);
    },
  });

  // Health API returns { status, checks: { db, eoffice_token, telegram } }
  const health = healthQuery.data as { status?: string; checks?: Record<string, string> } | undefined;
  const checks = health?.checks ?? {};
  const pendingDocs = docsQuery.data?.items ?? [];
  const recentLogs = logsQuery.data ?? [];

  const isCheckOk = (val: string | undefined) => val === "ok" || val === "valid";
  const getHealthIcon = (val: string | undefined) => isCheckOk(val) ? "🟢" : val === undefined ? "⚪" : "🔴";
  const getHealthLabel = (val: string | undefined) => val ?? "ไม่ทราบ";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          <select
            value={sweepDrs}
            onChange={(e) => setSweepDrs(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="2">DRS 2</option>
            <option value="3">DRS 3</option>
          </select>
          <button
            onClick={() => sweepMutation.mutate()}
            disabled={sweepMutation.isPending}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sweepMutation.isPending ? "⏳ กำลังทำงาน..." : "🔄 Run Sweep Now"}
          </button>
        </div>
      </div>

      {/* System Status Cards */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">สถานะระบบ</h2>
        {healthQuery.isLoading ? (
          <div className="text-gray-400 text-sm">กำลังโหลด...</div>
        ) : healthQuery.isError ? (
          <div className="text-red-500 text-sm">❌ ไม่สามารถเชื่อมต่อ API ได้</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* DB Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-600">🗄️ Database</span>
                <span className="text-lg">{getHealthIcon(checks.db)}</span>
              </div>
              <p className={`text-sm font-semibold ${isCheckOk(checks.db) ? "text-green-600" : "text-red-600"}`}>
                {getHealthLabel(checks.db)}
              </p>
            </div>

            {/* Token Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-600">🔑 e-Office Token</span>
                <span className="text-lg">{getHealthIcon(checks.eoffice_token)}</span>
              </div>
              <p className={`text-sm font-semibold ${isCheckOk(checks.eoffice_token) ? "text-green-600" : "text-amber-600"}`}>
                {getHealthLabel(checks.eoffice_token)}
              </p>
            </div>

            {/* Telegram Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-600">📩 Telegram</span>
                <span className="text-lg">{getHealthIcon(checks.telegram)}</span>
              </div>
              <p className={`text-sm font-semibold ${isCheckOk(checks.telegram) ? "text-green-600" : "text-red-600"}`}>
                {getHealthLabel(checks.telegram)}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Summary Stats */}
      {docsQuery.data && (
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">สรุปข้อมูล</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4 text-center">
              <p className="text-3xl font-bold text-indigo-700">{docsQuery.data.total}</p>
              <p className="text-xs text-indigo-500 mt-1">เอกสารรอดำเนินการ</p>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 text-center">
              <p className="text-3xl font-bold text-amber-700">
                {pendingDocs.filter((d) => d.urgency_level === "ด่วนที่สุด").length}
              </p>
              <p className="text-xs text-amber-500 mt-1">🔴 ด่วนที่สุด</p>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-100 p-4 text-center">
              <p className="text-3xl font-bold text-green-700">
                {recentLogs.filter((l) => l.status === "success").length}
              </p>
              <p className="text-xs text-green-500 mt-1">✅ Sweep สำเร็จ (5 ล่าสุด)</p>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 text-center">
              <p className="text-3xl font-bold text-blue-700">
                {recentLogs.reduce((acc, l) => acc + (l.new_docs ?? 0), 0)}
              </p>
              <p className="text-xs text-blue-500 mt-1">📄 เอกสารใหม่ (5 รอบล่าสุด)</p>
            </div>
          </div>
        </section>
      )}

      {/* Sweep Result */}
      {sweepResult && (
        <section className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-green-800 mb-2">✅ ผลลัพธ์ Sweep ล่าสุด</h3>
          <p className="text-xs text-green-700">
            พบเอกสารใหม่: <strong>{sweepResult.new_docs_count}</strong> รายการ
            · API: <strong>{sweepResult.api_docs_count}</strong> รายการ
            · Telegram: {sweepResult.telegram_sent ? "✅ ส่งแล้ว" : "❌ ไม่ส่ง"}
          </p>
          {sweepResult.report_preview && (
            <pre className="text-xs text-green-700 mt-2 whitespace-pre-wrap font-sans">
              {sweepResult.report_preview}
            </pre>
          )}
        </section>
      )}

      {/* Pending Documents */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-700">เอกสารรอดำเนินการ (5 ล่าสุด)</h2>
          <a href="/documents" className="text-sm text-indigo-600 hover:underline">
            ดูทั้งหมด →
          </a>
        </div>
        {docsQuery.isLoading ? (
          <div className="text-gray-400 text-sm">กำลังโหลด...</div>
        ) : pendingDocs.length === 0 ? (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            ✅ ไม่มีเอกสารรอดำเนินการ
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pendingDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Logs */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">ประวัติการทำงานล่าสุด</h2>
        {logsQuery.isLoading ? (
          <div className="text-gray-400 text-sm">กำลังโหลด...</div>
        ) : recentLogs.length === 0 ? (
          <div className="text-gray-400 text-sm">ยังไม่มีประวัติ</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">เวลา</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">DRS</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">เอกสารใหม่</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 text-xs">{formatThaiDateTime(log.started_at)}</td>
                    <td className="px-4 py-3 text-gray-700">{log.drs ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-700">{log.new_docs}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={log.status ?? undefined} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
