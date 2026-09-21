import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Layers,
  HelpCircle,
  Search,
  Check,
  Lock,
  Maximize2,
  GraduationCap
} from 'lucide-react';
import { Question, QuestionType, QuizData } from '../types';

interface QuestionEditorProps {
  quizData: QuizData;
  onChangeQuizData: (updated: QuizData) => void;
  onOpenUploadNew: () => void;
  onOpenExportCsv: () => void;
  onOpenPublishModal: () => void;
  fileName: string;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  quizData,
  onChangeQuizData,
  onOpenUploadNew,
  onOpenExportCsv,
  onOpenPublishModal,
  fileName
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bulkPointsValue, setBulkPointsValue] = useState<number>(10);
  const [showBulkPointsModal, setShowBulkPointsModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Update Quiz Title, Description, or Academic Identity
  const handleUpdateMeta = (
    field: 'title' | 'description' | 'mataKuliah' | 'kelas' | 'semester',
    value: string
  ) => {
    onChangeQuizData({
      ...quizData,
      [field]: value
    });
  };

  // Update single question property
  const handleUpdateQuestion = (index: number, updatedFields: Partial<Question>) => {
    const newQuestions = [...quizData.questions];
    newQuestions[index] = { ...newQuestions[index], ...updatedFields };
    onChangeQuizData({
      ...quizData,
      questions: newQuestions
    });
  };

  // Update option text
  const handleUpdateOption = (qIndex: number, optIndex: number, value: string) => {
    const question = quizData.questions[qIndex];
    const newOptions = [...question.options];
    newOptions[optIndex] = value;

    // If the changed option was the selected correctAnswer, update correctAnswer text too
    let newCorrectAnswer = question.correctAnswer;
    if (question.correctOptionIndices.includes(optIndex)) {
      newCorrectAnswer = value;
    }

    handleUpdateQuestion(qIndex, {
      options: newOptions,
      correctAnswer: newCorrectAnswer
    });
  };

  // Select correct option for MULTIPLE_CHOICE
  const handleSelectRadioCorrect = (qIndex: number, optIndex: number) => {
    const question = quizData.questions[qIndex];
    const selectedOptionText = question.options[optIndex] || '';
    handleUpdateQuestion(qIndex, {
      correctAnswer: selectedOptionText,
      correctOptionIndices: [optIndex]
    });
  };

  // Toggle correct option for CHECKBOX
  const handleToggleCheckboxCorrect = (qIndex: number, optIndex: number) => {
    const question = quizData.questions[qIndex];
    const currentIndices = question.correctOptionIndices || [];
    let updatedIndices: number[];

    if (currentIndices.includes(optIndex)) {
      updatedIndices = currentIndices.filter(i => i !== optIndex);
    } else {
      updatedIndices = [...currentIndices, optIndex].sort((a, b) => a - b);
    }

    const firstAnswer = updatedIndices.length > 0 ? question.options[updatedIndices[0]] || '' : '';

    handleUpdateQuestion(qIndex, {
      correctOptionIndices: updatedIndices,
      correctAnswer: firstAnswer
    });
  };

  // Add new option to question
  const handleAddOption = (qIndex: number) => {
    const question = quizData.questions[qIndex];
    const optionLetter = String.fromCharCode(65 + question.options.length); // A, B, C, D, E...
    const newOptions = [...question.options, `Pilihan ${optionLetter}`];
    handleUpdateQuestion(qIndex, { options: newOptions });
  };

  // Delete option from question
  const handleDeleteOption = (qIndex: number, optIndex: number) => {
    const question = quizData.questions[qIndex];
    if (question.options.length <= 2) {
      showToast('Soal pilihan ganda minimal memiliki 2 pilihan opsi.');
      return;
    }
    const newOptions = question.options.filter((_, i) => i !== optIndex);
    // adjust correct option indices
    const newCorrectIndices = question.correctOptionIndices
      .filter(i => i !== optIndex)
      .map(i => (i > optIndex ? i - 1 : i));

    const newCorrectAnswer = newCorrectIndices.length > 0 ? newOptions[newCorrectIndices[0]] : '';

    handleUpdateQuestion(qIndex, {
      options: newOptions,
      correctOptionIndices: newCorrectIndices,
      correctAnswer: newCorrectAnswer
    });
  };

  // Add new question
  const handleAddNewQuestion = () => {
    const defaultTimeSec = quizData.securitySettings?.timePerQuestionSeconds || (quizData.securitySettings?.timePerQuestionMinutes ? quizData.securitySettings.timePerQuestionMinutes * 60 : 60);
    const newQ: Question = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      number: quizData.questions.length + 1,
      text: 'Tuliskan pertanyaan baru di sini...',
      type: 'MULTIPLE_CHOICE',
      options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'],
      correctAnswer: 'Opsi A',
      correctOptionIndices: [0],
      points: 10,
      timeLimitSeconds: defaultTimeSec,
      timeLimitMinutes: Math.max(1, Math.round(defaultTimeSec / 60)),
      explanation: ''
    };
    onChangeQuizData({
      ...quizData,
      questions: [...quizData.questions, newQ]
    });
  };

  // Duplicate question
  const handleDuplicateQuestion = (index: number) => {
    const target = quizData.questions[index];
    const duplicated: Question = {
      ...target,
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text: `${target.text} (Salinan)`
    };
    const newQuestions = [...quizData.questions];
    newQuestions.splice(index + 1, 0, duplicated);

    // renumber
    const renumbered = newQuestions.map((q, idx) => ({ ...q, number: idx + 1 }));
    onChangeQuizData({ ...quizData, questions: renumbered });
  };

  // Delete question
  const handleDeleteQuestion = (index: number) => {
    if (quizData.questions.length <= 1) {
      showToast('Kuis minimal harus memiliki setidaknya 1 butir soal.');
      return;
    }
    const newQuestions = quizData.questions.filter((_, i) => i !== index);
    const renumbered = newQuestions.map((q, idx) => ({ ...q, number: idx + 1 }));
    onChangeQuizData({ ...quizData, questions: renumbered });
  };

  // Move question Up/Down
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= quizData.questions.length) return;

    const newQuestions = [...quizData.questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIndex];
    newQuestions[targetIndex] = temp;

    const renumbered = newQuestions.map((q, idx) => ({ ...q, number: idx + 1 }));
    onChangeQuizData({ ...quizData, questions: renumbered });
  };

  // Bulk points setter
  const handleApplyBulkPoints = () => {
    const updated = quizData.questions.map(q => ({
      ...q,
      points: bulkPointsValue
    }));
    onChangeQuizData({ ...quizData, questions: updated });
    setShowBulkPointsModal(false);
    showToast(`Bobot poin semua butir soal diubah menjadi ${bulkPointsValue} poin.`);
  };

  // Stats
  const totalQuestions = quizData.questions.length;
  const totalPoints = quizData.questions.reduce((acc, q) => acc + (q.points || 0), 0);
  const questionsWithoutKey = quizData.questions.filter(
    q => (q.type === 'MULTIPLE_CHOICE' || q.type === 'CHECKBOX') && (!q.correctOptionIndices || q.correctOptionIndices.length === 0)
  );

  // Filtering
  const filteredQuestions = quizData.questions.filter((q, index) => {
    if (filterType === 'MISSING_KEY') {
      const isMissing =
        (q.type === 'MULTIPLE_CHOICE' || q.type === 'CHECKBOX') &&
        (!q.correctOptionIndices || q.correctOptionIndices.length === 0);
      if (!isMissing) return false;
    } else if (filterType !== 'ALL' && q.type !== filterType) {
      return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchText = q.text.toLowerCase().includes(query);
      const matchOpt = q.options.some(opt => opt.toLowerCase().includes(query));
      return matchText || matchOpt;
    }

    return true;
  });

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button
          onClick={onOpenUploadNew}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Unggah File Lain</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={onOpenPublishModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-98"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Unggah ke Google Forms</span>
          </button>
        </div>
      </div>

      {/* Quiz Header Settings Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Judul Formulir Kuis
            </label>
            <input
              type="text"
              value={quizData.title}
              onChange={e => handleUpdateMeta('title', e.target.value)}
              placeholder="Contoh: Penilaian Harian Biologi Bab 3"
              className="w-full text-xl sm:text-2xl font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-indigo-600 outline-hidden pb-1 transition"
            />
          </div>
          <span className="text-xs text-slate-400 shrink-0 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            Sumber: {fileName}
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Petunjuk Pengerjaan / Deskripsi Formulir
          </label>
          <textarea
            rows={2}
            value={quizData.description}
            onChange={e => handleUpdateMeta('description', e.target.value)}
            placeholder="Tuliskan petunjuk pengerjaan kuis..."
            className="w-full text-sm text-slate-700 border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 outline-hidden transition"
          />
        </div>

        {/* Identitas Mahasiswa & Perkuliahan (Google Form Auto-Included) */}
        <div className="mt-4 p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                <GraduationCap className="w-4 h-4" />
              </span>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Identitas Mahasiswa & Mata Kuliah (Google Form)
                </span>
                <span className="text-[11px] text-slate-500">
                  Otomatis disertakan ke Google Form: <strong>Nama Mahasiswa</strong>, <strong>NIM</strong>, <strong>Mata Kuliah</strong>, <strong>Kelas</strong>, dan <strong>Semester</strong>
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
              ✓ 5 Kolom Wajib Aktif
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Mata Kuliah (Default)
              </label>
              <input
                type="text"
                value={quizData.mataKuliah || ''}
                onChange={e => handleUpdateMeta('mataKuliah', e.target.value)}
                placeholder="Contoh: Pemrograman Web"
                className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-hidden transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Kelas (Default)
              </label>
              <input
                type="text"
                value={quizData.kelas || ''}
                onChange={e => handleUpdateMeta('kelas', e.target.value)}
                placeholder="Contoh: TI-3A / Reguler"
                className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-hidden transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Semester (Default)
              </label>
              <input
                type="text"
                value={quizData.semester || ''}
                onChange={e => handleUpdateMeta('semester', e.target.value)}
                placeholder="Contoh: Semester 4"
                className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-hidden transition"
              />
            </div>
          </div>
        </div>

        {/* Stats & Quick Actions Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <Layers className="w-4 h-4 text-indigo-600" />
              <strong>{totalQuestions}</strong> Butir Soal
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Total <strong>{totalPoints}</strong> Poin
            </span>
            {questionsWithoutKey.length > 0 ? (
              <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-semibold border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                {questionsWithoutKey.length} soal belum ada kunci
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Semua kunci jawaban lengkap
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBulkPointsModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-3 py-1.5 rounded-lg transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Atur Bobot Poin Seragam</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filterType === 'ALL'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Semua ({totalQuestions})
          </button>
          <button
            onClick={() => setFilterType('MULTIPLE_CHOICE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filterType === 'MULTIPLE_CHOICE'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Pilihan Ganda
          </button>
          <button
            onClick={() => setFilterType('CHECKBOX')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filterType === 'CHECKBOX'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Kotak Centang
          </button>
          <button
            onClick={() => setFilterType('PARAGRAPH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filterType === 'PARAGRAPH'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Esai
          </button>
          {questionsWithoutKey.length > 0 && (
            <button
              onClick={() => setFilterType('MISSING_KEY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filterType === 'MISSING_KEY'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              Belum Ada Kunci ({questionsWithoutKey.length})
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari teks soal..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
          />
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-5">
        {filteredQuestions.map((q, filteredIdx) => {
          const actualIndex = quizData.questions.findIndex(item => item.id === q.id);

          return (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-sm transition p-5 sm:p-6"
            >
              {/* Question Header Card */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-sm flex items-center justify-center border border-indigo-100">
                    {actualIndex + 1}
                  </span>

                  {/* Question Type Selector */}
                  <select
                    value={q.type}
                    onChange={e => {
                      const newType = e.target.value as QuestionType;
                      const hasOptions = q.options && q.options.length >= 2;
                      const fallbackOpts = ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'];
                      handleUpdateQuestion(actualIndex, {
                        type: newType,
                        options: (newType === 'MULTIPLE_CHOICE' || newType === 'CHECKBOX') && !hasOptions
                          ? fallbackOpts
                          : q.options,
                        correctOptionIndices: (newType === 'MULTIPLE_CHOICE' || newType === 'CHECKBOX') && (!q.correctOptionIndices || q.correctOptionIndices.length === 0)
                          ? [0]
                          : q.correctOptionIndices
                      });
                    }}
                    className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="MULTIPLE_CHOICE">Pilihan Ganda (1 Jawaban Benar)</option>
                    <option value="CHECKBOX">Kotak Centang (Bisa Banyak Jawaban)</option>
                    <option value="SHORT_ANSWER">Isian Singkat</option>
                    <option value="PARAGRAPH">Esai / Uraian Paragraf</option>
                  </select>
                </div>

                {/* Points & Reorder Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200" title="Bobot nilai butir soal">
                    <span className="text-xs text-slate-500 font-medium">Poin:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={q.points}
                      onChange={e =>
                        handleUpdateQuestion(actualIndex, {
                          points: Math.max(0, parseInt(e.target.value) || 0)
                        })
                      }
                      className="w-12 text-center text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded px-1 py-0.5 outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <button
                      onClick={() => handleMoveQuestion(actualIndex, 'up')}
                      disabled={actualIndex === 0}
                      title="Pindahkan ke Atas"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveQuestion(actualIndex, 'down')}
                      disabled={actualIndex === quizData.questions.length - 1}
                      title="Pindahkan ke Bawah"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 border-l border-slate-200"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleDuplicateQuestion(actualIndex)}
                    title="Duplikat Soal"
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteQuestion(actualIndex)}
                    title="Hapus Soal"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Textarea */}
              <div className="mb-4">
                <textarea
                  rows={3}
                  value={q.text}
                  onChange={e => handleUpdateQuestion(actualIndex, { text: e.target.value })}
                  placeholder="Tuliskan teks pertanyaan di sini..."
                  className="w-full text-sm font-medium text-slate-800 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition leading-relaxed"
                />
              </div>

              {/* Options Section (Multiple Choice & Checkbox) */}
              {(q.type === 'MULTIPLE_CHOICE' || q.type === 'CHECKBOX') && (
                <div className="space-y-2.5 pl-2 sm:pl-4 border-l-2 border-slate-100 mb-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                    <span>
                      Pilihan Jawaban (Klik bulatan / kotak untuk menandai{' '}
                      <strong className="text-emerald-700">Kunci Jawaban</strong>):
                    </span>
                    <span>{q.options.length} Opsi</span>
                  </div>

                  {q.options.map((option, optIdx) => {
                    const isCorrect =
                      q.type === 'MULTIPLE_CHOICE'
                        ? q.correctOptionIndices.includes(optIdx) || q.correctAnswer === option
                        : q.correctOptionIndices.includes(optIdx);

                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-2.5 p-2 rounded-xl transition border ${
                          isCorrect
                            ? 'bg-emerald-50/60 border-emerald-300'
                            : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Selector indicator */}
                        {q.type === 'MULTIPLE_CHOICE' ? (
                          <button
                            type="button"
                            onClick={() => handleSelectRadioCorrect(actualIndex, optIdx)}
                            title="Tandai sebagai Kunci Jawaban Benar"
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                                : 'bg-white border-2 border-slate-300 hover:border-emerald-500'
                            }`}
                          >
                            {isCorrect && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleCheckboxCorrect(actualIndex, optIdx)}
                            title="Tandai sebagai salah satu Kunci Jawaban Benar"
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                                : 'bg-white border-2 border-slate-300 hover:border-emerald-500'
                            }`}
                          >
                            {isCorrect && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                        )}

                        {/* Option prefix label (A, B, C, D) */}
                        <span className="text-xs font-bold text-slate-400 w-4">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>

                        {/* Option text input */}
                        <input
                          type="text"
                          value={option}
                          onChange={e => handleUpdateOption(actualIndex, optIdx, e.target.value)}
                          placeholder={`Teks pilihan ${String.fromCharCode(65 + optIdx)}`}
                          className={`flex-1 text-sm bg-transparent border-0 outline-hidden ${
                            isCorrect ? 'font-semibold text-emerald-900' : 'text-slate-800'
                          }`}
                        />

                        {isCorrect && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                            Kunci Jawaban
                          </span>
                        )}

                        <button
                          onClick={() => handleDeleteOption(actualIndex, optIdx)}
                          title="Hapus opsi ini"
                          className="p-1 text-slate-300 hover:text-red-500 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => handleAddOption(actualIndex)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 py-1.5 px-3 rounded-lg hover:bg-indigo-50 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Pilihan ({String.fromCharCode(65 + q.options.length)})</span>
                  </button>
                </div>
              )}

              {/* Short Answer & Paragraph Keys */}
              {q.type === 'SHORT_ANSWER' && (
                <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Kunci Jawaban Tepat (Isian Singkat)
                  </label>
                  <input
                    type="text"
                    value={q.correctAnswer}
                    onChange={e => handleUpdateQuestion(actualIndex, { correctAnswer: e.target.value })}
                    placeholder="Masukkan jawaban yang benar..."
                    className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              )}

              {q.type === 'PARAGRAPH' && (
                <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Pedoman Penilaian / Kunci Jawaban Esai
                  </label>
                  <textarea
                    rows={2}
                    value={q.correctAnswer}
                    onChange={e => handleUpdateQuestion(actualIndex, { correctAnswer: e.target.value })}
                    placeholder="Tuliskan pedoman penilaian atau rubrik jawaban..."
                    className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              )}

              {/* Explanation / Pembahasan */}
              <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/60">
                <label className="block text-xs font-semibold text-indigo-900 mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Pembahasan / Umpan Balik untuk Siswa</span>
                </label>
                <input
                  type="text"
                  value={q.explanation || ''}
                  onChange={e => handleUpdateQuestion(actualIndex, { explanation: e.target.value })}
                  placeholder="Tuliskan penjelasan kenapa jawaban tersebut tepat (opsional)..."
                  className="w-full text-xs text-slate-700 bg-white border border-indigo-200/80 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Question Button */}
      <div className="mt-6 text-center">
        <button
          onClick={handleAddNewQuestion}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/50 text-indigo-700 font-semibold text-sm transition w-full justify-center shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Butir Soal Baru</span>
        </button>
      </div>

      {/* Bulk Points Setter Modal */}
      {showBulkPointsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-2">Atur Bobot Poin Seragam</h3>
            <p className="text-xs text-slate-600 mb-4">
              Ubah bobot nilai semua {totalQuestions} butir soal menjadi angka yang sama:
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Poin per Soal
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={bulkPointsValue}
                onChange={e => setBulkPointsValue(Math.max(1, parseInt(e.target.value) || 10))}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-bold text-slate-900 outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Total kuis nanti: {totalQuestions * bulkPointsValue} Poin
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBulkPointsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleApplyBulkPoints}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Terapkan ke Semua Soal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
