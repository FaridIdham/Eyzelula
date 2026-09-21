import React, { useState } from 'react';
import {
  FileCheck2,
  UploadCloud,
  FileSpreadsheet,
  Clock,
  ExternalLink,
  Edit3,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  Download,
  Filter,
  Plus
} from 'lucide-react';
import { ConversionHistoryItem, QuizData } from '../types';
import { downloadCsvFile } from '../services/csvExport';
import { getSafeGoogleFormResponderUri } from '../services/googleForms';

interface HistoryDashboardProps {
  history: ConversionHistoryItem[];
  onLoadIntoEditor: (item: ConversionHistoryItem) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  onStartNewConversion: () => void;
}

export const HistoryDashboard: React.FC<HistoryDashboardProps> = ({
  history,
  onLoadIntoEditor,
  onDeleteHistoryItem,
  onClearHistory,
  onStartNewConversion
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'uploaded_form' | 'exported_csv' | 'reviewing'>('ALL');

  // Metrics
  const totalFiles = history.length;
  const totalQuestionsConverted = history.reduce((acc, item) => acc + item.questionCount, 0);
  const totalFormsCreated = history.filter(item => item.status === 'uploaded_form').length;
  const totalCsvExported = history.filter(item => item.status === 'exported_csv').length;

  // Filtered list
  const filteredHistory = history.filter(item => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.fileName.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard & Riwayat Konversi
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Pantau status pembuatan kuis, tautan Google Forms, dan unduh cadangan file soal.
          </p>
        </div>

        <button
          onClick={onStartNewConversion}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-sm transition active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Konversi File Baru</span>
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total File</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalFiles}</p>
          <p className="text-xs text-slate-500 mt-1">Dokumen diproses</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Soal</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalQuestionsConverted}</p>
          <p className="text-xs text-slate-500 mt-1">Butir soal terkonversi</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Google Forms</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalFormsCreated}</p>
          <p className="text-xs text-slate-500 mt-1">Formulir aktif online</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ekspor CSV</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalCsvExported}</p>
          <p className="text-xs text-slate-500 mt-1">Cadangan spreadsheet</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua ({history.length})
            </button>
            <button
              onClick={() => setStatusFilter('uploaded_form')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === 'uploaded_form'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Google Forms ({totalFormsCreated})
            </button>
            <button
              onClick={() => setStatusFilter('reviewing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === 'reviewing'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Draf Editor
            </button>
          </div>

          {/* Search Input & Clear history */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama file / judul..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            {history.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                title="Bersihkan Semua Riwayat"
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* History Table or Empty State */}
        {filteredHistory.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileCheck2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Belum Ada Riwayat Konversi</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Mulai dengan mengunggah file Word (.docx) atau PDF soal ujian Anda untuk mengonversi menjadi kuis Google Form.
            </p>
            <button
              onClick={onStartNewConversion}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Konversi Soal Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <th className="py-3 px-4">Dokumen & Judul Kuis</th>
                  <th className="py-3 px-4">Jumlah Soal</th>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredHistory.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    {/* Document Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 font-bold text-[10px] uppercase">
                          {item.fileType}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">
                            {item.fileName}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Question count */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-700">{item.questionCount} Soal</span>
                      <span className="text-[11px] text-slate-400 block">{item.totalPoints} Poin</span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {new Date(item.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        {new Date(item.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.status === 'uploaded_form' ? (
                        <div className="inline-flex flex-col items-start gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Google Form Siap
                          </span>
                          {item.emailSentTo && (
                            <span className="text-[10px] text-indigo-600 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" />
                              Email terkirim
                            </span>
                          )}
                        </div>
                      ) : item.status === 'exported_csv' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                          <FileSpreadsheet className="w-3 h-3" />
                          Diekspor ke CSV
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          <Edit3 className="w-3 h-3" />
                          Draf di Editor
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Open Form link if available */}
                        {item.responderUri && (
                          <a
                            href={getSafeGoogleFormResponderUri(item.responderUri, item.formId)}
                            target="_blank"
                            rel="noreferrer"
                            title="Buka Kuis Google Forms"
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        {/* Download CSV */}
                        <button
                          type="button"
                          onClick={() => downloadCsvFile(item.quizData)}
                          title="Unduh File CSV"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Edit again */}
                        <button
                          type="button"
                          onClick={() => onLoadIntoEditor(item)}
                          title="Buka dan Edit Soal"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete history */}
                        <button
                          type="button"
                          onClick={() => onDeleteHistoryItem(item.id)}
                          title="Hapus dari Riwayat"
                          className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
