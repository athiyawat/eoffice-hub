import { Document } from "@/lib/api";
import { formatThaiDate } from "@/lib/utils";
import StatusBadge from "./StatusBadge";

interface DocumentCardProps {
  doc: Document;
}

export default function DocumentCard({ doc }: DocumentCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
      {/* Header: badges + book number */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <StatusBadge urgency={doc.urgency_level} />
        <StatusBadge category={doc.category} />
        {doc.doc_rec_status && (
          <StatusBadge status={doc.doc_rec_status} />
        )}
        {doc.book_number && (
          <span className="ml-auto text-xs text-gray-400 font-mono">
            {doc.book_number}
          </span>
        )}
      </div>

      {/* Subject */}
      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
        {doc.subject}
      </h3>

      {/* Sender */}
      {doc.sender_dept && (
        <p className="text-xs text-gray-500 mb-2">
          📤 {doc.sender_dept}
          {doc.sender_name && ` · ${doc.sender_name}`}
        </p>
      )}

      {/* Summary */}
      {doc.summary_text && (
        <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 mb-3 line-clamp-3">
          {doc.summary_text}
        </p>
      )}

      {/* Footer: date + link */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">
          📅 {formatThaiDate(doc.send_date)}
        </span>
        {doc.eoffice_url ? (
          <a
            href={doc.eoffice_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
          >
            เปิด e-Office →
          </a>
        ) : (
          <span className="text-xs text-gray-300">ไม่มีลิงก์</span>
        )}
      </div>
    </div>
  );
}
