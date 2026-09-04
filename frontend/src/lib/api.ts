/**
 * API client — wraps fetch calls to FastAPI backend
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ---- Health ----
export const healthApi = {
  check: () => apiFetch<Record<string, unknown>>("/api/health"),
};

// ---- Config ----
export const configApi = {
  list: () => apiFetch<ConfigItem[]>("/api/config"),
  upsert: (data: ConfigWrite) =>
    apiFetch<ConfigItem>("/api/config", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (key: string) =>
    apiFetch<{ ok: boolean }>(`/api/config/${key}`, { method: "DELETE" }),
};

// ---- Schedules ----
export const scheduleApi = {
  list: () => apiFetch<Schedule[]>("/api/schedule"),
  create: (data: ScheduleCreate) =>
    apiFetch<Schedule>("/api/schedule", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<ScheduleCreate>) =>
    apiFetch<Schedule>(`/api/schedule/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/schedule/${id}`, { method: "DELETE" }),
  toggle: (id: number) =>
    apiFetch<Schedule>(`/api/schedule/${id}/toggle`, { method: "POST" }),
};

// ---- Documents ----
export const documentApi = {
  list: (params?: DocumentListParams) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.urgency) q.set("urgency", params.urgency);
    if (params?.category) q.set("category", params.category);
    if (params?.search) q.set("search", params.search);
    if (params?.pending_only) q.set("pending_only", "true");
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    return apiFetch<DocumentListResponse>(`/api/documents?${q.toString()}`);
  },
};

// ---- Sweep ----
export const sweepApi = {
  run: (drs = "2", dry_run = false) =>
    apiFetch<SweepResult>(`/api/sweep/run?drs=${drs}&dry_run=${dry_run}`, {
      method: "POST",
    }),
};

// ---- Logs ----
export const logApi = {
  list: (limit = 50) => apiFetch<RunLog[]>(`/api/logs?limit=${limit}`),
};

// ---- Telegram ----
export const telegramApi = {
  test: () => apiFetch<{ ok: boolean; bot?: string; error?: string }>("/api/telegram/test", { method: "POST" }),
};

// ---- Types ----
export interface ConfigItem {
  key: string;
  value?: string | null;
  is_secret: boolean;
  description?: string | null;
  updated_at?: string | null;
}

export interface ConfigWrite {
  key: string;
  value: string;
  is_secret?: boolean;
  description?: string;
}

export interface Schedule {
  id: number;
  name: string;
  cron_expr: string;
  drs: string;
  enabled: boolean;
  auto_accept: boolean;
  last_run_at?: string | null;
  next_run_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleCreate {
  name: string;
  cron_expr: string;
  drs: string;
  enabled: boolean;
  auto_accept: boolean;
}

export interface Document {
  id: number;
  doc_id: number;
  book_number?: string | null;
  subject: string;
  sender_name?: string | null;
  sender_dept?: string | null;
  urgency_level: string;
  category: string;
  doc_rec_status?: string | null;
  send_date?: string | null;
  done_date?: string | null;
  deadline_at?: string | null;
  summary_text?: string | null;
  has_action_required: boolean;
  action_items: string[];
  meeting_info: Record<string, unknown>;
  eoffice_url?: string | null;
  created_at?: string | null;
}

export interface DocumentListParams {
  status?: string;
  urgency?: string;
  category?: string;
  search?: string;
  pending_only?: boolean;
  page?: number;
  limit?: number;
}

export interface DocumentListResponse {
  items: Document[];
  total: number;
  page: number;
  limit: number;
}

export interface RunLog {
  id: number;
  started_at: string;
  finished_at?: string | null;
  trigger?: string | null;
  drs?: string | null;
  new_docs: number;
  status?: string | null;
  error_msg?: string | null;
  telegram_sent: boolean;
}

export interface SweepResult {
  status: string;
  dry_run: boolean;
  api_docs_count: number;
  new_docs_count: number;
  telegram_sent: boolean;
  report_preview?: string;
  run_log_id?: number | null;
  error?: string;
}
