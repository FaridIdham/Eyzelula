import React from 'react';
import { UserProfile } from '../types';
import {
  FileCheck2,
  LayoutDashboard,
  HelpCircle,
  LogOut,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'dashboard' | 'converter' | 'guide';
  onSelectTab: (tab: 'dashboard' | 'converter' | 'guide') => void;
  user: UserProfile | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  activeQuestionsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  activeQuestionsCount = 0
}) => {
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">FormQuiz AI</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Google Forms
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Konverter Soal Word & PDF Otomatis</p>
            </div>
          </div>

          {/* Navigation Links: 1. Dashboard & Riwayat, 2. Konverter & Editor, 3. Panduan */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {/* 1. Dashboard dan Riwayat */}
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard & Riwayat</span>
            </button>

            {/* 2. Konverter dan Editor */}
            <button
              onClick={() => onSelectTab('converter')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'converter'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Konverter & Editor</span>
              {activeQuestionsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-600 text-white rounded-full font-bold">
                  {activeQuestionsCount}
                </span>
              )}
            </button>

            {/* 3. Panduan */}
            <button
              onClick={() => onSelectTab('guide')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'guide'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Panduan</span>
            </button>
          </nav>

          {/* Auth Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isIframe && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                title="Buka aplikasi di tab baru browser penuh untuk menghindari batasan popup iframe"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tab Baru</span>
              </a>
            )}

            {user ? (
              <div className="flex items-center gap-2 sm:gap-3 bg-slate-50 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Pengguna'}
                    className="w-8 h-8 rounded-full ring-1 ring-slate-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-sm">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[140px]">
                    {user.displayName || 'Pengguna Google'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate max-w-[140px]">{user.email}</p>
                </div>
                <button
                  onClick={onLogout}
                  title="Keluar"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg shadow-xs transition-all active:scale-98 disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>{isLoggingIn ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
