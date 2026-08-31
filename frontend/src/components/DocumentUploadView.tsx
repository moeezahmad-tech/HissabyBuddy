import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Database, 
  Sparkles, 
  Inbox, 
  AlertCircle,
  Eye,
  Trash2,
  X,
  RefreshCw,
  Layers,
  Coins,
  Receipt
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

interface IndexedDoc {
  id: string;
  name: string;
  type?: string;
  size: string;
  chunks: number;
  status: string;
  date: string;
  preview?: string;
  fullText?: string;
  chunksList?: string[];
  extractedBalance?: number;
  extractedTransactionsCount?: number;
  payee?: string;
  recipient?: string;
  purpose?: string;
  currency?: string;
  currency_symbol?: string;
  invoiceNumber?: string;
  lineItems?: Array<{ name: string; qty?: string; amount: number; category?: string }>;
}

export const DocumentUploadView: React.FC = () => {
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [dragActive, setDragActive] = useState(false);
  const [documents, setDocuments] = useState<IndexedDoc[]>(() => {
    try {
      const cached = localStorage.getItem('hissaby_cached_documents');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<IndexedDoc | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const headers: Record<string, string> = {};
        if (user?.token) {
          headers['Authorization'] = `Bearer ${user.token}`;
        }
        const res = await fetch(`${apiUrl}/api/documents/`, { headers });
        if (res.ok) {
          const data = await res.json();
          const docList = data.documents || [];
          localStorage.setItem('hissaby_cached_documents', JSON.stringify(docList));
          setDocuments(docList);
        }
      } catch {
        // fail silently for offline dev
      }
    };

    fetchDocuments();
  }, [user]);

  const handleFileUpload = async (file: File) => {
    setError(null);
    setSuccessMsg(null);

    // 1. Validation (Support PDF, CSV, TXT, and Image OCR: PNG, JPG, JPEG)
    const allowed = ['.pdf', '.csv', '.txt', '.png', '.jpg', '.jpeg'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setError(`Unsupported file format '${ext}'. Please upload a PDF, PNG, JPG, CSV, or TXT file.`);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 25MB.`);
      return;
    }

    if (file.size === 0) {
      setError('The selected file is empty.');
      return;
    }

    setUploading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }

      const res = await fetch(`${apiUrl}/api/documents/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setDocuments(prev => {
          const updated = [data.document, ...prev];
          localStorage.setItem('hissaby_cached_documents', JSON.stringify(updated));
          return updated;
        });
        setSuccessMsg(data.message || 'Document successfully scanned with OCR, ledger updated, and indexed into Pinecone!');
      } else {
        const errData = await res.json().catch(() => ({ error: 'Upload failed' }));
        setError(errData.error || 'Server rejected file upload.');
      }
    } catch {
      setError('Network error: Unable to connect to FastAPI backend service.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to delete '${docName}'? This will remove its vectors from Pinecone and its records from your ledger.`)) {
      return;
    }

    setDeletingId(docId);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = {};
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }

      const res = await fetch(`${apiUrl}/api/documents/${docId}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== docId));
        setSuccessMsg(`Successfully deleted '${docName}' and updated your financial ledger.`);
        if (previewDoc?.id === docId) {
          setPreviewDoc(null);
        }
      } else {
        const errData = await res.json().catch(() => ({ detail: 'Failed to delete document' }));
        setError(errData.detail || 'Could not delete document.');
      }
    } catch {
      setError('Network error: Unable to contact backend to delete document.');
    } finally {
      setDeletingId(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-black text-[#012456] tracking-tight flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-[#5391FE]" />
          Document Upload &amp; OCR
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Upload PDF statements, receipts, or CSVs for automatic extraction.
        </p>
      </div>

      {/* Error Notification Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button 
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Dropzone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer group block ${
          dragActive 
            ? 'border-[#5391FE] bg-blue-50/50' 
            : 'border-slate-300 hover:border-[#5391FE] bg-white hover:bg-slate-50/50'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          type="file"
          accept=".pdf,.csv,.txt,.png,.jpg,.jpeg"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
          className="hidden"
        />
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#5391FE] flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
          {uploading ? <RefreshCw className="w-8 h-8 animate-spin" /> : <UploadCloud className="w-8 h-8" />}
        </div>
        <h3 className="text-base font-bold text-[#012456]">
          {uploading ? 'Scanning & extracting text...' : 'Upload Statement or Receipt'}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Supports PDF, PNG, JPG, and CSV up to 25MB
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5391FE] text-white text-xs font-bold shadow-xs">
          <span>{uploading ? 'Processing with OCR...' : 'Select File from Device'}</span>
        </div>
      </label>

      {/* Indexed Documents Table */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-[#012456] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#5391FE]" />
            Uploaded Financial Documents ({documents.length})
          </h3>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Pinecone Vectors Active
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-[#012456]">No Documents Uploaded Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Upload your bank statement or receipt image above to get started with instant AI answers and live dashboard metrics.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map((doc, idx) => (
              <div key={doc.id || idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#5391FE] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 truncate max-w-xs sm:max-w-md">{doc.name}</p>
                      {doc.type && (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                          {doc.type}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {doc.size} • {doc.chunks} semantic chunks • {doc.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50/60 px-2.5 py-1 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{doc.status}</span>
                  </div>

                  {/* Preview Button */}
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="p-2 text-slate-500 hover:text-[#5391FE] hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                    title="Preview Document & OCR Text"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    disabled={deletingId === doc.id}
                    onClick={() => handleDelete(doc.id, doc.name)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    title="Delete Document"
                  >
                    {deletingId === doc.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DOCUMENT PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#5391FE] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#012456] truncate max-w-sm sm:max-w-md">
                    {previewDoc.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                    <span>{previewDoc.type || 'Document'}</span>
                    <span>•</span>
                    <span>{previewDoc.size}</span>
                    <span>•</span>
                    <span className="text-emerald-600 font-semibold">{previewDoc.status}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-[#5391FE]" />
                  Extracted Balance
                </span>
                <p className="text-base font-black text-[#012456] mt-1">
                  {previewDoc.extractedBalance && previewDoc.extractedBalance > 0 
                    ? formatAmount(previewDoc.extractedBalance) 
                    : formatAmount(0)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Receipt className="w-3 h-3 text-emerald-500" />
                  Detected Line Items
                </span>
                <p className="text-base font-black text-[#012456] mt-1">
                  {previewDoc.extractedTransactionsCount ?? 0} Transactions
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-indigo-500" />
                  Pinecone Chunks
                </span>
                <p className="text-base font-black text-[#012456] mt-1">
                  {previewDoc.chunks} Vectors
                </p>
              </div>
            </div>

            {/* Where to Pay & For What to Pay Card */}
            {(previewDoc.payee || previewDoc.purpose || previewDoc.recipient) && (
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 mb-4 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 pb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Where/Who to Pay:</span>
                    <p className="font-black text-[#012456] text-sm">{previewDoc.payee || 'Vendor / Payee'}</p>
                  </div>
                  {previewDoc.recipient && (
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Bill To:</span>
                      <p className="font-bold text-slate-700">{previewDoc.recipient}</p>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">For What to Pay (Purpose):</span>
                  <p className="font-semibold text-slate-800">{previewDoc.purpose || 'Payment for goods/services'}</p>
                </div>
                {previewDoc.invoiceNumber && (
                  <div className="text-[11px] text-slate-500 font-mono">
                    Invoice #: <strong>{previewDoc.invoiceNumber}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Line Items Table if present */}
            {previewDoc.lineItems && previewDoc.lineItems.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Itemized Charges &amp; Quantities:
                </label>
                <div className="rounded-2xl border border-slate-200 overflow-hidden max-h-40 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Item Description</th>
                        <th className="py-2 px-3">Qty</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {previewDoc.lineItems.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 font-bold text-[#012456]">{item.name}</td>
                          <td className="py-2 px-3 text-slate-500">{item.qty || '-'}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                              {item.category || 'General'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-black text-slate-900">
                            {previewDoc.currency ? `${previewDoc.currency} ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : formatAmount(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Extracted Text Content */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <label className="text-xs font-bold text-slate-700 block">
                OCR Extracted Document Content:
              </label>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto selection:bg-[#5391FE]/20">
                {previewDoc.fullText || previewDoc.preview || 'No text extracted for this document.'}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-2">
              <span className="text-[11px] text-slate-400">
                Document ID: <code className="font-mono text-slate-600">{previewDoc.id}</code>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDelete(previewDoc.id, previewDoc.name)}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 rounded-xl bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploadView;
