import React, { useState } from 'react';
import {
  UploadCloud,
  Mail,
  CheckCircle,
  AlertCircle,
  X,
  FileQuestion,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { QuizData, UserProfile } from '../types';
import { formatHmsColon, formatHmsIndonesian } from '../utils/timeUtils';

interface PublishConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPublish: (sendEmail: boolean) => void;
  quizData: QuizData;
  user: UserProfile | null;
  onNeedLogin: () => void;
  isLoggingIn?: boolean;
  isPublishing: boolean;
  publishingStep: string;
}

export const PublishConfirmationModal: React.FC<PublishConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirmPublish,
  quizData,
  user,
  onNeedLogin,
  isLoggingIn = false,
  isPublishing,
  publishingStep
}) => {
  const [sendEmailNotification, setSendEmailNotification] = useState<boolean>(true);

  if (!isOpen) return null;

  const totalPoints = quizData.questions.reduce((acc, q) => acc + (q.points || 0), 0);
  const timePerQSec = quizData.securitySettings?.timePerQuestionSeconds || (quizData.securitySettings?.timePerQuestionMinutes ? quizData.securitySettings.timePerQuestionMinutes * 60 : 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative">
        {/* Close Button */}
        {!isPublishing && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              Konfirmasi Pembuatan Google Form
            </h2>
            <p className="text-xs text-slate-500">
              Formulir kuis akan dibuat langsung di akun Google Anda
            </p>
          </div>
        </div>

        {/* Action description & Account verification */}
        {!user ? (
          <div className="my-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Masuk dengan Akun Google Diperlukan</p>
                <p className="text-xs mt-1">
                  Untuk mengunggah kuis ke Google Forms secara otomatis, Anda perlu mengotorisasi akses
                  dengan akun Google Anda terlebih dahulu.
                </p>
                <button
                  type="button"
                  onClick={onNeedLogin}
                  disabled={isLoggingIn || isPublishing}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition disabled:opacity-50"
                >
                  {isLoggingIn ? 'Menghubungkan ke Google...' : 'Masuk dengan Google Sekarang'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 my-4">
            {/* Account Card */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Akun'}
                  className="w-10 h-10 rounded-full ring-1 ring-slate-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                  Akun Target Google Forms
                </span>
                <p className="text-xs font-bold text-slate-800 truncate">{user.displayName}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            </div>

            {/* Quiz Summary Box */}
            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2 text-xs">
              <div className="flex justify-between pb-1 border-b border-indigo-100/70">
                <span className="text-slate-600">Judul Formulir:</span>
                <span className="font-bold text-slate-900 text-right max-w-[240px] truncate">
                  {quizData.title}
                </span>
              </div>
              <div className="flex justify-between pb-1 border-b border-indigo-100/70">
                <span className="text-slate-600">Jumlah Butir Soal:</span>
                <span className="font-bold text-indigo-700">{quizData.questions.length} Soal</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-indigo-100/70">
                <span className="text-slate-600">Total Nilai / Poin:</span>
                <span className="font-bold text-slate-800">{totalPoints} Poin</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-indigo-100/70">
                <span className="text-slate-600">Alokasi Waktu:</span>
                <span className="font-bold text-indigo-700">
                  {formatHmsIndonesian(timePerQSec)} ({formatHmsColon(timePerQSec)}) / Nomor (Hitung Mundur)
                </span>
              </div>
              <div className="flex justify-between pb-1 border-b border-indigo-100/70">
                <span className="text-slate-600">Format Butir Soal:</span>
                <span className="font-bold text-slate-800">Bersih (Tanpa label waktu di tiap soal)</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-indigo-100/70">
                <span className="text-slate-600">Identitas Mahasiswa:</span>
                <span className="font-bold text-indigo-700">Nama, NIM, Mata Kuliah, Kelas, Semester</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-indigo-100/70">
                <span className="text-slate-600">Timer Hitung Mundur:</span>
                <span className="font-bold text-emerald-700">Add-on Form Timer / formLimiter</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Fitur Kuis (Quiz Grading):</span>
                <span className="font-bold text-emerald-700">Aktif Otomatis</span>
              </div>
            </div>

            {/* Email Notification Checkbox */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50/60 transition cursor-pointer">
              <input
                type="checkbox"
                id="emailNotificationCheck"
                checked={sendEmailNotification}
                onChange={e => setSendEmailNotification(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <label htmlFor="emailNotificationCheck" className="text-xs text-slate-700 cursor-pointer">
                <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  Kirim Notifikasi Email Otomatis
                </span>
                Kirim tautan pengerjaan dan editor Google Forms ke <strong>{user.email}</strong> setelah
                formulir siap.
              </label>
            </div>
          </div>
        )}

        {/* Publishing Loading State */}
        {isPublishing && (
          <div className="my-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
              <div>
                <p className="text-xs font-bold text-indigo-900">Sedang Membuat Formulir</p>
                <p className="text-xs text-indigo-700 mt-0.5">{publishingStep}</p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={isPublishing}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
          >
            Batal
          </button>

          {user && (
            <button
              type="button"
              disabled={isPublishing}
              onClick={() => onConfirmPublish(sendEmailNotification)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 transition active:scale-98 disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isPublishing ? 'Sedang Memproses...' : 'Konfirmasi & Buat Formulir'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
