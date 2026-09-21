import React, { useState } from 'react';
import {
  X,
  Puzzle,
  Clock,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Timer,
  Sliders,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface FormAddonGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  editUri?: string;
  questionCount?: number;
}

export const FormAddonGuideModal: React.FC<FormAddonGuideModalProps> = ({
  isOpen,
  onClose,
  editUri,
  questionCount = 5
}) => {
  const [selectedAddon, setSelectedAddon] = useState<'formTimer' | 'formLimiter'>('formTimer');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const formTimerDirectUrl1 = 'https://workspace.google.com/marketplace/app/form_timer/620454808595';
  const formTimerDirectUrl2 = 'https://workspace.google.com/marketplace/app/form_timer_for_google_forms/702084063361';
  const formLimiterDirectUrl = 'https://workspace.google.com/marketplace/app/form_response_limit_form_limiter_formlim/636193074458';
  const formTimerSearchUrl = 'https://workspace.google.com/marketplace/search/form%20timer';
  const formLimiterSearchUrl = 'https://workspace.google.com/marketplace/search/formlimiter';
  const searchMarketplaceUrl = 'https://workspace.google.com/marketplace/search/form%20timer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative text-left my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Puzzle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Panduan Aktifkan Add-on di Google Forms
              </h2>
              <p className="text-xs text-slate-500">
                Gunakan <strong>Get add-ons</strong> untuk memasang timer hitung mundur interaktif & batas waktu
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

        {/* Quick Context Banner */}
        <div className="my-4 p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Kuis ini dirancang dengan alokasi waktu hitung mundur <strong>per butir nomor soal</strong> untuk {questionCount} butir soal.
            </span>
          </div>
          {editUri && (
            <a
              href={editUri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900 underline text-xs ml-auto"
            >
              <span>Buka Editor Form</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Anti-Error / Multi-Account Troubleshooting Alert */}
        <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-950 block">
                Solusi Jika Link Marketplace Menampilkan Error / Tidak Tersedia:
              </span>
              <p className="text-amber-900/90 leading-relaxed text-[11px]">
                Jika muncul pesan <em>"Aplikasi tidak tersedia"</em> atau error akun Google, gunakan <strong>Metode Langsung dari Google Form (100% Berhasil)</strong>: Buka Google Form Anda &rarr; klik ikon <strong>Titik Tiga (⋮)</strong> di kanan atas &rarr; pilih <strong>"Dapatkan add-on" (Get add-ons)</strong> &rarr; cari <em>"Form Timer"</em>. Cara ini aman dari kendala multi-akun maupun blokir akun sekolah (@belajar.id).
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection: Form Timer vs formLimiter */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mb-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedAddon('formTimer')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
              selectedAddon === 'formTimer'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Timer className="w-4 h-4" />
            <span>1. Form Timer (Rekomendasi)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedAddon('formLimiter')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
              selectedAddon === 'formLimiter'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>2. formLimiter</span>
          </button>
        </div>

        {/* Step-by-Step Instructions */}
        {selectedAddon === 'formTimer' ? (
          <div className="space-y-3.5 text-xs">
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Fungsi Form Timer:</strong> Menampilkan stopwatch hitung mundur melayang (*floating countdown*) langsung pada layar siswa saat mengerjakan Google Form, serta otomatis mengirim jawaban saat alokasi waktu hitung mundur per nomor telah habis.
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                  1
                </span>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">Buka Formulir di Google Forms Editor</p>
                  <p className="text-slate-600 mt-0.5">
                    Buka Google Forms yang baru saja Anda buat dalam mode edit.
                  </p>
                  {editUri && (
                    <a
                      href={editUri}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-indigo-600 hover:bg-slate-50 font-bold transition shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Google Forms Editor Saya</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">
                    Klik Ikon Titik Tiga (⋮) di Kanan Atas &rarr; Pilih "Dapatkan add-on" (Get add-ons)
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Menu ini akan membuka jendela Google Workspace Marketplace di dalam Google Forms.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                  3
                </span>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">Cari "Form Timer" & Pasang (Install)</p>
                  <p className="text-slate-600 mt-0.5">
                    Ketik <strong>Form Timer</strong> pada bilah pencarian Marketplace, pilih aplikasi, lalu klik <strong>Pasang / Install</strong> dan izinkan akses Google Anda.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    <a
                      href={formTimerDirectUrl1}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Form Timer (Link Langsung 1)</span>
                    </a>
                    <a
                      href={formTimerDirectUrl2}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl font-bold transition shadow-2xs text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Form Timer for Forms (Link 2)</span>
                    </a>
                    <a
                      href={formTimerSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-semibold transition text-xs"
                    >
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                      <span>Pencarian Marketplace</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy('Form Timer', 'copy-timer')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition text-xs shadow-2xs"
                    >
                      {copiedLink === 'copy-timer' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Kata Kunci Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Salin Kata Kunci "Form Timer"</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    💡 <em>Tips:</em> Buka formulir Anda &rarr; klik ikon titik tiga (⋮) di kanan atas &rarr; <strong>Dapatkan add-on (Get add-ons)</strong> &rarr; tempelkan "Form Timer" untuk instalasi instan.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                  4
                </span>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">
                    Aktifkan Timer melalui Ikon Puzzle (🧩 Add-ons)
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Di Google Forms, klik ikon puzzle (🧩) di bilah atas &rarr; pilih <strong>Form Timer</strong> &rarr; atur alokasi durasi pengerjaan hitung mundur per nomor soal &rarr; klik Simpan/Aktifkan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 text-xs">
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-emerald-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Fungsi formLimiter:</strong> Menutup penerimaan respon formulir secara otomatis (*stop accepting responses*) tepat pada batas tanggal & jam tertentu, atau setelah kuota respon terpenuhi.
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                  1
                </span>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">Buka Formulir di Google Forms Editor</p>
                  <p className="text-slate-600 mt-0.5">
                    Buka Google Forms yang baru dibuat dalam mode editor.
                  </p>
                  {editUri && (
                    <a
                      href={editUri}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-emerald-700 hover:bg-slate-50 font-bold transition shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Google Forms Editor Saya</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">
                    Klik Menu Titik Tiga (⋮) &rarr; Pilih "Dapatkan add-on" (Get add-ons)
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Jendela Google Workspace Marketplace akan muncul.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                  3
                </span>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">Cari "formLimiter" & Pasang</p>
                  <p className="text-slate-600 mt-0.5">
                    Pilih add-on <strong>formLimiter</strong> (oleh New Visions CloudLab), klik Pasang / Install dan berikan izin.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    <a
                      href={formLimiterDirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka formLimiter (Link Langsung)</span>
                    </a>
                    <a
                      href={formLimiterSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 rounded-xl font-bold transition shadow-2xs text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Pencarian Marketplace</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy('formLimiter', 'copy-limiter')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition text-xs shadow-2xs"
                    >
                      {copiedLink === 'copy-limiter' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Kata Kunci Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Salin Kata Kunci "formLimiter"</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    💡 <em>Tips:</em> Buka formulir Anda &rarr; klik ikon titik tiga (⋮) di kanan atas &rarr; <strong>Dapatkan add-on (Get add-ons)</strong> &rarr; tempelkan "formLimiter" untuk instalasi instan.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                  4
                </span>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">Atur Batas Waktu Melalui Ikon Puzzle (🧩)</p>
                  <p className="text-slate-600 mt-0.5">
                    Klik ikon puzzle (🧩) &rarr; pilih <strong>formLimiter</strong> &rarr; pilih opsi "date and time" &rarr; tentukan jam selesai ujian &rarr; klik <strong>Save and enable</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <a
            href={searchMarketplaceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <span>Cari Semua Add-on Timer di Marketplace</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs ml-auto"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
