import React, { useState } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  FileText,
  UploadCloud,
  FileSpreadsheet,
  Award,
  ArrowRight,
  Sparkles,
  BookOpen,
  Layers,
  Check
} from 'lucide-react';

interface GuideViewProps {
  onGoToConverter: () => void;
}

export const GuideView: React.FC<GuideViewProps> = ({ onGoToConverter }) => {
  const [activeTab, setActiveTab] = useState<'format' | 'workflow' | 'googleforms'>('format');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-xs">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Panduan Lengkap Penggunaan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Panduan FormQuiz AI
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100/90 max-w-xl leading-relaxed">
              Pelajari cara menyiapkan dokumen soal Word (.docx/.doc) atau PDF, mengedit soal dengan mudah, hingga mempublikasikan ke Google Forms secara otomatis.
            </p>
          </div>

          <button
            type="button"
            onClick={onGoToConverter}
            className="px-5 py-3 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98 inline-flex items-center gap-2 shrink-0"
          >
            <span>Mulai Konversi Soal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-8 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('format')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'format'
                ? 'bg-white text-indigo-900 shadow-sm'
                : 'bg-white/10 text-white/90 hover:bg-white/20'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1. Format Dokumen Soal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('workflow')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'workflow'
                ? 'bg-white text-indigo-900 shadow-sm'
                : 'bg-white/10 text-white/90 hover:bg-white/20'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Cara Kerja & Editor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('googleforms')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'googleforms'
                ? 'bg-white text-indigo-900 shadow-sm'
                : 'bg-white/10 text-white/90 hover:bg-white/20'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>3. Integrasi Google Forms & Nilai</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Format Dokumen Soal */}
      {activeTab === 'format' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Struktur Penulisan Dokumen Soal yang Dianjurkan</span>
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Aplikasi ini mendukung dokumen Microsoft Word (.docx, .doc) dan PDF. Agar seluruh butir soal terdeteksi 100% akurat tanpa ada yang terlewat, ikuti kaidah penulisan berikut:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contoh Standar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Format Pilihan Ganda Standar</span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Sangat Dianjurkan
                  </span>
                </div>
                <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-[11px] leading-relaxed">
                  1. Organ tubuh manusia yang menyaring darah adalah...<br />
                  A. Hati<br />
                  B. Ginjal<br />
                  C. Paru-paru<br />
                  D. Jantung<br />
                  <span className="text-emerald-400">Kunci: B</span><br />
                  <span className="text-slate-400">Pembahasan: Ginjal berfungsi menyaring zat sisa metabolisme dari darah.</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Kunci jawaban dapat ditulis langsung di bawah setiap nomor atau diletakkan di bagian akhir dokumen.
                </p>
              </div>

              {/* Kunci di Akhir */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Format Kunci Jawaban di Akhir</span>
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                    Didukung Penuh
                  </span>
                </div>
                <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-[11px] leading-relaxed">
                  --- Bagian Akhir Dokumen ---<br />
                  <span className="text-amber-300">Kunci Jawaban:</span><br />
                  1. B<br />
                  2. A<br />
                  3. C<br />
                  4. D<br />
                  5. B
                </div>
                <p className="text-[11px] text-slate-500">
                  AI akan secara otomatis mencocokkan daftar kunci jawaban di bagian akhir dokumen dengan setiap butir soal di atasnya.
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs text-emerald-950">
                <strong className="block font-bold text-emerald-900 mb-1">✓ Penomoran Jelas</strong>
                Gunakan nomor urut jelas seperti 1., 2., 3. atau 1) 2) 3).
              </div>
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-950">
                <strong className="block font-bold text-indigo-900 mb-1">✓ Huruf Opsi A-E</strong>
                Gunakan huruf kapital (A, B, C, D, E) untuk opsi jawaban.
              </div>
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-xs text-purple-950">
                <strong className="block font-bold text-purple-900 mb-1">✓ Berbagai Kata Kunci</strong>
                Dapat menggunakan: <em>Kunci, Kunci Jawaban, Jawaban, Ans, Answer</em>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Cara Kerja & Editor */}
      {activeTab === 'workflow' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Alur Kerja Konversi & Penyuntingan Soal</span>
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Aplikasi ini mempermudah pembuatan soal ujian dari dokumen yang sudah Anda miliki dalam 3 langkah ringkas:
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Unggah Dokumen Word atau PDF</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Pilih file soal ujian Anda dari komputer. Sistem ekstraksi cerdas akan membaca isi teks, mengidentifikasi pertanyaan, pilihan opsi, dan kunci jawaban secara instan.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Review & Edit di Konverter & Editor</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Anda dapat memeriksa redaksi soal, menambah/menghapus opsi jawaban, menandai kunci jawaban yang tepat, menyesuaikan bobot nilai per butir soal, serta melengkapi informasi mata kuliah dan identitas mahasiswa.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Publikasikan ke Google Forms & Simpan Cadangan</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Klik <strong>Unggah ke Google Forms</strong> untuk membuat formulir kuis resmi di akun Google Drive Anda, atau klik <strong>Ekspor CSV</strong> untuk menyimpan cadangan arsip soal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Google Forms & Nilai */}
      {activeTab === 'googleforms' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-600" />
              <span>Integrasi Google Forms, Kuis, & Rekap Respons</span>
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Google Forms yang dihasilkan otomatis dikonfigurasi dalam mode kuis (Quiz) dengan kunci jawaban dan skor langsung dari dokumen Anda:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs sm:text-sm">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Kuis Otomatis (Autograding)</span>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  Setiap butir soal langsung memiliki kunci jawaban dan bobot nilai di Google Forms. Saat mahasiswa mengklik <strong>Kirim</strong>, tombol <strong>"Lihat Skor"</strong> langsung tersedia sehingga mahasiswa dapat melihat skor dan pembahasan kunci.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs sm:text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <span>Rekap Respons di Tab Respons Guru</span>
                </div>
                <p className="text-xs text-indigo-900 leading-relaxed">
                  Pengajar dapat melihat rekap seluruh jawaban dan nilai mahasiswa melalui menu <strong>Tab Respons</strong> di Google Forms atau menghubungkannya ke <strong>Google Sheets</strong> untuk analisis statistik nilai.
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
              <strong className="block text-slate-900 font-bold">📋 Data Identitas Mahasiswa Otomatis:</strong>
              <p className="text-slate-600">
                Formulir Google Forms secara otomatis menyertakan kolom wajib: <strong>Nama Mahasiswa</strong>, <strong>NIM</strong>, <strong>Mata Kuliah</strong>, <strong>Kelas</strong>, dan <strong>Semester</strong> sebelum mahasiswa mulai menjawab butir soal.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
