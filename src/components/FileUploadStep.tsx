import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  FileType,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { QuizData } from '../types';

interface FileUploadStepProps {
  onQuizExtracted: (quiz: QuizData, fileName: string, fileType: 'docx' | 'pdf' | 'text', fallbackNotice?: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const FileUploadStep: React.FC<FileUploadStepProps> = ({
  onQuizExtracted,
  isLoading,
  setIsLoading
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rawText, setRawText] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [defaultPoints, setDefaultPoints] = useState<number>(10);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('Memulai...');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMsg(null);
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => lowerName.endsWith(ext));

    if (!isValid) {
      setErrorMsg('Format file tidak didukung. Harap unggah dokumen bertipe .docx, .doc, atau .pdf.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('Ukuran file terlalu besar. Maksimal ukuran file adalah 25MB.');
      return;
    }

    setSelectedFile(file);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleStartExtraction = async () => {
    setErrorMsg(null);

    if (activeTab === 'upload') {
      if (!selectedFile) {
        setErrorMsg('Silakan pilih file soal (.docx atau .pdf) terlebih dahulu.');
        return;
      }
    } else if (activeTab === 'text') {
      if (!rawText.trim()) {
        setErrorMsg('Silakan tempel atau ketik teks soal ujian terlebih dahulu.');
        return;
      }
    }

    setIsLoading(true);
    setLoadingStep('Membaca dokumen soal...');

    try {
      let fileBase64 = '';
      let mimeType = '';
      let fileName = 'Soal Ujian';
      let fileType: 'docx' | 'pdf' | 'text' = 'text';

      if (activeTab === 'upload' && selectedFile) {
        fileName = selectedFile.name;
        mimeType = selectedFile.type || '';
        fileType = fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx';
        setLoadingStep('Mempersiapkan data dan ekstrak isi file...');
        fileBase64 = await fileToBase64(selectedFile);
      } else {
        fileName = 'Teks Soal Tempel';
        fileType = 'text';
      }

      setLoadingStep('Analisis AI Gemini: Mendeteksi soal, pilihan, dan kunci jawaban...');

      const response = await fetch('/api/extract-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64,
          mimeType,
          fileName,
          rawText: activeTab === 'text' ? rawText : undefined,
          userPrompt: `${userPrompt}. Bobot standar per soal: ${defaultPoints} poin.`
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        let fullError = errData.error || `HTTP ${response.status}: Gagal memproses dokumen.`;
        if (response.status === 404) {
          fullError = 'Layanan backend /api/extract-questions tidak ditemukan (HTTP 404). Pastikan file vercel.json dan folder api/ telah disertakan pada deployment Vercel Anda.';
        }
        if (errData.details) {
          fullError += ` Detail: ${errData.details}`;
        }
        if (errData.suggestion) {
          fullError += ` Saran: ${errData.suggestion}`;
        }
        throw new Error(fullError);
      }

      setLoadingStep('Memformat struktur butir soal...');
      const result = await response.json();

      if (!result.quizData || !result.quizData.questions || result.quizData.questions.length === 0) {
        throw new Error('Tidak ditemukan butir soal yang valid dalam dokumen ini. Pastikan dokumen memiliki format soal bernomor.');
      }

      const fallbackNotice = result.fallbackUsed ? (result.message || 'Diekstrak menggunakan parser cadangan.') : undefined;
      onQuizExtracted(result.quizData, fileName, fileType, fallbackNotice);
    } catch (err: any) {
      console.error('Extraction error:', err);
      setErrorMsg(err.message || 'Terjadi kegagalan saat mengekstrak soal.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Title & Introduction */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Ekstraksi Cerdas Berbasis AI
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Konversi Soal Word & PDF ke Google Forms
        </h1>
        <p className="mt-2 text-slate-600 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          Unggah naskah soal ujian Anda. AI akan otomatis mengidentifikasi nomor soal, opsi jawaban A-E,
          kunci jawaban, dan bobot nilai, siap diedit lalu diunggah langsung ke Google Forms.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Method Switcher Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Unggah File (.docx / .pdf)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'text'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Salin / Tempel Teks</span>
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                      <FileType className="w-7 h-7" />
                    </div>
                    <span className="font-bold text-slate-800 text-base">{selectedFile.name}</span>
                    <span className="text-xs text-slate-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB &bull; Klik untuk mengganti file
                    </span>
                    <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      File siap dianalisis
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                      <Upload className="w-7 h-7" />
                    </div>
                    <p className="text-base font-semibold text-slate-800">
                      Tarik & jatuhkan file soal di sini, atau{' '}
                      <span className="text-indigo-600 hover:underline">pilih file</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Mendukung format Microsoft Word (<strong>.docx</strong>, <strong>.doc</strong>) dan{' '}
                      <strong>.pdf</strong> (Maksimal 25MB)
                    </p>
                    <div className="flex items-center gap-2 mt-4 text-[11px] text-slate-400">
                      <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">DOCX</span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">PDF</span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200">DOC</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RAW TEXT INPUT */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Tempel Teks Soal Ujian
                </label>
                <textarea
                  rows={8}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder={`Contoh:
1. Organ tubuh manusia yang berfungsi memompa darah ke seluruh tubuh adalah...
A. Hati
B. Jantung
C. Paru-paru
D. Ginjal
Kunci: B

2. Sebutkan 2 fungsi utama akar pada tumbuhan!
(Esai/Uraian)`}
                  className="w-full rounded-xl border border-slate-300 p-3.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition"
                />
              </div>
            </div>
          )}

          {/* Optional Extraction Settings */}
          <div className="mt-6 pt-6 border-t border-slate-200 grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bobot Standar Tiap Soal
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={defaultPoints}
                  onChange={e => setDefaultPoints(Math.max(1, parseInt(e.target.value) || 10))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 pointer-events-none">
                  Poin
                </span>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Tambahan untuk AI (Opsional)
              </label>
              <input
                type="text"
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value)}
                placeholder="Contoh: Kunci jawaban ada di lembar paling akhir, buat opsi A-E"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          </div>

          {/* Error Message with Recovery Actions */}
          {errorMsg && (
            <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800">Proses Ekstrak Menemukan Kendala</p>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">{errorMsg}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleStartExtraction}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Coba Ekstrak Lagi</span>
                    </button>
                    {activeTab !== 'text' && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg(null);
                          setActiveTab('text');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-300 text-red-700 hover:bg-red-50 text-xs font-medium transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Gunakan Tab Salin / Tempel Teks</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="mt-6 p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="animate-spin text-indigo-600">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                    Sedang Memproses Dokumen
                  </span>
                  <p className="text-sm font-semibold text-slate-800">{loadingStep}</p>
                </div>
              </div>
              <div className="w-full bg-indigo-200/50 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-600 h-2 rounded-full w-2/3 animate-pulse"></div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 text-center">
                Memanfaatkan teknologi Gemini AI untuk analisis teks, opsi, dan kunci jawaban secara akurat.
              </p>
            </div>
          )}

          {/* Action Button (For Upload and Text) */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleStartExtraction}
              disabled={isLoading || (activeTab === 'upload' && !selectedFile) || (activeTab === 'text' && !rawText.trim())}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition active:scale-98"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ekstrak Soal dengan AI</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
