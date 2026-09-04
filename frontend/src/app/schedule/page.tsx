"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scheduleApi, ScheduleCreate } from "@/lib/api";
import { formatThaiDateTime } from "@/lib/utils";

const DEFAULT_FORM: ScheduleCreate = {
  name: "",
  cron_expr: "0 8 * * 1-5",
  drs: "2",
  enabled: true,
  auto_accept: false,
};

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ScheduleCreate>(DEFAULT_FORM);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const schedulesQuery = useQuery({
    queryKey: ["schedules"],
    queryFn: scheduleApi.list,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => scheduleApi.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (err: Error) => {
      alert(`❌ ไม่สามารถเปลี่ยนสถานะได้: ${err.message}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ScheduleCreate) => scheduleApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setForm(DEFAULT_FORM);
      setShowForm(false);
    },
    onError: (err: Error) => {
      alert(`❌ สร้าง schedule ล้มเหลว: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => scheduleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setDeletingId(null);
    },
    onError: (err: Error) => {
      alert(`❌ ลบ schedule ล้มเหลว: ${err.message}`);
      setDeletingId(null);
    },
  });

  const handleDelete = (id: number, name: string) => {
    if (confirm(`ยืนยันการลบ "${name}"?`)) {
      setDeletingId(id);
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("กรุณาระบุชื่อ schedule");
      return;
    }
    if (!form.cron_expr.trim()) {
      alert("กรุณาระบุ cron expression");
      return;
    }
    createMutation.mutate(form);
  };

  const schedules = schedulesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">กำหนดการ</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {showForm ? "✕ ยกเลิก" : "+ เพิ่ม Schedule"}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">เพิ่ม Schedule ใหม่</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="เช่น ตรวจสอบทุกวันจันทร์-ศุกร์"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Cron */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cron Expression <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.cron_expr}
                  onChange={(e) => setForm({ ...form, cron_expr: e.target.value })}
                  placeholder="0 8 * * 1-5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">ตัวอย่าง: 0 8 * * 1-5 = ทุกวันจันทร์-ศุกร์ เวลา 08:00</p>
              </div>

              {/* DRS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DRS</label>
                <select
                  value={form.drs}
                  onChange={(e) => setForm({ ...form, drs: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="2">DRS 2</option>
                  <option value="3">DRS 3</option>
                </select>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-700">เปิดใช้งาน</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.auto_accept}
                  onChange={(e) => setForm({ ...form, auto_accept: e.target.checked })}
                  className="w-4 h-4 text-red-500 rounded"
                />
                <span className="text-sm text-gray-700">Auto Accept</span>
              </label>
            </div>

            {/* Auto accept warning */}
            {form.auto_accept && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-3">
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ การเปิด Auto Accept จะทำให้ระบบกดรับหนังสือโดยอัตโนมัติ
                </p>
                <p className="text-xs text-red-600 mt-1">
                  กรุณาตรวจสอบให้แน่ใจก่อนเปิดฟีเจอร์นี้ เนื่องจากอาจส่งผลต่อการรับเอกสารในระบบ e-Office
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? "⏳ กำลังสร้าง..." : "✓ สร้าง Schedule"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(DEFAULT_FORM); }}
                className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule List */}
      {schedulesQuery.isLoading ? (
        <div className="text-center py-12 text-gray-400">⏳ กำลังโหลด...</div>
      ) : schedulesQuery.isError ? (
        <div className="text-center py-12 text-red-500">❌ โหลดข้อมูลล้มเหลว</div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
          📭 ยังไม่มี schedule
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((sch) => (
            <div
              key={sch.id}
              className={`bg-white rounded-xl border p-5 transition-colors ${
                sch.enabled ? "border-gray-200" : "border-gray-100 opacity-70"
              }`}
            >
              <div className="flex flex-wrap items-start gap-4">
                {/* Toggle */}
                <button
                  onClick={() => toggleMutation.mutate(sch.id)}
                  disabled={toggleMutation.isPending}
                  title={sch.enabled ? "คลิกเพื่อปิด" : "คลิกเพื่อเปิด"}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 mt-0.5 ${
                    sch.enabled ? "bg-indigo-600" : "bg-gray-200"
                  } ${toggleMutation.isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition-transform ${
                      sch.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{sch.name}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                      DRS {sch.drs}
                    </span>
                    {sch.auto_accept && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                        ⚡ Auto Accept
                      </span>
                    )}
                    {!sch.enabled && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        ปิดอยู่
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 font-mono mb-1">{sch.cron_expr}</p>
                  {sch.last_run_at && (
                    <p className="text-xs text-gray-400">
                      รันล่าสุด: {formatThaiDateTime(sch.last_run_at)}
                    </p>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(sch.id, sch.name)}
                  disabled={deletingId === sch.id}
                  className="text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50 text-sm disabled:opacity-40"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
