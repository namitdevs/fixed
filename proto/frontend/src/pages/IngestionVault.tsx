import React, { useEffect, useState } from 'react';
import { 
  FileUp, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Trash2, 
  RefreshCw, 
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';
import { DocumentItem } from '../types';
import { ApiService } from '../services/api';

interface IngestionVaultProps {
  caseId: string;
  onRefreshStats?: () => void;
}

export const IngestionVault: React.FC<IngestionVaultProps> = ({ caseId, onRefreshStats }) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState('CDR');

  useEffect(() => {
    fetchDocuments();
  }, [caseId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await ApiService.listDocuments(caseId);
      if (res.data.success && res.data.data.documents) {
        setDocuments(res.data.data.documents);
      }
    } catch (e) {
      console.error('Failed to list documents:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sourceType', sourceType);

    try {
      setUploading(true);
      const res = await ApiService.uploadDocument(caseId, formData);
      if (res.data.success) {
        await fetchDocuments();
        if (onRefreshStats) onRefreshStats();
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Ensure file is CSV, JSON, TXT, or PDF.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleReprocess = async (docId: string) => {
    try {
      setReprocessingId(docId);
      await ApiService.reprocessDocument(caseId, docId);
      await fetchDocuments();
      if (onRefreshStats) onRefreshStats();
    } catch (e) {
      console.error('Reprocess failed:', e);
    } finally {
      setReprocessingId(null);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Delete this evidentiary document and its extracted records?')) return;
    try {
      await ApiService.deleteDocument(caseId, docId);
      await fetchDocuments();
      if (onRefreshStats) onRefreshStats();
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <FileUp className="w-5 h-5 text-blue-400" />
            <span>Evidentiary Ingestion Vault</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload heterogeneous evidence (CDRs, Bank Records, FIRs, PDF Intelligence Reports).
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-900 p-2 rounded-xl border border-slate-800">
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none"
          >
            <option value="CDR">CDR (Call Detail Records)</option>
            <option value="TRANSACTION">Financial Transactions</option>
            <option value="SUSPECT_LIST">Suspect Registry</option>
            <option value="FIR">FIR (First Information Report)</option>
            <option value="SURVEILLANCE">Police / Surveillance Report</option>
          </select>

          <label className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
            uploading ? 'bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}>
            <UploadCloud className="w-4 h-4" />
            <span>{uploading ? 'Processing File...' : 'Upload Evidence File'}</span>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              accept=".csv,.json,.txt,.pdf"
            />
          </label>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Ingested Evidence Archives ({documents.length})
          </div>
          <button 
            onClick={fetchDocuments}
            className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Type / Source</th>
                <th className="py-3 px-4">Records</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No documents ingested yet. Upload CSVs, TXT FIRs, or PDFs above.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200 flex items-center space-x-2">
                        {doc.fileType === 'CSV' ? (
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                        )}
                        <span className="truncate max-w-xs">{doc.originalFilename || doc.filename}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {(doc.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {doc.dataSource?.type || doc.fileType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="text-slate-200 font-bold">{doc.recordCount}</span>
                      <span className="text-slate-500 text-[10px] ml-1">extracted</span>
                    </td>
                    <td className="py-3 px-4">
                      {doc.processingStatus === 'COMPLETED' && (
                        <span className="flex items-center space-x-1.5 text-emerald-400 font-mono text-[11px]">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Indexed</span>
                        </span>
                      )}
                      {doc.processingStatus === 'PROCESSING' && (
                        <span className="flex items-center space-x-1.5 text-blue-400 font-mono text-[11px]">
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing</span>
                        </span>
                      )}
                      {doc.processingStatus === 'FAILED' && (
                        <span className="flex items-center space-x-1.5 text-red-400 font-mono text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      )}
                      {doc.processingStatus === 'PENDING' && (
                        <span className="text-slate-400 font-mono text-[11px]">Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleReprocess(doc.id)}
                        disabled={reprocessingId === doc.id}
                        title="Re-run extraction pipeline"
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400 transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${reprocessingId === doc.id ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        title="Delete document"
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};