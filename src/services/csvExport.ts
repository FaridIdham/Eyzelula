import { QuizData, Question } from '../types';

export function generateQuizCsv(quizData: QuizData, delimiter: ',' | ';' = ','): string {
  const headers = [
    'No',
    'Tipe Soal',
    'Pertanyaan',
    'Opsi A',
    'Opsi B',
    'Opsi C',
    'Opsi D',
    'Opsi E',
    'Kunci Jawaban',
    'Poin',
    'Pembahasan'
  ];

  const escapeCell = (val: string | number | undefined): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows: string[] = [
    headers.map(h => escapeCell(h)).join(delimiter)
  ];

  quizData.questions.forEach((q: Question, idx: number) => {
    const typeLabel =
      q.type === 'MULTIPLE_CHOICE'
        ? 'Pilihan Ganda'
        : q.type === 'CHECKBOX'
        ? 'Kotak Centang'
        : q.type === 'SHORT_ANSWER'
        ? 'Isian Singkat'
        : 'Esai/Uraian';

    const optA = q.options[0] || '';
    const optB = q.options[1] || '';
    const optC = q.options[2] || '';
    const optD = q.options[3] || '';
    const optE = q.options[4] || '';

    const row = [
      escapeCell(idx + 1),
      escapeCell(typeLabel),
      escapeCell(q.text),
      escapeCell(optA),
      escapeCell(optB),
      escapeCell(optC),
      escapeCell(optD),
      escapeCell(optE),
      escapeCell(q.correctAnswer),
      escapeCell(q.points),
      escapeCell(q.explanation || '')
    ];

    rows.push(row.join(delimiter));
  });

  // Prepend UTF-8 BOM so Excel properly opens Indonesian texts and characters
  return '\uFEFF' + rows.join('\r\n');
}

export function downloadCsvFile(quizData: QuizData, delimiter: ',' | ';' = ',') {
  const csvContent = generateQuizCsv(quizData, delimiter);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const sanitizedTitle = (quizData.title || 'kuis-soal')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');
  const filename = `${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadJsonFile(quizData: QuizData) {
  const jsonStr = JSON.stringify(quizData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const sanitizedTitle = (quizData.title || 'kuis-soal')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');
  const filename = `${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
