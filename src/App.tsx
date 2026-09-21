import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { FileUploadStep } from './components/FileUploadStep';
import { QuestionEditor } from './components/QuestionEditor';
import { HistoryDashboard } from './components/HistoryDashboard';
import { GuideView } from './components/GuideView';
import { PublishConfirmationModal } from './components/PublishConfirmationModal';
import { ExportSuccessModal } from './components/ExportSuccessModal';
import { CsvExportModal } from './components/CsvExportModal';
import { FormatGuideModal } from './components/FormatGuideModal';
import {
  QuizData,
  ConversionHistoryItem,
  UserProfile
} from './types';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  auth
} from './services/firebase';
import { createGoogleForm, getSafeGoogleFormResponderUri } from './services/googleForms';
import { sendQuizReadyNotification } from './services/gmail';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const LOCAL_STORAGE_HISTORY_KEY = 'formquiz_history_v1';

export default function App() {
  // Navigation: 1. Dashboard dan Riwayat, 2. Konverter dan editor, 3. Panduan
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'converter' | 'guide'>('dashboard');

  // Authentication State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('Dokumen Soal');
  const [currentFileType, setCurrentFileType] = useState<'docx' | 'pdf' | 'text'>('docx');
  const [isLoadingExtraction, setIsLoadingExtraction] = useState<boolean>(false);

  // Modals
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishingStep, setPublishingStep] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [lastPublishedResult, setLastPublishedResult] = useState<{
    formTitle: string;
    responderUri: string;
    editUri: string;
    emailSentTo?: string;
    emailStatus?: 'sent' | 'skipped' | 'failed';
  } | null>(null);
  const [showCsvModal, setShowCsvModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // History State
  const [history, setHistory] = useState<ConversionHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return (parsed || []).map((item: ConversionHistoryItem) => ({
        ...item,
        responderUri: getSafeGoogleFormResponderUri(item.responderUri, item.formId)
      }));
    } catch (e) {
      return [];
    }
  });

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to persist history to localStorage', e);
    }
  }, [history]);

  // Auth observer
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser({
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL
        });
      },
      () => {
        // If current auth state is unknown or token expired
        if (auth.currentUser) {
          setUser({
            uid: auth.currentUser.uid,
            displayName: auth.currentUser.displayName,
            email: auth.currentUser.email,
            photoURL: auth.currentUser.photoURL
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.profile);
        showNotification('Berhasil masuk dengan Google!', 'success');
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked') {
        showNotification('Jendela popup diblokir oleh browser. Izinkan popup atau buka aplikasi di tab baru.', 'error');
      } else if (err?.code === 'auth/unauthorized-domain') {
        showNotification(`Domain ${window.location.hostname} belum didaftarkan di Firebase Console > Authentication > Settings > Authorized domains.`, 'error');
      } else {
        showNotification(`Gagal masuk dengan Google: ${err.message || 'Periksa izin popup browser Anda'}`, 'error');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      showNotification('Berhasil keluar dari akun Google.', 'info');
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  // Called when AI or fallback finishes extracting questions from document
  const handleQuizExtracted = (
    quiz: QuizData,
    fileName: string,
    fileType: 'docx' | 'pdf' | 'text',
    fallbackNotice?: string
  ) => {
    const sanitizedQuiz: QuizData = {
      ...quiz,
      questions: (quiz.questions || []).map(q => ({
        ...q
      }))
    };

    setActiveQuiz(sanitizedQuiz);
    setCurrentFileName(fileName);
    setCurrentFileType(fileType);
    setCurrentTab('converter');

    // Add draft entry to history
    const historyItem: ConversionHistoryItem = {
      id: `hist_${Date.now()}`,
      fileName,
      fileType,
      title: sanitizedQuiz.title,
      questionCount: sanitizedQuiz.questions.length,
      totalPoints: sanitizedQuiz.questions.reduce((acc, q) => acc + (q.points || 0), 0),
      createdAt: new Date().toISOString(),
      status: 'reviewing',
      quizData: sanitizedQuiz
    };

    setHistory(prev => [historyItem, ...prev.filter(h => h.id !== historyItem.id)]);
    if (fallbackNotice) {
      showNotification(`Berhasil mengekstrak ${quiz.questions.length} butir soal (${fallbackNotice})`, 'info');
    } else {
      showNotification(`Berhasil mengekstrak ${quiz.questions.length} butir soal dengan AI!`, 'success');
    }
  };

  // Open Publish Modal with auth validation
  const handleOpenPublishModal = () => {
    setShowPublishModal(true);
  };

  // Confirmed Google Form Creation
  const handleConfirmPublish = async (sendEmail: boolean) => {
    if (!activeQuiz) return;

    let token = await getAccessToken();
    if (!token) {
      try {
        const loginResult = await googleSignIn();
        if (loginResult) {
          token = loginResult.accessToken;
          setUser(loginResult.profile);
        } else {
          return;
        }
      } catch (err: any) {
        if (err?.code === 'auth/popup-blocked') {
          showNotification('Popup otorisasi diblokir. Harap izinkan popup atau buka aplikasi di tab baru.', 'error');
        } else {
          showNotification('Otorisasi Google diperlukan untuk membuat Google Form.', 'error');
        }
        return;
      }
    }

    setIsPublishing(true);
    setPublishingStep('1/3: Membuat Google Form baru di Google Drive Anda...');

    try {
      // Step 1: Create Form in Google Forms API
      const result = await createGoogleForm(activeQuiz, token);

      // Step 2: Automated Email notification if requested
      let emailStatus: 'sent' | 'skipped' | 'failed' = 'skipped';
      let emailSentTo = user?.email || undefined;

      if (sendEmail && emailSentTo) {
        setPublishingStep('2/3: Mengirim email notifikasi ringkasan kuis ke ' + emailSentTo + '...');
        const emailRes = await sendQuizReadyNotification({
          recipientEmail: emailSentTo,
          formTitle: result.title,
          formUrl: result.responderUri,
          editUrl: result.editUri,
          questionCount: result.totalQuestions,
          totalPoints: activeQuiz.questions.reduce((acc, q) => acc + (q.points || 0), 0),
          accessToken: token
        });

        emailStatus = emailRes.success ? 'sent' : 'failed';
      }

      setPublishingStep('3/3: Menyimpan status konversi ke dashboard riwayat...');

      // Step 3: Update conversion history
      const historyItem: ConversionHistoryItem = {
        id: `hist_${Date.now()}`,
        fileName: currentFileName,
        fileType: currentFileType,
        title: result.title,
        questionCount: result.totalQuestions,
        totalPoints: activeQuiz.questions.reduce((acc, q) => acc + (q.points || 0), 0),
        createdAt: new Date().toISOString(),
        status: 'uploaded_form',
        formId: result.formId,
        responderUri: result.responderUri,
        editUri: result.editUri,
        emailSentTo,
        emailStatus,
        quizData: activeQuiz
      };

      setHistory(prev => [historyItem, ...prev]);

      // Step 4: Show Success Modal
      setLastPublishedResult({
        formTitle: result.title,
        responderUri: result.responderUri,
        editUri: result.editUri,
        emailSentTo,
        emailStatus
      });

      setShowPublishModal(false);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Publish error:', err);
      showNotification(`Gagal membuat Google Form: ${err.message || 'Terjadi kesalahan pada Google Forms API'}`, 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleLoadIntoEditor = (item: ConversionHistoryItem) => {
    setActiveQuiz(item.quizData);
    setCurrentFileName(item.fileName);
    setCurrentFileType(item.fileType);
    setCurrentTab('converter');
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleClearHistory = () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua riwayat konversi? Tindakan ini tidak dapat dibatalkan.')) {
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col relative">
      {/* Global In-App Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 max-w-md animate-fade-in shadow-xl rounded-2xl overflow-hidden border">
          <div
            className={`flex items-start gap-3 p-4 text-sm font-medium ${
              toast.type === 'error'
                ? 'bg-red-900 text-white border-red-700'
                : toast.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />}
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-sky-300 shrink-0 mt-0.5" />}
            <span className="flex-1 text-xs leading-relaxed">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-white/70 hover:text-white transition shrink-0 ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        activeQuestionsCount={activeQuiz?.questions.length || 0}
      />

      {/* Main Content Area: 1. Dashboard dan Riwayat, 2. Konverter dan editor, 3. Panduan */}
      <main className="flex-1 pb-16">
        {/* 1. Dashboard dan Riwayat */}
        {currentTab === 'dashboard' && (
          <HistoryDashboard
            history={history}
            onLoadIntoEditor={handleLoadIntoEditor}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            onClearHistory={handleClearHistory}
            onStartNewConversion={() => {
              setActiveQuiz(null);
              setCurrentTab('converter');
            }}
          />
        )}

        {/* 2. Konverter dan editor */}
        {currentTab === 'converter' && (
          <>
            {!activeQuiz ? (
              <FileUploadStep
                onQuizExtracted={handleQuizExtracted}
                isLoading={isLoadingExtraction}
                setIsLoading={setIsLoadingExtraction}
              />
            ) : (
              <QuestionEditor
                quizData={activeQuiz}
                onChangeQuizData={setActiveQuiz}
                onOpenUploadNew={() => setActiveQuiz(null)}
                onOpenExportCsv={() => setShowCsvModal(true)}
                onOpenPublishModal={handleOpenPublishModal}
                fileName={currentFileName}
              />
            )}
          </>
        )}

        {/* 3. Panduan dan seterusnya */}
        {currentTab === 'guide' && (
          <GuideView onGoToConverter={() => setCurrentTab('converter')} />
        )}
      </main>

      {/* Modals */}
      {activeQuiz && (
        <>
          <PublishConfirmationModal
            isOpen={showPublishModal}
            onClose={() => setShowPublishModal(false)}
            onConfirmPublish={handleConfirmPublish}
            quizData={activeQuiz}
            user={user}
            onNeedLogin={handleLogin}
            isLoggingIn={isLoggingIn}
            isPublishing={isPublishing}
            publishingStep={publishingStep}
          />

          <ExportSuccessModal
            isOpen={showSuccessModal}
            onClose={() => setShowSuccessModal(false)}
            formTitle={lastPublishedResult?.formTitle || activeQuiz.title}
            responderUri={lastPublishedResult?.responderUri || ''}
            editUri={lastPublishedResult?.editUri || ''}
            emailSentTo={lastPublishedResult?.emailSentTo}
            emailStatus={lastPublishedResult?.emailStatus}
            quizData={activeQuiz}
            onGoToDashboard={() => {
              setShowSuccessModal(false);
              setCurrentTab('dashboard');
            }}
          />

          <CsvExportModal
            isOpen={showCsvModal}
            onClose={() => setShowCsvModal(false)}
            quizData={activeQuiz}
          />
        </>
      )}

      <FormatGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </div>
  );
}
