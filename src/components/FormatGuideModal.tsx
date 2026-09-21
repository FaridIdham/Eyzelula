import React from 'react';
import { HelpCircle, CheckCircle2, FileText, Sparkles, Lightbulb, X } from 'lucide-react';

interface FormatGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FormatGuideModal: React.FC<FormatGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              Panduan Format Dokumen Soal
            </h2>
            <p className="text-xs text-slate-500">
              Tips agar AI mengenali butir soal, opsi A-E, dan kunci jawaban secara sempurna
            </p>
          </div>
        </div>

        <div className="space-y-4 my-4 text-xs text-slate-700">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              1. Format Standar Pilihan Ganda
            </h3>
            <p className="text-slate-600 mb-2">
              Beri nomor pada setiap soal dan gunakan huruf kapital A, B, C, D, atau E untuk opsi:
            </p>
            <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] leading-relaxed">
              1. Organ tubuh manusia yang menyaring darah adalah...<br />
              A. Hati<br />
              B. Ginjal<br />
              C. Paru-paru<br />
              D. Jantung<br />
              <span className="text-emerald-400">Kunci: B</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              2. Penempatan Kunci Jawaban
            </h3>
            <p className="text-slate-600">
              AI mendukung 3 cara pendeteksian kunci jawaban:
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-600">
              <li><strong>Di bawah masing-masing soal</strong>: <code>Kunci: A</code> atau <code>Jawaban: B</code></li>
              <li><strong>Tanda visual</strong>: Jawaban yang dicetak tebal (bold), digarisbawahi, atau diberi tanda bintang (*)</li>
              <li><strong>Daftar Kunci di akhir halaman</strong>: Contoh: <code>KUNCI JAWABAN: 1. A, 2. C, 3. D</code></li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              3. Fleksibilitas Editor Manual
            </h3>
            <p className="text-slate-600">
              Jangan khawatir jika dokumen asli memiliki ketidaksempurnaan. Anda dapat memeriksa dan
              mengedit setiap pertanyaan, mengubah kunci jawaban, menambah opsi, atau mengatur poin
              sebelum formulir Google Forms dibuat secara final.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};
