import { ExamSecuritySettings, CheatingIncident } from '../types';

export const DEFAULT_EXAM_SECURITY_SETTINGS: ExamSecuritySettings = {
  timePerQuestionMinutes: 1, // 1 menit hitung mundur per nomor
  timePerQuestionSeconds: 60, // 60 detik hitung mundur per nomor (00:01:00 jam:menit:detik)
  maxAttempts: 2, // maksimal 2 kali respon
  enableAntiCheat: true,
  blockTabSwitch: true,
  blockBrowserSwitch: true,
  blockNewTabKeys: true,
  fullScreenEnforced: true,
  autoCloseOnViolation: true,
  sendEmailNotification: true,
  sendWhatsAppNotification: true,
  studentName: '',
  studentEmail: '',
  studentWhatsApp: '',
  supervisorEmail: '',
  supervisorWhatsApp: ''
};

export function cleanIndonesianPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function formatWhatsAppViolationMessage({
  studentName,
  studentNim,
  quizTitle,
  questionNumber,
  violationReason,
  timestamp
}: {
  studentName: string;
  studentNim?: string;
  quizTitle: string;
  questionNumber: number;
  violationReason: string;
  timestamp: string;
}): string {
  return `⚠️ *PERINGATAN RESMI: ANDA TELAH MELAKUKAN KECURANGAN DALAM HAL MENJAWAB SOAL*\n\n` +
    `👤 *Nama Mahasiswa:* ${studentName || 'Peserta Ujian'}${studentNim ? ` (NIM: ${studentNim})` : ''}\n` +
    `📝 *Ujian / Mata Kuliah:* ${quizTitle}\n` +
    `🔢 *Soal Nomor:* #${questionNumber}\n` +
    `⏰ *Waktu:* ${timestamp}\n\n` +
    `⛔ *Pelanggaran:* ${violationReason}\n\n` +
    `🚨 *TINDAKAN DISIPLIN:* Sesuai ketentuan ketat integritas ujian, formulir ujian telah *DITUTUP SECARA OTOMATIS* dan akses Anda dibatalkan.\n\n` +
    `_Pesan otomatis Sistem Integritas FormQuiz AI_`;
}

export function createWhatsAppDirectUrl(phoneNumber: string, messageText: string): string {
  const cleanPhone = cleanIndonesianPhoneNumber(phoneNumber);
  if (!cleanPhone) return '';
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
}

export async function reportCheatingIncident(incident: {
  studentName: string;
  studentNim?: string;
  studentEmail?: string;
  studentWhatsApp?: string;
  quizTitle: string;
  questionNumber: number;
  violationReason: string;
  timestamp: string;
}): Promise<{ success: boolean; whatsappUrl?: string; message?: string }> {
  try {
    const res = await fetch('/api/notify-cheating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incident)
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.warn('Fallback generating local WhatsApp URL:', err);
    const msg = formatWhatsAppViolationMessage({
      studentName: incident.studentName,
      studentNim: incident.studentNim,
      quizTitle: incident.quizTitle,
      questionNumber: incident.questionNumber,
      violationReason: incident.violationReason,
      timestamp: incident.timestamp
    });
    const waUrl = incident.studentWhatsApp
      ? createWhatsAppDirectUrl(incident.studentWhatsApp, msg)
      : undefined;
    return {
      success: true,
      whatsappUrl: waUrl,
      message: 'Notifikasi lokal disiapkan.'
    };
  }
}

export function getExamAttempts(quizTitle: string): number {
  try {
    const key = `cbt_exam_attempts_${encodeURIComponent(quizTitle || 'quiz')}`;
    const val = localStorage.getItem(key);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export function incrementExamAttempt(quizTitle: string): number {
  try {
    const key = `cbt_exam_attempts_${encodeURIComponent(quizTitle || 'quiz')}`;
    const count = getExamAttempts(quizTitle) + 1;
    localStorage.setItem(key, count.toString());
    return count;
  } catch {
    return 1;
  }
}

export function resetExamAttempts(quizTitle: string): void {
  try {
    const key = `cbt_exam_attempts_${encodeURIComponent(quizTitle || 'quiz')}`;
    localStorage.removeItem(key);
  } catch {}
}

