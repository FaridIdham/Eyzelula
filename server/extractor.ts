import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

dotenv.config();

// Lazy initialize Gemini AI client with required User-Agent
let aiClient: GoogleGenAI | null = null;
export function getGeminiClient(): GoogleGenAI {
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
export function parseGeminiJson(raw: string): any {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

export function extractRawStringsFromPdf(buffer: Buffer): string {
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
export function extractTextFromBinaryDoc(buffer: Buffer): string {
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
export function countQuestionsInDocument(text: string): { totalDetected: number; detectedNumbers: number[] } {
  const lines = text.split(/\r?\n/);
  const detected = new Set<number>();
  const qRegex = /^(?:[\*\_#\s]*)?(?:(?:soal|no\.?|nomor|pertanyaan|q)\s*)?(?:(\d+)[\.\:\)]|\((\d+)\)|\[(\d+)\])\s+/im;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
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
export function parseQuestionsLocally(rawText: string, defaultPoints: number = 10): any[] {
  const lines = rawText.split(/\r?\n/);
  const questions: any[] = [];
  let currentQ: any = null;

  const globalKeyMap = new Map<number, string>();
  const globalKeyRegex = /(?:^|\s)(?:no\.?\s*)?(\d+)[\.\:\-\)]\s*([A-Ea-e])\b/g;
  let inDedicatedKeySection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      /^#*\s*(?:kunci\s*jawaban|kunci\s*soal|pembahasan\s*kunci|answer\s*key)\b/i.test(trimmed) &&
      !/^[A-Ea-e][\.\)]/i.test(trimmed)
    ) {
      inDedicatedKeySection = true;
    }

    if (inDedicatedKeySection || /kunci/i.test(trimmed)) {
      let m;
      while ((m = globalKeyRegex.exec(trimmed)) !== null) {
        const qNum = parseInt(m[1], 10);
        const ans = m[2].toUpperCase();
        if (qNum >= 1 && qNum <= 500) {
          globalKeyMap.set(qNum, ans);
        }
      }
    }
  }

  const qStartRegex = /^(?:[\*\_#\s]*)?(?:(?:soal|no\.?|nomor|pertanyaan|q)\s*)?(?:(\d+)[\.\:\)]|\((\d+)\)|\[(\d+)\])\s+(.+)$/i;
  const optRegex = /^(?:[\*\_#\s]*)?(?:([A-Ea-e])[\.\:\)]|\(([A-Ea-e])\)|\[([A-Ea-e])\])\s+(.+)$/;
  const inlineKeyRegex = /(?:kunci(?:\s*jawaban)?|jawaban\s*benar|answer\s*key)\s*[:=\-]\s*([A-Ea-e])/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (/^#*\s*(?:kunci\s*jawaban|kunci\s*soal|pembahasan\s*kunci|answer\s*key)\b/i.test(line) && !optRegex.test(line)) {
      break;
    }

    const qMatch = line.match(qStartRegex);
    if (qMatch) {
      const qNum = parseInt(qMatch[1] || qMatch[2] || qMatch[3], 10);
      const qText = qMatch[4].trim();

      if (currentQ) {
        questions.push(currentQ);
      }

      currentQ = {
        number: qNum,
        text: qText,
        type: 'MULTIPLE_CHOICE',
        options: [],
        correctAnswer: '',
        correctOptionIndices: [0],
        points: defaultPoints,
        explanation: ''
      };
      continue;
    }

    const optMatch = line.match(optRegex);
    if (optMatch && currentQ) {
      const optLetter = (optMatch[1] || optMatch[2] || optMatch[3]).toUpperCase();
      let optText = optMatch[4].trim();

      let isMarkedKey = false;
      if (line.includes('*') || line.includes('✓') || line.toLowerCase().includes('(kunci)')) {
        isMarkedKey = true;
        optText = optText.replace(/[\*✓]/g, '').replace(/\(kunci\)/gi, '').trim();
      }

      currentQ.options.push(optText);
      const currentOptIndex = currentQ.options.length - 1;

      if (isMarkedKey) {
        currentQ.correctAnswer = optText;
        currentQ.correctOptionIndices = [currentOptIndex];
      }

      const globalKeyLetter = globalKeyMap.get(currentQ.number);
      if (globalKeyLetter && optLetter === globalKeyLetter) {
        currentQ.correctAnswer = optText;
        currentQ.correctOptionIndices = [currentOptIndex];
      }

      continue;
    }

    const keyMatch = line.match(inlineKeyRegex);
    if (keyMatch && currentQ) {
      const keyLetter = keyMatch[1].toUpperCase();
      const letterIndex = keyLetter.charCodeAt(0) - 65;
      if (currentQ.options && currentQ.options[letterIndex]) {
        currentQ.correctAnswer = currentQ.options[letterIndex];
        currentQ.correctOptionIndices = [letterIndex];
      }
      continue;
    }

    if (currentQ && currentQ.options.length === 0) {
      currentQ.text += `\n${line}`;
    }
  }

  if (currentQ) {
    questions.push(currentQ);
  }

  for (const q of questions) {
    if (q.options.length === 0) {
      q.type = 'PARAGRAPH';
    } else {
      q.type = 'MULTIPLE_CHOICE';
      if (!q.correctAnswer && q.options.length > 0) {
        const globalLetter = globalKeyMap.get(q.number);
        if (globalLetter) {
          const idx = globalLetter.charCodeAt(0) - 65;
          if (q.options[idx]) {
            q.correctAnswer = q.options[idx];
            q.correctOptionIndices = [idx];
          } else {
            q.correctAnswer = q.options[0];
            q.correctOptionIndices = [0];
          }
        } else {
          q.correctAnswer = q.options[0];
          q.correctOptionIndices = [0];
        }
      }
    }
  }

  return questions;
}

// Core extractor handler used by both Express server and Vercel serverless function
export async function handleExtractQuestions(body: any, res: any) {
  const { fileBase64, mimeType, fileName, userPrompt } = body;
  const rawText = body.rawText || body.text || '';

  let extractedText = '';
  let isPdf = false;
  let cleanBase64 = '';
  const defaultPoints = 10;

  if (fileBase64) {
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
    try {
      const buffer = Buffer.from(cleanBase64, 'base64');
      let mdText = '';
      let rawDocText = '';

      try {
        const mdResult = await (mammoth as any).convertToMarkdown({ buffer });
        mdText = mdResult.value || '';
      } catch (mdErr: any) {
        console.warn('Mammoth markdown conversion notice:', mdErr?.message || mdErr);
      }

      try {
        const rawResult = await mammoth.extractRawText({ buffer });
        rawDocText = rawResult.value || '';
      } catch (rawErr: any) {
        console.warn('Mammoth raw text extraction notice:', rawErr?.message || rawErr);
      }

      if (!mdText && !rawDocText) {
        const binaryText = extractTextFromBinaryDoc(buffer);
        if (binaryText && binaryText.length > 50) {
          rawDocText = binaryText;
        }
      }

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

  const CANDIDATE_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest'
  ];

  let response: any = null;
  let lastError: any = null;

  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  if (ai && contents.length > 0) {
    modelLoop: for (const modelName of CANDIDATE_MODELS) {
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
            break;
          } else if (isRateLimit && attempt < 2) {
            await sleep(600 * attempt);
          } else {
            break;
          }
        }
      }
    }
  }

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

      if (extractedText && extractedText.trim().length > 0) {
        try {
          const localQuestions = parseQuestionsLocally(extractedText, defaultPoints);
          const aiNumbers = new Set(formattedQuestions.map((q: any) => q.number));
          const missingQuestions = localQuestions.filter((lq: any) => !aiNumbers.has(lq.number));

          if (missingQuestions.length > 0) {
            console.log(`[RECONCILIATION] Adding ${missingQuestions.length} questions recovered by local parser.`);
            const recovered = missingQuestions.map((mq: any, mIdx: number) => ({
              id: `q_rec_${Date.now()}_${mIdx}_${Math.random().toString(36).substring(2, 7)}`,
              number: mq.number,
              text: mq.text,
              type: mq.type || 'MULTIPLE_CHOICE',
              options: mq.options || [],
              correctAnswer: mq.correctAnswer || (mq.options && mq.options[0]) || '',
              correctOptionIndices: mq.correctOptionIndices || [0],
              points: mq.points || defaultPoints,
              timeLimitMinutes: 1,
              explanation: mq.explanation || 'Dipulihkan melalui parser naskah dokumen lokal.'
            }));
            formattedQuestions = [...formattedQuestions, ...recovered].sort((a, b) => a.number - b.number);
          }
        } catch (recErr) {
          console.warn('Reconciliation error:', recErr);
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

  // ZERO-DOWNTIME FALLBACK: If Gemini API had an outage, high demand, or key missing
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

  return res.status(422).json({
    error: 'Tidak dapat menemukan butir soal yang valid dalam dokumen ini.',
    details: lastError?.message || 'Format naskah soal tidak terdeteksi atau dokumen kosong.',
    suggestion: 'Pastikan file soal memiliki nomor soal (misal: 1., 2.) dan opsi jawaban (A., B., C.), atau salin dan tempelkan teks langsung pada tab "Tempel Teks Soal".'
  });
}
