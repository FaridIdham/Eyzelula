import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

dotenv.config();

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Lazy initialize Gemini AI client with required User-Agent
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Resilient JSON parser that handles code blocks or whitespace
function parseGeminiJson(raw: string): any {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

function extractRawStringsFromPdf(buffer: Buffer): string {
  try {
    const raw = buffer.toString('latin1');
    const matches = raw.match(/\(([^()]{2,})\)/g);
    if (matches && matches.length > 5) {
      return matches.map(m => m.slice(1, -1)).join(' ');
    }
  } catch (e) {
    // ignore
  }
  return '';
}

// Fallback helper to extract plain text from legacy Word 97-2003 (.doc) binary buffers
function extractTextFromBinaryDoc(buffer: Buffer): string {
  try {
    const str16 = buffer.toString('utf16le');
    const chunks16 = str16.match(/[\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF\r\n\t]{4,}/g);
    if (chunks16 && chunks16.length > 0) {
      const candidate = chunks16.join('\n').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
      if (candidate.length > 50) return candidate;
    }
    const str8 = buffer.toString('utf8');
    const chunks8 = str8.match(/[a-zA-Z0-9\.,\?!:;\-\(\)\[\]\/\n\r\t ]{4,}/g);
    if (chunks8 && chunks8.length > 0) {
      return chunks8.join('\n');
    }
  } catch (e) {
    // ignore
  }
  return '';
}

// Count detected question numbers in raw text or markdown to guide AI and ensure 100% extraction completeness
function countQuestionsInDocument(text: string): { totalDetected: number; detectedNumbers: number[] } {
  const lines = text.split(/\r?\n/);
  const detected = new Set<number>();
  const qRegex = /^(?:[\*\_#\s]*)?(?:(?:soal|no\.?|nomor|pertanyaan|q)\s*)?(?:(\d+)[\.\:\)]|\((\d+)\)|\[(\d+)\])\s+/im;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip Markdown table divider rows
    if (trimmed.startsWith('|') && trimmed.includes('---')) continue;

    const m = trimmed.match(qRegex);
    if (m) {
      const num = parseInt(m[1] || m[2] || m[3], 10);
      if (num >= 1 && num <= 500) {
        detected.add(num);
      }
    }
  }
  const detectedNumbers = Array.from(detected).sort((a, b) => a - b);
  return {
    totalDetected: detectedNumbers.length,
    detectedNumbers
  };
}

// Local intelligent regex parser as an instant zero-downtime fallback & gap reconciler
function parseQuestionsLocally(rawText: string, defaultPoints: number = 10): any[] {
  const lines = rawText.split(/\r?\n/);
  const questions: any[] = [];
  let currentQ: any = null;

  // Global key map: questionNumber -> answer letter (e.g. KUNCI JAWABAN: 1. A, 2. B, 3. C)
  const globalKeyMap = new Map<number, string>();
  const globalKeyRegex = /(?:^|\s)(?:no\.?\s*)?(\d+)[\.\:\-\)]\s*([A-Ea-e])\b/g;
  let inDedicatedKeySection = false;

  for (const line of lines) {
    // Only flag dedicated section if line is a header like "### KUNCI JAWABAN" without an option body
    if (/^(?:[\*\_#\s]*)(?:kunci\s*(?:jawaban)?|answer\s*key)(?:[\*\_#\s]*)$/i.test(line.trim())) {
      inDedicatedKeySection = true;
    }
    if (inDedicatedKeySection) {
      let m: RegExpExecArray | null;
      while ((m = globalKeyRegex.exec(line)) !== null) {
        globalKeyMap.set(parseInt(m[1], 10), m[2].toUpperCase());
      }
    }
  }

  // Regex patterns supporting various numbering formats
  const qRegex = /^(?:[\*\_#\s]*)?(?:(?:soal|no\.?|nomor|pertanyaan|q)\s*)?(?:(\d+)[\.\:\)]|\((\d+)\)|\[(\d+)\])\s*(.*)/i;
  const inlineOptRegex = /(?:^|\s+|\t|\|)([A-Ea-e])[\.\)]\s+([^\n\r\|]+?)(?=(?:\s+[A-Ea-e][\.\)]\s+)|(?:\t[A-Ea-e][\.\)]\s+)|(?:\|[A-Ea-e][\.\)]\s+)|$)/g;
  const singleOptRegex = /^(?:[\*\_#\s]*)(?:\(([A-Ea-e])\)|\[([A-Ea-e])\]|([A-Ea-e])[\.\)\:\-])\s*(.*)/;
  const localKeyRegex = /^(?:[\*\_#\s]*)(?:kunci\s*(?:jawaban)?|jawaban\s*(?:benar)?|ans(?:wer)?)\s*[:=\-]?\s*([A-Ea-e])/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if line is a Markdown table row representing a question: | No | Pertanyaan | Opsi A | Opsi B | Opsi C | Opsi D | Kunci |
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (cells.length >= 3 && !cells[0].includes('---')) {
        const firstNumMatch = cells[0].match(/^(?:no\.?\s*)?(\d+)$/i);
        if (firstNumMatch) {
          const qNum = parseInt(firstNumMatch[1], 10);
          if (currentQ && currentQ.text) {
            questions.push(currentQ);
            currentQ = null;
          }
          const qText = cells[1];
          const rawOptions = cells.slice(2);
          const parsedOptions: string[] = [];
          let keyAnswer = '';
          let keyIdx = 0;

          // Check if last cell is an answer key letter (A-E)
          const lastCell = rawOptions[rawOptions.length - 1];
          if (lastCell && /^[A-Ea-e]$/.test(lastCell)) {
            const letter = lastCell.toUpperCase();
            const actualOptions = rawOptions.slice(0, -1);
            const targetIdx = letter.charCodeAt(0) - 65;
            for (let oi = 0; oi < actualOptions.length; oi++) {
              parsedOptions.push(actualOptions[oi]);
            }
            if (targetIdx >= 0 && targetIdx < parsedOptions.length) {
              keyAnswer = parsedOptions[targetIdx];
              keyIdx = targetIdx;
            }
          } else {
            for (let oi = 0; oi < rawOptions.length; oi++) {
              const opt = rawOptions[oi];
              const isCorrect = opt.includes('*') || /\b(?:kunci|benar)\b/i.test(opt);
              const clean = opt.replace(/\*+/g, '').replace(/[\(]\s*(?:kunci|benar)\s*[\)]/i, '').trim();
              parsedOptions.push(clean);
              if (isCorrect) {
                keyAnswer = clean;
                keyIdx = oi;
              }
            }
          }

          questions.push({
            number: qNum,
            text: qText,
            type: parsedOptions.length > 0 ? 'MULTIPLE_CHOICE' : 'SHORT_ANSWER',
            options: parsedOptions,
            correctAnswer: keyAnswer || (parsedOptions[0] || ''),
            correctOptionIndices: parsedOptions.length > 0 ? [keyIdx] : [],
            points: defaultPoints,
            explanation: 'Diekstrak dari tabel Word.'
          });
          continue;
        }
      }
    }

    // Check if line is an inline answer key for the current question (e.g. "Kunci Jawaban: B" or "Kunci: A")
    const keyMatch = line.match(localKeyRegex);
    if (keyMatch && currentQ) {
      const letter = keyMatch[1].toUpperCase();
      const idx = letter.charCodeAt(0) - 65;
      if (idx >= 0 && idx < currentQ.options.length) {
        currentQ.correctAnswer = currentQ.options[idx];
        currentQ.correctOptionIndices = [idx];
      }
      // Continue parsing! Never stop or break the loop!
      continue;
    }

    // Only break if we hit a pure standalone answer key header at the end of the document
    if (/^(?:[\*\_#\s]*)(?:kunci\s*jawaban|answer\s*key)\s*(?:ujian|soal)?\s*[:=]?$/i.test(line) && globalKeyMap.size > 0) {
      break;
    }

    const qMatch = line.match(qRegex);
    const isOptionLine = singleOptRegex.test(line);

    // If it's a question number header
    if (qMatch && !isOptionLine && !localKeyRegex.test(line)) {
      const qNum = parseInt(qMatch[1] || qMatch[2] || qMatch[3], 10);
      if (currentQ && currentQ.text) {
        questions.push(currentQ);
      }
      currentQ = {
        number: qNum || (questions.length + 1),
        text: (qMatch[4] || '').replace(/^[\*\_#\s]+|[\*\_#\s]+$/g, '').trim(),
        type: 'MULTIPLE_CHOICE',
        options: [] as string[],
        correctAnswer: '',
        correctOptionIndices: [0],
        points: defaultPoints,
        explanation: 'Diekstrak lengkap dari dokumen Word.'
      };
      continue;
    }

    if (currentQ) {
      // Check for horizontal inline options like: A. Apel  B. Mangga  C. Jeruk  D. Pisang
      const inlineMatches: { letter: string; text: string }[] = [];
      let im: RegExpExecArray | null;
      inlineOptRegex.lastIndex = 0;
      while ((im = inlineOptRegex.exec(line)) !== null) {
        inlineMatches.push({ letter: im[1].toUpperCase(), text: im[2].trim() });
      }

      if (inlineMatches.length >= 2) {
        for (const opt of inlineMatches) {
          const isCorrect = opt.text.includes('*') || /\b(?:kunci|benar)\b/i.test(opt.text);
          const cleanOptText = opt.text.replace(/\*+/g, '').replace(/[\(]\s*(?:kunci|benar)\s*[\)]/i, '').trim();
          currentQ.options.push(cleanOptText);
          if (isCorrect) {
            currentQ.correctAnswer = cleanOptText;
            currentQ.correctOptionIndices = [currentQ.options.length - 1];
          }
        }
        continue;
      }

      // Check for standard single option line: A. Opsi
      const optMatch = line.match(singleOptRegex);
      if (optMatch) {
        let optText = (optMatch[4] || '').trim();
        const isCorrect = optText.includes('*') || /\b(?:kunci|benar)\b/i.test(optText);
        optText = optText.replace(/\*+/g, '').replace(/[\(]\s*(?:kunci|benar)\s*[\)]/i, '').trim();
        currentQ.options.push(optText);
        if (isCorrect) {
          currentQ.correctAnswer = optText;
          currentQ.correctOptionIndices = [currentQ.options.length - 1];
        }
        continue;
      }

      // Question body text continuation
      if (currentQ.options.length === 0) {
        currentQ.text += (currentQ.text ? ' ' : '') + line;
      }
    }
  }

  if (currentQ && currentQ.text) {
    questions.push(currentQ);
  }

  // If standard numbering failed, fallback to paragraph-based parsing
  if (questions.length === 0) {
    const blocks = rawText.split(/\n\s*\n+/);
    for (const block of blocks) {
      const bLines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (bLines.length === 0) continue;

      let qText = '';
      const options: string[] = [];
      let correctAnswer = '';
      let correctOptionIndices = [0];

      for (const bLine of bLines) {
        const optMatch = bLine.match(singleOptRegex);
        if (optMatch) {
          let optText = (optMatch[4] || '').trim();
          const isCorrect = optText.includes('*') || /\b(?:kunci|benar)\b/i.test(optText);
          optText = optText.replace(/\*+/g, '').replace(/[\(]\s*(?:kunci|benar)\s*[\)]/i, '').trim();
          options.push(optText);
          if (isCorrect) {
            correctAnswer = optText;
            correctOptionIndices = [options.length - 1];
          }
        } else if (options.length === 0) {
          qText += (qText ? ' ' : '') + bLine;
        }
      }

      if (qText) {
        questions.push({
          number: questions.length + 1,
          text: qText,
          type: options.length > 0 ? 'MULTIPLE_CHOICE' : 'SHORT_ANSWER',
          options,
          correctAnswer: correctAnswer || (options[0] || ''),
          correctOptionIndices: options.length > 0 ? correctOptionIndices : [],
          points: defaultPoints,
          explanation: 'Diekstrak dari dokumen Word.'
        });
      }
    }
  }

  // Apply global key map & ensure valid fallbacks
  for (const q of questions) {
    if (globalKeyMap.has(q.number)) {
      const letter = globalKeyMap.get(q.number)!;
      const idx = letter.charCodeAt(0) - 65;
      if (idx >= 0 && idx < q.options.length) {
        q.correctAnswer = q.options[idx];
        q.correctOptionIndices = [idx];
      }
    }
    if (q.options.length === 0) {
      q.type = 'SHORT_ANSWER';
      q.correctOptionIndices = [];
    } else if (!q.correctAnswer && q.options.length > 0) {
      q.correctAnswer = q.options[0];
      q.correctOptionIndices = [0];
    }
  }

  return questions;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint to record cheating violation and generate official WhatsApp & Email dispatch data
app.post('/api/notify-cheating', (req, res) => {
  const {
    studentName,
    studentEmail,
    studentWhatsApp,
    quizTitle,
    violationReason,
    questionNumber,
    timestamp
  } = req.body;

  const eventTime = timestamp || new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  // Format the official Indonesian WhatsApp alert
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
    const { fileBase64, mimeType, fileName, userPrompt } = req.body;
    const rawText = req.body.rawText || req.body.text || '';

    let extractedText = '';
    let isPdf = false;
    let cleanBase64 = '';
    const defaultPoints = 10;

    if (fileBase64) {
      // Remove data URL prefix if present
      cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
    }

    if (rawText && typeof rawText === 'string' && rawText.trim().length > 0) {
      extractedText = rawText.trim();
    } else if (cleanBase64 && (mimeType === 'application/pdf' || (fileName && fileName.toLowerCase().endsWith('.pdf')))) {
      isPdf = true;
      try {
        const buffer = Buffer.from(cleanBase64, 'base64');
        const parser: any = new PDFParse({ data: buffer });
        const parsedResult: any = await parser.getText();
        const textValue = typeof parsedResult === 'string' ? parsedResult : (parsedResult?.text || '');
        if (typeof textValue === 'string' && textValue.trim().length > 0) {
          extractedText = textValue.trim();
        }
      } catch (pdfErr) {
        console.warn('PDF text extraction notice:', pdfErr);
      }

      // If parser yielded empty text, try raw string extraction from PDF buffer
      if (!extractedText || extractedText.trim().length === 0) {
        try {
          const buffer = Buffer.from(cleanBase64, 'base64');
          const fallbackText = extractRawStringsFromPdf(buffer);
          if (fallbackText && fallbackText.trim().length > 0) {
            extractedText = fallbackText.trim();
          }
        } catch (e) {
          // ignore
        }
      }
    } else if (
      cleanBase64 && (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword' ||
        (fileName && (fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc')))
      )
    ) {
      // Process Word document with rich Markdown conversion and multiple fallbacks
      try {
        const buffer = Buffer.from(cleanBase64, 'base64');
        let mdText = '';
        let rawDocText = '';

        // 1. Convert to Markdown with mammoth: preserves auto-numbering, tables, bullet lists, and bold text (keys)
        try {
          const mdResult = await (mammoth as any).convertToMarkdown({ buffer });
          mdText = mdResult.value || '';
        } catch (mdErr: any) {
          console.warn('Mammoth markdown conversion notice:', mdErr?.message || mdErr);
        }

        // 2. Extract raw text with mammoth
        try {
          const rawResult = await mammoth.extractRawText({ buffer });
          rawDocText = rawResult.value || '';
        } catch (rawErr: any) {
          console.warn('Mammoth raw text extraction notice:', rawErr?.message || rawErr);
        }

        // 3. Fallback for legacy binary Word 97-2003 (.doc) or corrupted docx
        if (!mdText && !rawDocText) {
          const binaryText = extractTextFromBinaryDoc(buffer);
          if (binaryText && binaryText.length > 50) {
            rawDocText = binaryText;
          }
        }

        // Prefer Markdown as it retains numbering, bullet lists, markdown tables, and bold answer keys
        if (mdText && mdText.trim().length > 0) {
          extractedText = mdText.trim();
        } else if (rawDocText && rawDocText.trim().length > 0) {
          extractedText = rawDocText.trim();
        } else {
          throw new Error('Dokumen Word kosong atau tidak dapat diekstrak teksnya.');
        }
      } catch (err: any) {
        console.error('Mammoth extraction failed:', err);
        return res.status(400).json({
          error: 'Gagal mengekstrak teks dari file Word. Pastikan format file .docx tidak rusak atau coba salin teks langsung ke tab input teks.',
          details: err.message
        });
      }
    } else if (rawText && typeof rawText === 'string') {
      extractedText = rawText;
    } else if (cleanBase64) {
      // Treat as plain text decoded
      try {
        extractedText = Buffer.from(cleanBase64, 'base64').toString('utf-8');
      } catch (e) {
        extractedText = '';
      }
    }

    let ai: GoogleGenAI | null = null;
    try {
      ai = getGeminiClient();
    } catch (keyErr: any) {
      console.warn('Gemini client initialization notice:', keyErr?.message || keyErr);
    }

    const detectedInfo = countQuestionsInDocument(extractedText);
    const questionCountHint = detectedInfo.totalDetected > 0
      ? `DOKUMEN INI TERDETEKSI MEMILIKI SEKITAR ${detectedInfo.totalDetected} BUTIR SOAL (Nomor terdeteksi: ${detectedInfo.detectedNumbers.slice(0, 20).join(', ')}${detectedInfo.detectedNumbers.length > 20 ? '...' : ''}). ANDA WAJIB MENGEKSTRAK LENGKAP SEMUA BUTIR SOAL TERSEBUT TANPA ADA YANG TERLEWAT!`
      : 'EKSTRAK SELURUH BUTIR SOAL YANG ADA PADA DOKUMEN DARI AWAL HINGGA NOMOR TERAKHIR!';

    const systemPrompt = `Anda adalah asisten AI spesialis ekstraksi soal ujian dan kuis untuk guru dan tenaga pengajar Indonesia.
Tugas utama Anda adalah membaca materi dokumen soal ujian (Word DOCX / PDF / Teks) dan menguraikannya menjadi kumpulan soal terstruktur dalam format JSON dengan KELENGKAPAN 100% TANPA ADA SATUPUN SOAL YANG TERLEWAT.

${questionCountHint}

ATURAN MUTLAK KELENGKAPAN JUMLAH SOAL (SANGAT KRUSIAL):
1. JUMLAH SOAL WAJIB 100% LENGKAP SESUAI DOKUMEN:
   - Periksa dokumen dari baris pertama hingga baris paling akhir.
   - Jika dokumen memiliki 10, 20, 25, 30, 40, 50, atau 100 butir soal, maka array "questions" pada JSON HARUS berisi tepat seluruh butir soal tersebut!
   - DILARANG KERAS meringkas, memotong, berhenti di tengah jalan, atau hanya mengambil sebagian sampel.
   - Nomor urut (properti "number") WAJIB sesuai urutan nomor soal asli pada dokumen (1, 2, 3, 4, dst.).

2. EKSTRAKSI TEKS SOAL (text):
   - Bersihkan prefix nomor di depan teks soal sehingga properti 'text' langsung berisi kalimat pertanyaan.
   - Jika ada tabel, wacana, teks bacaan, narasi, studi kasus, atau konteks acuan untuk beberapa nomor soal (misal: "Perhatikan teks berikut untuk menjawab soal nomor 5-7: ..."), sertakan konteks wacana tersebut pada properti 'text' di setiap nomor soal terkait agar butir soal dapat dipahami dan dijawab secara mandiri.

3. OPSI JAWABAN (options):
   - Ekstrak seluruh pilihan jawaban (A, B, C, D, atau E) ke dalam array "options".
   - Bersihkan prefix huruf ("A. ", "B. ", "a) ", "1. ") sehingga array hanya berisi teks opsi jawaban yang bersih.
   - Jika soal berbentuk tabel, ambil opsi dari setiap kolom pilihan.

4. KUNCI JAWABAN (correctAnswer & correctOptionIndices):
   - Deteksi kunci jawaban dari: tanda bintang (*), teks cetak tebal (**opsi**), warna, digarisbawahi, label "Kunci: X" / "Kunci Jawaban: X", atau lembar 'Kunci Jawaban' pada akhir dokumen.
   - Properti "correctAnswer" diisi nilai teks opsi yang benar.
   - Properti "correctOptionIndices" diisi indeks array 0-based opsi yang benar (misal: [1] untuk opsi B).
   - Jika dokumen tidak menyertakan kunci jawaban untuk soal tersebut, gunakan keahlian akademik Anda untuk menentukan jawaban yang paling tepat.

5. PENJELASAN RINGKAS & EFISIENSI TOKEN:
   - Tuliskan "explanation" secara SINGKAT dan PADAT (1 kalimat saja) agar kuota token tidak habis dan seluruh soal (hingga puluhan nomor) dapat di-generate sampai tuntas tanpa terpotong!
   - Bobot poin standar: ${defaultPoints} poin per nomor.
   ${userPrompt ? `Instruksi tambahan pengguna: ${userPrompt}` : ''}
`;

    let contents: any[] = [];

    if (isPdf && cleanBase64 && (!extractedText || extractedText.length < 50)) {
      contents = [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: cleanBase64
              }
            },
            {
              text: 'Silakan analisis dokumen PDF ujian di atas dan kembalikan seluruh soal yang ditemukan dalam format JSON sesuai skema yang ditentukan tanpa ada soal yang terlewat.'
            }
          ]
        }
      ];
    } else {
      const sourceText = extractedText.trim();
      if (sourceText) {
        contents = [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              {
                text: `Berikut adalah teks materi ujian yang perlu diekstrak secara lengkap (seluruh nomor soal):\n\n${sourceText.slice(0, 500000)}`
              }
            ]
          }
        ];
      }
    }

    const quizSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Judul kuis atau nama ujian' },
        description: { type: Type.STRING, description: 'Petunjuk pengerjaan atau deskripsi formulir' },
        defaultPointsPerQuestion: { type: Type.NUMBER, description: 'Poin standar per soal (misal 10)' },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.NUMBER, description: 'Nomor urut soal' },
              text: { type: Type.STRING, description: 'Pertanyaan atau teks soal' },
              type: {
                type: Type.STRING,
                enum: ['MULTIPLE_CHOICE', 'CHECKBOX', 'SHORT_ANSWER', 'PARAGRAPH'],
                description: 'Tipe pertanyaan'
              },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Daftar pilihan jawaban tanpa prefix A/B/C/D'
              },
              correctAnswer: {
                type: Type.STRING,
                description: 'Nilai teks jawaban yang benar'
              },
              correctOptionIndices: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER },
                description: 'Indeks (0-based) opsi yang benar'
              },
              points: { type: Type.NUMBER, description: 'Bobot nilai/poin soal' },
              explanation: { type: Type.STRING, description: 'Penjelasan atau pembahasan singkat 1 kalimat' }
            },
            required: ['number', 'text', 'type', 'options', 'correctAnswer', 'points']
          }
        }
      },
      required: ['title', 'description', 'questions']
    };

    // Current active models prioritized per Google GenAI SDK standards
    const CANDIDATE_MODELS = [
      'gemini-3.8-flash',       // Primary recommended model for general text tasks
      'gemini-3.1-flash-lite',  // Fast, separate pool, high availability
      'gemini-flash-latest'     // Stable alias
    ];

    let response: any = null;
    let lastError: any = null;

    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    if (ai && contents.length > 0) {
      modelLoop: for (const modelName of CANDIDATE_MODELS) {
        // Try up to 2 attempts per model with backoff on 503 / 429
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                responseMimeType: 'application/json',
                responseSchema: attempt === 1 ? quizSchema : undefined,
                maxOutputTokens: 65536,
                temperature: 0.1
              }
            });
            if (response && response.text) {
              console.log(`[AI EXTRACTION] Succeeded using model ${modelName} (attempt ${attempt})`);
              break modelLoop;
            }
          } catch (err: any) {
            lastError = err;
            const errMsg = err?.message || String(err);
            const isHighDemandOr503 =
              errMsg.includes('503') ||
              errMsg.includes('high demand') ||
              errMsg.includes('UNAVAILABLE');

            const isRateLimit =
              errMsg.includes('429') ||
              errMsg.includes('RESOURCE_EXHAUSTED');

            console.log(`[AI Model Notice] ${modelName} (percobaan ${attempt}): ${isHighDemandOr503 ? 'Server sedang sibuk, segera beralih ke model cadangan...' : errMsg}`);

            if (isHighDemandOr503) {
              // High demand on a model pool usually persists for seconds; immediately switch to next candidate model pool
              break;
            } else if (isRateLimit && attempt < 2) {
              // Wait briefly for rate limit bucket refresh
              await sleep(600 * attempt);
            } else {
              break; // Proceed to next candidate model
            }
          }
        }
      }
    }

    // If Gemini succeeded, parse structured JSON and reconcile with local parser
    if (response && response.text) {
      try {
        const rawResponseText = response.text || '{}';
        const parsedData = parseGeminiJson(rawResponseText);

        let formattedQuestions = (parsedData.questions || []).map((q: any, idx: number) => {
          const questionId = `q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
          return {
            id: questionId,
            number: q.number || idx + 1,
            text: q.text || '',
            type: q.type || 'MULTIPLE_CHOICE',
            options: Array.isArray(q.options) ? q.options : [],
            correctAnswer: q.correctAnswer || (q.options && q.options[0]) || '',
            correctOptionIndices: Array.isArray(q.correctOptionIndices)
              ? q.correctOptionIndices
              : (q.options && q.correctAnswer ? [q.options.indexOf(q.correctAnswer)].filter((i: number) => i >= 0) : [0]),
            points: typeof q.points === 'number' ? q.points : defaultPoints,
            timeLimitMinutes: 1,
            explanation: q.explanation || ''
          };
        });

        // Reconcile with local parser to ensure 100% question count completeness
        if (extractedText && extractedText.trim().length > 0) {
          const localQuestions = parseQuestionsLocally(extractedText, defaultPoints);
          const aiNumbers = new Set(formattedQuestions.map((q: any) => q.number));

          const missingQuestions = localQuestions.filter(lq => !aiNumbers.has(lq.number));
          if (missingQuestions.length > 0) {
            console.log(`[EXTRACTION RECONCILIATION] Reconciling ${missingQuestions.length} missing question(s) from document!`);
            for (const mq of missingQuestions) {
              formattedQuestions.push({
                id: `q_rec_${Date.now()}_${mq.number}_${Math.random().toString(36).substring(2, 7)}`,
                number: mq.number,
                text: mq.text,
                type: mq.type,
                options: mq.options,
                correctAnswer: mq.correctAnswer,
                correctOptionIndices: mq.correctOptionIndices,
                points: mq.points || defaultPoints,
                timeLimitMinutes: 1,
                explanation: mq.explanation || 'Diekstrak lengkap dari dokumen Word.'
              });
            }
            // Sort by question number in ascending order
            formattedQuestions.sort((a: any, b: any) => a.number - b.number);
          }
        }

        if (formattedQuestions.length > 0) {
          const quizResult = {
            title: parsedData.title || (fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Kuis Baru'),
            description: parsedData.description || 'Silakan kerjakan soal-soal berikut dengan teliti.',
            defaultPointsPerQuestion: parsedData.defaultPointsPerQuestion || defaultPoints,
            securitySettings: {
              timePerQuestionMinutes: 1,
              enableAntiCheat: true,
              blockTabSwitch: true,
              blockBrowserSwitch: true,
              blockNewTabKeys: true,
              fullScreenEnforced: true,
              autoCloseOnViolation: true,
              sendEmailNotification: true,
              sendWhatsAppNotification: true
            },
            questions: formattedQuestions
          };

          return res.json({
            success: true,
            quizData: quizResult,
            totalQuestions: formattedQuestions.length
          });
        }
      } catch (parseErr) {
        console.warn('Gemini response JSON parsing failed, trying local fallback:', parseErr);
      }
    }

    // ZERO-DOWNTIME FALLBACK: If Gemini API had an outage or high demand, use intelligent local parser
    if (!extractedText && cleanBase64) {
      try {
        const decoded = Buffer.from(cleanBase64, 'base64').toString('utf-8');
        if (decoded && decoded.trim().length > 10) {
          extractedText = decoded.trim();
        }
      } catch (e) {
        // ignore
      }
    }

    if (extractedText && extractedText.trim().length > 0) {
      const localQuestions = parseQuestionsLocally(extractedText, defaultPoints);
      if (localQuestions.length > 0) {
        const formattedQuestions = localQuestions.map((q: any, idx: number) => ({
          id: `q_loc_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          number: q.number || idx + 1,
          text: q.text || '',
          type: q.type || 'MULTIPLE_CHOICE',
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswer: q.correctAnswer || (q.options && q.options[0]) || '',
          correctOptionIndices: Array.isArray(q.correctOptionIndices) ? q.correctOptionIndices : [0],
          points: typeof q.points === 'number' ? q.points : defaultPoints,
          timeLimitMinutes: 1,
          explanation: q.explanation || 'Diekstrak menggunakan parser lokal.'
        }));

        const quizResult = {
          title: fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Kuis Baru',
          description: 'Silakan kerjakan soal-soal berikut dengan teliti.',
          defaultPointsPerQuestion: defaultPoints,
          securitySettings: {
            timePerQuestionMinutes: 1,
            enableAntiCheat: true,
            blockTabSwitch: true,
            blockBrowserSwitch: true,
            blockNewTabKeys: true,
            fullScreenEnforced: true,
            autoCloseOnViolation: true,
            sendEmailNotification: true,
            sendWhatsAppNotification: true
          },
          questions: formattedQuestions
        };

        return res.json({
          success: true,
          fallbackUsed: true,
          quizData: quizResult,
          totalQuestions: formattedQuestions.length,
          message: 'Soal berhasil diekstrak melalui parser dokumen cerdas cadangan.'
        });
      }
    }

    // If both AI and local parsing could not find questions
    return res.status(422).json({
      error: 'Tidak dapat menemukan butir soal yang valid dalam dokumen ini.',
      details: lastError?.message || 'Format naskah soal tidak terdeteksi atau dokumen kosong.',
      suggestion: 'Pastikan file soal memiliki nomor soal (misal: 1., 2.) dan opsi jawaban (A., B., C.), atau salin dan tempelkan teks langsung pada tab "Tempel Teks Soal".'
    });
  } catch (error: any) {
    console.error('Extraction error:', error);
    res.status(500).json({
      error: 'Terjadi kendala saat memproses dokumen.',
      details: error.message || 'Kesalahan pada server'
    });
  }
});

async function startServer() {
  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
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

startServer();
