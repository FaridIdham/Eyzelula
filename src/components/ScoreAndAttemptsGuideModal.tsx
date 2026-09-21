import React, { useState } from 'react';
import {
  X,
  BarChart3,
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Users,
  GraduationCap,
  Eye,
  ArrowRight,
  HelpCircle,
  Clock,
  ShieldCheck,
  Award
} from 'lucide-react';

interface ScoreAndAttemptsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  formEditUri?: string;
  formResponderUri?: string;
  totalQuestions?: number;
  totalPoints?: number;
}

export const ScoreAndAttemptsGuideModal: React.FC<ScoreAndAttemptsGuideModalProps> = ({
  isOpen,
  onClose,
  formEditUri,
  formResponderUri,
  totalQuestions = 5,
  totalPoints = 100
}) => {
  const [activeTab, setActiveTab] = useState<'score' | 'attempts'>('score');

  if (!isOpen) return null;

  // Derive responses URL from edit URL if available
  const formResponsesUri = formEditUri
    ? formEditUri.replace(/\/edit(\?.*)?$/, '/edit#responses')
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative text-left my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Panduan Hasil Skor & Batas 2 Kali Respon
              </h2>
              <p className="text-xs text-slate-500">
                Cara melihat nilai siswa serta mengelola pembatasan 2 kali percobaan pengerjaan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl my-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('score')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'score'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>1. Di Mana Melihat Hasil Skor?</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attempts')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'attempts'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>2. Aturan Batas 2x Respon</span>
          </button>
        </div>

        {/* TAB 1: CARA MELIHAT HASIL SKOR */}
        {activeTab === 'score' && (
          <div className="space-y-4 text-xs">
            {/* Quick Action If Form Exists */}
            {formResponsesUri && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-emerald-950 font-bold">
                  <BarChart3 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Lihat langsung respon formulir yang telah dibuat:</span>
                </div>
                <a
                  href={formResponsesUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition shadow-2xs"
                >
                  <span>Buka Tab Jawaban Google Forms</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* A. Bagi Pengajar */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>A. Untuk Pengajar (Guru / Pembuat Soal)</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Pengajar dapat memantau seluruh nilai siswa di dua tempat utama di Google:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* 1. Tab Jawaban */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="font-bold text-indigo-700 block mb-1">
                    1. Tab "Jawaban" (Responses)
                  </span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Buka formulir di mode editor &rarr; klik tab <strong>Jawaban</strong> di bagian atas. Tersedia 3 mode:
                  </p>
                  <ul className="list-disc pl-4 text-[11px] text-slate-500 mt-1 space-y-0.5">
                    <li><strong>Ringkasan:</strong> Rata-rata skor & grafik sebaran.</li>
                    <li><strong>Pertanyaan:</strong> Analisis butir soal.</li>
                    <li><strong>Individual:</strong> Lembar ujian lengkap per siswa.</li>
                  </ul>
                </div>

                {/* 2. Google Sheets */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-bold text-emerald-700">2. Google Sheets (Spreadsheet)</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Di tab <strong>Jawaban</strong>, klik ikon hijau <strong>"Tautkan ke Spreadsheet"</strong>.
                  </p>
                  <p className="text-slate-500 text-[11px] mt-1">
                    Google otomatis membuat tabel spreadsheet rapi berisi: <em>Waktu Kirim (Timestamp), Email, Skor Total (contoh: 80/100), dan Jawaban per Nomor</em>.
                  </p>
                </div>
              </div>
            </div>

            {/* B. Bagi Siswa */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>B. Untuk Siswa (Peserta Ujian)</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Setelah siswa selesai mengerjakan dan mengklik tombol <strong>"Kirim" (Submit)</strong> di Google Forms:
              </p>
              <div className="p-3 bg-white rounded-xl border border-emerald-200 text-emerald-950 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Tombol "Lihat Skor" (View score):</strong> Muncul langsung di layar konfirmasi penyerahan Google Form. Siswa cukup mengklik tombol tersebut untuk melihat nilai akhir, jawaban benar, dan pembahasan kunci.
                </div>
              </div>
            </div>

            {/* C. Di Simulator CBT Aplikasi Ini */}
            <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-2xl text-indigo-950 flex items-start gap-2.5">
              <Award className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong>Di Simulator Ujian CBT Aplikasi ini:</strong> Skor akhir dihitung otomatis secara instan lengkap dengan persentase kelulusan, rincian jawaban benar/salah, serta kunci jawaban per butir soal.
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ATURAN BATAS 2 KALI RESPON */}
        {activeTab === 'attempts' && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 flex items-start gap-2.5">
              <RotateCcw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Ketentuan 2 Kali Percobaan:</strong> Siswa hanya diberikan hak mengulangi pengerjaan maksimal <strong>2 kali</strong>. Jika siswa mengirimkan respon ke-3 atau lebih, sistem/pengajar tidak akan menilainya.
              </div>
            </div>

            {/* Cara Menerapkan di Google Forms */}
            <div className="space-y-3">
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
                <span className="font-bold text-slate-900 block text-sm">
                  1. Bagaimana Cara Kerjanya di Google Forms?
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Secara bawaan, Google Forms hanya memiliki opsi <em>"Batasi ke 1 tanggapan"</em> atau tidak terbatas. Untuk menerapkan aturan <strong>tepat 2 kali</strong>:
                </p>
                <div className="space-y-2 pt-1 text-slate-700">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <strong>A. Melalui Rekap Google Sheets (Paling Mudah):</strong>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Buka Google Sheets hasil jawaban. Filter berdasarkan Email/Nama siswa. Anda dapat melihat waktu kirim ke-1 dan ke-2. Jika ada kiriman ke-3 dari siswa yang sama, guru cukup menghapus baris ke-3 tersebut.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <strong>B. Melalui Add-on Form Timer / formLimiter:</strong>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Add-on Form Timer dapat diatur untuk memberikan tautan token ujian yang hanya dapat diakses 2 kali per siswa.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <strong>C. Aturan Otomatis di Deskripsi Formulir:</strong>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Aplikasi ini secara otomatis mencantumkan aturan 2 kali percobaan di deskripsi pembuka Google Form sehingga siswa mengetahui batasannya sejak awal.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Di Simulator CBT Aplikasi Ini */}
              <div className="p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-xl shadow-2xs space-y-1.5">
                <span className="font-bold text-indigo-950 block text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  2. Otomatis Terkunci di Simulator CBT Aplikasi Ini
                </span>
                <p className="text-indigo-900 leading-relaxed">
                  Saat siswa menggunakan fitur <strong>Simulator Ujian Terproteksi (CBT)</strong> di aplikasi ini, sistem secara otomatis mencatat jumlah percobaan di browser.
                </p>
                <ul className="list-disc pl-4 text-[11px] text-indigo-800 space-y-0.5 mt-1">
                  <li><strong>Percobaan 1:</strong> Siswa mengerjakan ujian & melihat skor. Tersedia opsi ulangi (sisa 1x).</li>
                  <li><strong>Percobaan 2:</strong> Siswa mengerjakan ulang. Sistem menyimpan skor terbaik.</li>
                  <li><strong>Percobaan 3:</strong> Sistem otomatis <strong>mengunci akses</strong> dan menyatakan batas maksimal 2 kali telah habis.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[11px] text-slate-500">
            Total Soal: <strong>{totalQuestions}</strong> • Total Poin: <strong>{totalPoints}</strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs ml-auto"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
