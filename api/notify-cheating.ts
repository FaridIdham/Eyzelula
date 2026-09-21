export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const {
    studentName,
    studentWhatsApp,
    quizTitle,
    violationReason,
    questionNumber,
    timestamp
  } = req.body || {};

  const eventTime = timestamp || new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  const whatsappMessage =
    `⚠️ *PERINGATAN RESMI: ANDA TELAH MELAKUKAN KECURANGAN DALAM HAL MENJAWAB SOAL*\n\n` +
    `👤 *Nama Peserta:* ${studentName || 'Peserta Ujian'}\n` +
    `📝 *Ujian:* ${quizTitle || 'Ujian Online'}\n` +
    `🔢 *Sedang Menjawab Soal:* #${questionNumber || 1}\n` +
    `⏰ *Waktu Terdeteksi:* ${eventTime}\n\n` +
    `⛔ *Pelanggaran:* ${violationReason || 'Membuka tab baru / mengakses browser atau aplikasi lain'}\n\n` +
    `🚨 *TINDAKAN DISIPLIN:* Sesuai instruksi ujian, formulir ujian telah *OTOMATIS DITUTUP SENDIRI* dan pengerjaan Anda dibatalkan.\n\n` +
    `_Pemberitahuan otomatis Sistem Pengawas FormQuiz AI_`;

  let cleanPhone = (studentWhatsApp || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('08')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  } else if (cleanPhone.startsWith('8')) {
    cleanPhone = '62' + cleanPhone;
  }

  const whatsappUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsappMessage)}`
    : null;

  res.json({
    success: true,
    whatsappUrl,
    whatsappMessage,
    loggedAt: new Date().toISOString(),
    message: 'Pelanggaran kecurangan berhasil dicatat dan notifikasi siap dikirimkan.'
  });
}
