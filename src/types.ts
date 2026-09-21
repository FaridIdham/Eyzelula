export type QuestionType = 'MULTIPLE_CHOICE' | 'CHECKBOX' | 'SHORT_ANSWER' | 'PARAGRAPH';

export interface Question {
  id: string;
  number: number;
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string;
  correctOptionIndices: number[];
  points: number;
  timeLimitMinutes?: number; // Alokasi waktu pengerjaan per butir soal dalam menit (default: 1 menit)
  timeLimitSeconds?: number; // Alokasi waktu pengerjaan per butir soal dalam detik (jam:menit:detik)
  explanation?: string;
}

export interface ExamSecuritySettings {
  timePerQuestionMinutes: number; // default: 1 (1 minute per question)
  timePerQuestionSeconds?: number; // default: 60 (alokasi hitung mundur per nomor dalam detik berdasarkan jam:menit:detik)
  maxAttempts?: number; // default: 2 (maksimal 2 kali respon pengerjaan)
  enableAntiCheat: boolean; // default: true
  blockTabSwitch: boolean; // default: true (detect switching tabs)
  blockBrowserSwitch: boolean; // default: true (detect switching to Chrome/Firefox/Edge/etc)
  blockNewTabKeys: boolean; // default: true (block Ctrl+T, Ctrl+N, etc)
  fullScreenEnforced: boolean; // default: true
  autoCloseOnViolation: boolean; // default: true (automatically close form on cheating)
  sendEmailNotification: boolean; // default: true
  sendWhatsAppNotification: boolean; // default: true
  studentName?: string;
  studentNim?: string;
  studentClass?: string;
  studentSemester?: string;
  studentEmail?: string;
  studentWhatsApp?: string; // Phone number e.g. 08123456789 or 628123456789
  supervisorEmail?: string;
  supervisorWhatsApp?: string;
}

export interface CheatingIncident {
  id: string;
  timestamp: string;
  studentName: string;
  studentNim?: string;
  studentEmail?: string;
  studentWhatsApp?: string;
  quizTitle: string;
  questionNumber: number;
  reason: string;
  emailNotified: boolean;
  whatsappNotified: boolean;
  whatsappUrl?: string;
}

export interface QuizData {
  title: string;
  description: string;
  defaultPointsPerQuestion: number;
  questions: Question[];
  securitySettings?: ExamSecuritySettings;
  mataKuliah?: string;
  kelas?: string;
  semester?: string;
}

export interface ConversionHistoryItem {
  id: string;
  fileName: string;
  fileType: 'docx' | 'pdf' | 'text';
  title: string;
  questionCount: number;
  totalPoints: number;
  createdAt: string;
  status: 'reviewing' | 'uploaded_form' | 'exported_csv' | 'failed';
  formId?: string;
  responderUri?: string;
  editUri?: string;
  emailSentTo?: string;
  emailStatus?: 'sent' | 'skipped' | 'failed';
  quizData: QuizData;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
