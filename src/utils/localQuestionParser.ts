export interface LocalExtractedQuestion {
  id: string;
  number: number;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'CHECKBOX' | 'SHORT_ANSWER' | 'PARAGRAPH';
  options: string[];
  correctAnswer: string;
  correctOptionIndices: number[];
  points: number;
  timeLimitMinutes: number;
  explanation: string;
}

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

export function parseQuestionsLocally(rawText: string, defaultPoints: number = 10): LocalExtractedQuestion[] {
  const lines = rawText.split(/\r?\n/);
  const questions: LocalExtractedQuestion[] = [];
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
        id: `q_${Date.now()}_${questions.length}_${Math.random().toString(36).substring(2, 7)}`,
        number: qNum,
        text: qText,
        type: 'MULTIPLE_CHOICE',
        options: [],
        correctAnswer: '',
        correctOptionIndices: [0],
        points: defaultPoints,
        timeLimitMinutes: 1,
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

  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];
    if (q.options.length === 0) {
      q.type = 'PARAGRAPH';
    } else {
      q.type = 'MULTIPLE_CHOICE';
      if (!q.correctAnswer && q.options.length > 0) {
        const globalLetter = globalKeyMap.get(q.number);
        if (globalLetter) {
          const lIdx = globalLetter.charCodeAt(0) - 65;
          if (q.options[lIdx]) {
            q.correctAnswer = q.options[lIdx];
            q.correctOptionIndices = [lIdx];
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
