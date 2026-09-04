"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { documentApi, DocumentListParams } from "@/lib/api";
import { formatThaiDate, URGENCY_CONFIG, STATUS_CONFIG } from "@/lib/utils";
import StatusBadge from "@/components/saraban/StatusBadge";

const LIMIT = 20;

export default function DocumentsPage() {
  const [page, setPage] = useState(1);
  const [urgency, setUrgency] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const params: DocumentListParams = {
    page,
    limit: LIMIT,
    ...(urgency ? { urgency } : {}),
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
    ...(pendingOnly ? { pending_only: true } : {}),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["documents", params],
    queryFn: () => documentApi.list(params),
    refetchInterval: 60000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleFilterChange = () => {
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">เอกสาร</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-600 mb-1">ค้นหา</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="หัวข้อ, หน่วยงาน, เลขที่..."
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSearch}
                className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700"
              >
                🔍
              </button>
            </div>
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ความเร่งด่วน</label>
            <select
              value={urgency}
              onChange={(e) => { setUrgency(e.target.value); handleFilterChange(); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">ทั้งหมด</option>
              {Object.keys(URGENCY_CONFIG).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">สถานะ</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); handleFilterChange(); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">ทั้งหมด</option>
              {Object.keys(STATUS_CONFIG).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {/* Pending only */}
          <div className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              id="pendingOnly"
              checked={pendingOnly}
              onChange={(e) => { setPendingOnly(e.target.checked); handleFilterChange(); }}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <label htmlFor="pendingOnly" className="text-sm text-gray-700 select-none cursor-pointer">
              รอดำเนินการ
            </label>
          </div>

          {/* Clear */}
          {(urgency || status || search || pendingOnly) && (
            <button
              onClick={() => {
                setUrgency("");
                setStatus("");
                setSearch("");
                setSearchInput("");
                setPendingOnly(false);
                setPage(1);
              }}
              className="text-xs text-gray-500 hover:text-red-500 pb-2 underline"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>พบ <strong className="text-gray-900">{total.toLocaleString()}</strong> รายการ</span>
        <span>หน้า {page} / {totalPages}</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">⏳ กำลังโหลด...</div>
      ) : isError ? (
        <div className="text-center py-12 text-red-500">❌ โหลดข้อมูลล้มเหลว</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
          📭 ไม่พบเอกสาร
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">เลขที่</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">หัวข้อ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">หน่วยงาน</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">ความเร่งด่วน</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">สถานะ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">วันที่ส่ง</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap">วันที่เสร็จ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ลิงก์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono whitespace-nowrap">
                    {doc.book_number ?? "-"}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-gray-900 font-medium line-clamp-2">{doc.subject}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap max-w-32 truncate">
                    {doc.sender_dept ?? "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge urgency={doc.urgency_level} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={doc.doc_rec_status ?? undefined} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                    {formatThaiDate(doc.send_date)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                    {formatThaiDate(doc.done_date)}
                  </td>
                  <td className="px-4 py-3">
                    {doc.eoffice_url ? (
                      <a
                        href={doc.eoffice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 text-xs hover:underline"
                      >
                        เปิด →
                      </a>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← ก่อนหน้า
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 text-sm rounded-lg border transition-colors ${
                    page === p
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            {totalPages > 7 && <span className="px-2 py-2 text-gray-400">...</span>}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  );
}
