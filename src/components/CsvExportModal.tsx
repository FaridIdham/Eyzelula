import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  X,
  FileCode,
  Check,
  HelpCircle,
  Copy
} from 'lucide-react';
import { QuizData } from '../types';
import { generateQuizCsv, downloadCsvFile, downloadJsonFile } from '../services/csvExport';

interface CsvExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizData: QuizData;
}

export const CsvExportModal: React.FC<CsvExportModalProps> = ({
  isOpen,
  onClose,
  quizData
}) => {
  const [delimiter, setDelimiter] = useState<',' | ';'>(',');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const csvPreview = generateQuizCsv(quizData, delimiter).slice(1); // remove BOM for textarea display

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(csvPreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              Ekspor Soal ke Format CSV
            </h2>
            <p className="text-xs text-slate-500">
              Dapat diimpor ke Excel, Google Sheets, LMS (Moodle/Canvas), atau bank soal
            </p>
          </div>
        </div>

        {/* Settings */}
        <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Karakter Pemisah (Delimiter)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDelimiter(',')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition ${
                  delimiter === ','
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Koma (,) - Standar
              </button>
              <button
                type="button"
                onClick={() => setDelimiter(';')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition ${
                  delimiter === ';'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Titik Koma (;) - Excel ID
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Gunakan titik koma jika Windows/Excel Anda menggunakan format regional Indonesia.
            </p>
          </div>

          <div className="flex flex-col justify-center">
            <span className="text-xs text-slate-500 font-medium">Ringkasan Ekspor:</span>
            <p className="text-xs font-bold text-slate-800 mt-0.5">
              {quizData.questions.length} Soal &bull; {quizData.title}
            </p>
            <p className="text-[11px] text-emerald-700 mt-1 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Dilengkapi header kolom & kunci jawaban
            </p>
          </div>
        </div>

        {/* CSV Preview */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>Pratinjau Data CSV</span>
            <button
              type="button"
              onClick={handleCopyClipboard}
              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-[11px]"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Tersalin ke Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Salin Teks CSV</span>
                </>
              )}
            </button>
          </div>
          <textarea
            readOnly
            rows={7}
            value={csvPreview}
            className="w-full text-xs font-mono bg-slate-900 text-emerald-300 p-3 rounded-xl outline-hidden overflow-x-auto"
          />
        </div>

        {/* Modal Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => downloadJsonFile(quizData)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
          >
            <FileCode className="w-4 h-4 text-slate-500" />
            <span>Ekspor format JSON</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                downloadCsvFile(quizData, delimiter);
                onClose();
              }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-100 transition active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Unduh File CSV (.csv)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
