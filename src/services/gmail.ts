import { getSafeGoogleFormResponderUri } from './googleForms';

export interface SendEmailParams {
  recipientEmail: string;
  formTitle: string;
  formUrl: string;
  editUrl: string;
  questionCount: number;
  totalPoints: number;
  accessToken: string;
}

export async function sendQuizReadyNotification({
  recipientEmail,
  formTitle,
  formUrl,
  editUrl,
  questionCount,
  totalPoints,
  accessToken
}: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const safeFormUrl = getSafeGoogleFormResponderUri(formUrl);
    const subject = `[Sukses] Soal Kuis Google Form Siap: ${formTitle}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #4338ca; padding: 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .header p { margin: 6px 0 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 24px; }
    .card { background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .stat-row { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding: 8px 0; font-size: 14px; }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { color: #64748b; }
    .stat-value { font-weight: 600; color: #0f172a; }
    .buttons { margin-top: 24px; text-align: center; }
    .btn { display: inline-block; padding: 12px 24px; margin: 6px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; }
    .btn-primary { background-color: #4338ca; color: #ffffff !important; }
    .btn-secondary { background-color: #f1f5f9; color: #1e293b !important; border: 1px solid #cbd5e1; }
    .footer { text-align: center; padding: 16px 24px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Konversi Soal Selesai</h1>
      <p>Kuis Anda telah berhasil dibuat di Google Forms</p>
    </div>
    <div class="content">
      <p>Halo Pengajar,</p>
      <p>Dokumen soal Anda telah berhasil diuraikan dan dipublikasikan menjadi formulir kuis di Google Forms dengan rincian berikut:</p>
      
      <div class="card">
        <div class="stat-row">
          <span class="stat-label">Judul Kuis:</span>
          <span class="stat-value">${formTitle}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Jumlah Soal:</span>
          <span class="stat-value">${questionCount} Soal</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Total Bobot Nilai:</span>
          <span class="stat-value">${totalPoints} Poin</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Waktu Pemrosesan:</span>
          <span class="stat-value">${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</span>
        </div>
      </div>

      <p style="margin-bottom: 8px;">Akses tautan formulir Anda:</p>
      <div class="buttons">
        <a href="${safeFormUrl}" class="btn btn-primary" target="_blank">Buka Tampilan Kuis (Siswa)</a>
        <a href="${editUrl}" class="btn btn-secondary" target="_blank">Buka Editor Google Forms</a>
      </div>
      
      <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
        Kuis ini sudah secara otomatis mengaktifkan mode <strong>Quiz Grading</strong> dengan kunci jawaban dan bobot nilai yang telah Anda tentukan.
      </p>
    </div>
    <div class="footer">
      Email otomatis dari Aplikasi Konverter Soal Word & PDF ke Google Forms.
    </div>
  </div>
</body>
</html>
`;

    // Helper to safely convert UTF-8 string to base64
    const utf8ToBase64 = (str: string): string => {
      const bytes = new TextEncoder().encode(str);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) {
        bin += String.fromCharCode(bytes[i]);
      }
      return btoa(bin);
    };

    // Encode subject with standard RFC 2047 UTF-8 base64
    const utf8Subject = `=?utf-8?B?${utf8ToBase64(subject)}?=`;

    const emailHeaders = [
      `To: ${recipientEmail}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlBody
    ];

    const rawEmail = emailHeaders.join('\r\n');
    const base64Safe = utf8ToBase64(rawEmail)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: base64Safe })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        error: err.error?.message || `HTTP ${res.status}: Gagal mengirim email`
      };
    }

    const data = await res.json();
    return { success: true, messageId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export interface CheatingEmailParams {
  recipientEmail: string;
  studentName: string;
  quizTitle: string;
  violationReason: string;
  questionNumber: number;
  timestamp: string;
  accessToken: string;
}

export async function sendCheatingViolationNotification({
  recipientEmail,
  studentName,
  quizTitle,
  violationReason,
  questionNumber,
  timestamp,
  accessToken
}: CheatingEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const subject = `[PERINGATAN KECURANGAN UJIAN] Anda telah melakukan kecurangan dalam hal menjawab soal: ${quizTitle}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #fef2f2; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 2px solid #ef4444; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(239,68,68,0.1); }
    .header { background: #dc2626; padding: 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0; opacity: 0.95; font-size: 14px; font-weight: 500; }
    .content { padding: 24px; }
    .alert-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 14px; border-radius: 6px; margin-bottom: 20px; color: #991b1b; font-size: 14px; font-weight: 600; }
    .card { background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
    .stat-row { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding: 9px 0; font-size: 14px; }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { color: #64748b; font-weight: 500; }
    .stat-value { font-weight: 700; color: #0f172a; }
    .consequence-box { background: #fff1f2; border: 1px dashed #f43f5e; padding: 14px; border-radius: 8px; margin-top: 18px; font-size: 13px; color: #881337; }
    .footer { text-align: center; padding: 16px 24px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #fafafa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Peringatan Resmi Pelanggaran Ujian</h1>
      <p>Sistem Pengawasan Integritas Ujian FormQuiz AI</p>
    </div>
    <div class="content">
      <div class="alert-box">
        ⚠️ <strong>Pemberitahuan Resmi:</strong> Anda telah melakukan kecurangan dalam hal menjawab soal. Formulir ujian telah ditutup secara otomatis.
      </div>

      <p>Yth. <strong>${studentName || 'Peserta Ujian'}</strong>,</p>
      <p>Sistem proctoring terotomatisasi mendeteksi adanya aktivitas yang melanggar integritas saat Anda sedang mengerjakan ujian online berikut:</p>
      
      <div class="card">
        <div class="stat-row">
          <span class="stat-label">Nama Ujian:</span>
          <span class="stat-value">${quizTitle}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Sedang Menjawab Soal:</span>
          <span class="stat-value">Nomor #${questionNumber}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Jenis Pelanggaran:</span>
          <span class="stat-value" style="color: #dc2626;">${violationReason}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Waktu Kejadian:</span>
          <span class="stat-value">${timestamp}</span>
        </div>
      </div>

      <div class="consequence-box">
        <strong>Tindakan yang telah diambil sistem:</strong>
        <ul style="margin: 6px 0 0; padding-left: 20px;">
          <li>Akses pengerjaan Google Form / kuis langsung <strong>ditutup dan dikunci</strong> secara otomatis.</li>
          <li>Data pelanggaran telah diteruskan kepada guru / pengawas ujian yang berwenang.</li>
          <li>Notifikasi telah dikirimkan ke Email dan WhatsApp terkait.</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      Email ini dihasilkan secara otomatis oleh FormQuiz AI Proctoring System. Harap hubungi pengawas ujian untuk informasi lebih lanjut.
    </div>
  </div>
</body>
</html>
`;

    const utf8ToBase64 = (str: string): string => {
      const bytes = new TextEncoder().encode(str);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) {
        bin += String.fromCharCode(bytes[i]);
      }
      return btoa(bin);
    };

    const utf8Subject = `=?utf-8?B?${utf8ToBase64(subject)}?=`;

    const emailHeaders = [
      `To: ${recipientEmail}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlBody
    ];

    const rawEmail = emailHeaders.join('\r\n');
    const base64Safe = utf8ToBase64(rawEmail)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: base64Safe })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        error: err.error?.message || `HTTP ${res.status}: Gagal mengirim email pelanggaran`
      };
    }

    const data = await res.json();
    return { success: true, messageId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
