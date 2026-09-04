"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { configApi, telegramApi, ConfigItem } from "@/lib/api";

type ConfigMap = Record<string, string>;

const CONFIG_KEYS = {
  eoffice: [
    { key: "eoffice_token", label: "e-Office Token", type: "password", placeholder: "Bearer token" },
    { key: "eoffice_base_url", label: "Base URL", type: "text", placeholder: "https://eoffice.example.go.th" },
    { key: "eoffice_bucket_id", label: "Bucket ID", type: "text", placeholder: "bucket ID" },
  ],
  telegram: [
    { key: "telegram_bot_token", label: "Bot Token", type: "password", placeholder: "123456:ABC..." },
    { key: "telegram_chat_id", label: "Chat ID", type: "text", placeholder: "-1001234567890" },
  ],
  ai: [
    { key: "openclaw_api_base", label: "API Base URL", type: "text", placeholder: "https://api.openclaw.ai" },
    { key: "openclaw_api_key", label: "API Key", type: "password", placeholder: "sk-..." },
  ],
} as const;

function configListToMap(items: ConfigItem[]): ConfigMap {
  const map: ConfigMap = {};
  for (const item of items) {
    map[item.key] = item.value ?? "";
  }
  return map;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<ConfigMap>({});
  const [saved, setSaved] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const configQuery = useQuery({
    queryKey: ["config"],
    queryFn: configApi.list,
  });

  useEffect(() => {
    if (configQuery.data) {
      setValues(configListToMap(configQuery.data));
    }
  }, [configQuery.data]);

  const upsertMutation = useMutation({
    mutationFn: (data: { key: string; value: string; is_secret?: boolean }) =>
      configApi.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });

  const telegramTestMutation = useMutation({
    mutationFn: telegramApi.test,
    onSuccess: (data) => {
      if (data.ok) {
        setTestResult(`✅ เชื่อมต่อสำเร็จ! Bot: ${data.bot ?? "unknown"}`);
      } else {
        setTestResult(`❌ ล้มเหลว: ${data.error ?? "unknown error"}`);
      }
    },
    onError: (err: Error) => {
      setTestResult(`❌ Error: ${err.message}`);
    },
  });

  const handleSave = async (section: keyof typeof CONFIG_KEYS) => {
    const keys = CONFIG_KEYS[section];
    const secretKeys = section === "eoffice"
      ? ["eoffice_token"]
      : section === "telegram"
      ? ["telegram_bot_token"]
      : ["openclaw_api_key"];

    try {
      await Promise.all(
        keys.map(({ key }) =>
          upsertMutation.mutateAsync({
            key,
            value: values[key] ?? "",
            is_secret: secretKeys.includes(key),
          })
        )
      );
      setSaved(section);
      setTimeout(() => setSaved(null), 3000);
    } catch (err) {
      alert(`❌ บันทึกล้มเหลว: ${(err as Error).message}`);
    }
  };

  const toggleShowPassword = (key: string) => {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const renderSection = (
    title: string,
    icon: string,
    sectionKey: keyof typeof CONFIG_KEYS,
    extra?: React.ReactNode
  ) => {
    const fields = CONFIG_KEYS[sectionKey];
    const isSaving = upsertMutation.isPending;
    const justSaved = saved === sectionKey;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">{icon}</span>
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        </div>

        <div className="space-y-4">
          {fields.map(({ key, label, type, placeholder }) => {
            const isPassword = type === "password";
            const showVal = showPasswords[key];
            return (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                </label>
                <div className="relative">
                  <input
                    type={isPassword && !showVal ? "password" : "text"}
                    value={values[key] ?? ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12"
                  />
                  {isPassword && (
                    <button
                      type="button"
                      onClick={() => toggleShowPassword(key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                    >
                      {showVal ? "🙈" : "👁️"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {extra && <div className="mt-4">{extra}</div>}

        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
          <button
            onClick={() => handleSave(sectionKey)}
            disabled={isSaving}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "⏳ กำลังบันทึก..." : "💾 บันทึก"}
          </button>
          {justSaved && (
            <span className="text-green-600 text-sm font-medium">✅ บันทึกแล้ว!</span>
          )}
        </div>
      </div>
    );
  };

  if (configQuery.isLoading) {
    return (
      <div className="text-center py-12 text-gray-400">⏳ กำลังโหลดการตั้งค่า...</div>
    );
  }

  if (configQuery.isError) {
    return (
      <div className="text-center py-12 text-red-500">❌ โหลดการตั้งค่าล้มเหลว</div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ตั้งค่า</h1>

      {/* e-Office Section */}
      {renderSection("e-Office API", "🏛️", "eoffice")}

      {/* Telegram Section */}
      {renderSection(
        "Telegram",
        "📩",
        "telegram",
        <div>
          <button
            onClick={() => {
              setTestResult(null);
              telegramTestMutation.mutate();
            }}
            disabled={telegramTestMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {telegramTestMutation.isPending ? "⏳ กำลังทดสอบ..." : "🔗 Test Connection Telegram"}
          </button>
          {testResult && (
            <p className={`mt-2 text-sm ${testResult.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
              {testResult}
            </p>
          )}
        </div>
      )}

      {/* AI Section */}
      {renderSection("AI (OpenClaw)", "🤖", "ai")}
    </div>
  );
}
