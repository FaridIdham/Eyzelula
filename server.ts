import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { handleExtractQuestions } from './server/extractor';

dotenv.config();

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint to record cheating violation and generate official WhatsApp & Email dispatch data
app.post('/api/notify-cheating', (req, res) => {
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

  console.warn(`[ANTI-CHEAT ALERT] Cheating detected for ${studentName} on Quiz "${quizTitle}" Q#${questionNumber}: ${violationReason}`);

  res.json({
    success: true,
    whatsappUrl,
    whatsappMessage,
    loggedAt: new Date().toISOString(),
    message: 'Pelanggaran kecurangan berhasil dicatat dan notifikasi siap dikirimkan.'
  });
});

// Extract questions endpoint
app.post('/api/extract-questions', async (req, res) => {
  try {
    await handleExtractQuestions(req.body, res);
  } catch (error: any) {
    console.error('Extraction error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Terjadi kendala saat memproses dokumen.',
        details: error.message || 'Kesalahan pada server'
      });
    }
  }
});

async function startServer() {
  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
