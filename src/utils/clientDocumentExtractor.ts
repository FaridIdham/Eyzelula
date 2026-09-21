import mammoth from 'mammoth';
import { parseQuestionsLocally, countQuestionsInDocument, LocalExtractedQuestion } from './localQuestionParser';

export interface ClientExtractionResult {
  title: string;
  description: string;
  defaultPointsPerQuestion: number;
  securitySettings: {
    timePerQuestionMinutes: number;
    enableAntiCheat: boolean;
    blockTabSwitch: boolean;
    blockBrowserSwitch: boolean;
    blockNewTabKeys: boolean;
    fullScreenEnforced: boolean;
    autoCloseOnViolation: boolean;
    sendEmailNotification: boolean;
    sendWhatsAppNotification: boolean;
  };
  questions: LocalExtractedQuestion[];
}

export async function extractTextFromClientFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();

  // 1. Plain text file
  if (fileName.endsWith('.txt')) {
    return await file.text();
  }

  // 2. Word document (.docx)
  if (fileName.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    try {
      const mdResult = await (mammoth as any).convertToMarkdown({ arrayBuffer });
      if (mdResult?.value && mdResult.value.trim().length > 0) {
        return mdResult.value.trim();
      }
    } catch (e) {
      // Ignore fallback silently
    }

    try {
      const rawResult = await mammoth.extractRawText({ arrayBuffer });
      if (rawResult?.value && rawResult.value.trim().length > 0) {
        return rawResult.value.trim();
      }
    } catch (e) {
      // Ignore fallback silently
    }
  }

  // 3. PDF or legacy binary file: read as binary string and match readable chunks
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Try UTF-8 string decoding
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const decoded = decoder.decode(bytes);

    // If PDF, match text objects: (Text) Tj or [(T) (e) (x) (t)] TJ
    if (fileName.endsWith('.pdf')) {
      const pdfMatches = decoded.match(/\(([^()]{2,})\)/g);
      if (pdfMatches && pdfMatches.length > 5) {
        return pdfMatches.map(m => m.slice(1, -1)).join(' ');
      }
    }

    // Extract ASCII / printable string chunks
    const matches = decoded.match(/[\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF\r\n\t]{4,}/g);
    if (matches && matches.length > 0) {
      return matches.join('\n');
    }
  } catch (err) {
    // Ignore fallback silently
  }

  return '';
}

export async function extractQuestionsInBrowser(
  source: { file?: File | null; rawText?: string; fileName?: string },
  defaultPoints: number = 10
): Promise<ClientExtractionResult> {
  let text = '';
  const title = source.fileName ? source.fileName.replace(/\.[^/.]+$/, '') : 'Kuis Baru';

  if (source.rawText && source.rawText.trim().length > 0) {
    text = source.rawText.trim();
  } else if (source.file) {
    text = await extractTextFromClientFile(source.file);
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Dokumen kosong atau teks tidak dapat terbaca.');
  }

  const questions = parseQuestionsLocally(text, defaultPoints);
  if (!questions || questions.length === 0) {
    throw new Error('Tidak dapat mendeteksi nomor soal atau format soal dalam dokumen ini.');
  }

  return {
    title,
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
    questions
  };
}
