import { QuizData, Question } from '../types';

export interface GoogleFormCreationResult {
  formId: string;
  responderUri: string;
  editUri: string;
  title: string;
  totalQuestions: number;
}

/**
 * Safely sanitizes a Google Form responder URL to prevent Google's HTTP 400 Bad Request error.
 * Google returns 400 when a regular form ID is mistakenly passed to `/forms/d/e/{formId}/viewform`
 * instead of the canonical `/forms/d/{formId}/viewform`.
 */
export function getSafeGoogleFormResponderUri(rawUrl: string, formId?: string): string {
  if (!rawUrl) {
    return formId ? `https://docs.google.com/forms/d/${formId}/viewform` : '';
  }
  // If url contains /d/e/ followed by the formId, replace with /d/{formId}/
  if (formId && rawUrl.includes(`/d/e/${formId}/`)) {
    return rawUrl.replace(`/d/e/${formId}/`, `/d/${formId}/`);
  }
  // If url contains /d/e/{token} where token is NOT a 1FAIpQL public hash, fix it
  const match = rawUrl.match(/\/forms\/d\/e\/([a-zA-Z0-9_-]+)\/viewform/);
  if (match && !match[1].startsWith('1FAIpQL')) {
    return `https://docs.google.com/forms/d/${match[1]}/viewform`;
  }
  return rawUrl;
}

/**
 * Helper to ensure options are non-empty and strictly unique,
 * preventing Google Forms batchUpdate 400 errors.
 */
function sanitizeChoiceOptions(rawOptions: string[]): string[] {
  const seen = new Set<string>();
  const sanitized: string[] = [];
  const cleanList = (rawOptions || []).map(o => (o || '').trim()).filter(Boolean);
  const base = cleanList.length >= 2 ? cleanList : ['Pilihan A', 'Pilihan B'];

  for (let i = 0; i < base.length; i++) {
    let candidate = base[i];
    let counter = 2;
    while (seen.has(candidate.toLowerCase())) {
      candidate = `${base[i]} (${counter})`;
      counter++;
    }
    seen.add(candidate.toLowerCase());
    sanitized.push(candidate);
  }
  return sanitized;
}

function formatDurationLabel(minutes: number): string {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)} Detik`;
  }
  return `${minutes} Menit`;
}

export async function createGoogleForm(
  quizData: QuizData,
  accessToken: string
): Promise<GoogleFormCreationResult> {
  if (!accessToken) {
    throw new Error('Token otorisasi Google tidak ditemukan. Silakan masuk dengan Google terlebih dahulu.');
  }

  // Step 1: Create the base form with title
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      info: {
        title: quizData.title.trim() || 'Kuis Baru Tanpa Judul',
        documentTitle: quizData.title.trim() || 'Kuis Baru'
      }
    })
  });

  if (!createRes.ok) {
    const errorBody = await createRes.json().catch(() => ({}));
    const message = errorBody.error?.message || `HTTP ${createRes.status}: Gagal membuat formulir Google`;
    throw new Error(message);
  }

  const createdForm = await createRes.json();
  const formId = createdForm.formId;
  
  // Canonical URLs that are guaranteed never to produce Google's HTTP 400 Malformed Error
  // Note: /d/{formId}/viewform is canonical. Putting formId inside /d/e/{formId}/viewform causes Google 400 Malformed Error.
  const canonicalViewUri = `https://docs.google.com/forms/d/${formId}/viewform`;
  const editUri = `https://docs.google.com/forms/d/${formId}/edit`;

  let responderUri = canonicalViewUri;
  if (
    createdForm.responderUri &&
    typeof createdForm.responderUri === 'string' &&
    createdForm.responderUri.includes('/d/e/1FAIpQL')
  ) {
    responderUri = createdForm.responderUri;
  }

  // Step 2: Prepare batch update requests
  const requests: any[] = [];

  // Enable quiz mode and set description
  requests.push({
    updateSettings: {
      settings: {
        quizSettings: {
          isQuiz: true
        }
      },
      updateMask: 'quizSettings.isQuiz'
    }
  });

  // Set quiz description (clean, without time rules)
  const baseDescription = quizData.description || 'Silakan kerjakan butir soal berikut dengan teliti.';
  const instructionsNotice = `📋 KETENTUAN RESPON & SKOR UJIAN:
• Batas Respon: Setiap mahasiswa hanya dapat mengulangi memberikan respon jawaban MAKSIMAL 2 KALI. Respon ke-3 dan seterusnya otomatis dianulir.
• Hasil Skor: Setelah mengirim jawaban, tekan tombol "Lihat Skor" untuk melihat perolehan nilai Anda.`;

  const finalDescription = baseDescription
    ? `${baseDescription}\n\n${instructionsNotice}`
    : instructionsNotice;

  requests.push({
    updateFormInfo: {
      info: {
        description: finalDescription
      },
      updateMask: 'description'
    }
  });

  let currentItemIndex = 0;

  // 1. Add Section Header for Student Identity
  requests.push({
    createItem: {
      item: {
        title: '📋 DATA IDENTITAS MAHASISWA & MATA KULIAH',
        description: 'Lengkapi seluruh data identitas diri berikut ini dengan teliti sebelum mengerjakan butir soal ujian:',
        textItem: {}
      },
      location: {
        index: currentItemIndex++
      }
    }
  });

  // 3. Nama Mahasiswa (Wajib, Text Item)
  requests.push({
    createItem: {
      item: {
        title: 'Nama Mahasiswa',
        description: 'Nama lengkap mahasiswa sesuai KRS / Presensi resmi',
        questionItem: {
          question: {
            required: true,
            textQuestion: {
              paragraph: false
            }
          }
        }
      },
      location: {
        index: currentItemIndex++
      }
    }
  });

  // 4. NIM (Nomor Induk Mahasiswa) (Wajib, Text Item)
  requests.push({
    createItem: {
      item: {
        title: 'NIM (Nomor Induk Mahasiswa)',
        description: 'Nomor Induk Mahasiswa (NIM)',
        questionItem: {
          question: {
            required: true,
            textQuestion: {
              paragraph: false
            }
          }
        }
      },
      location: {
        index: currentItemIndex++
      }
    }
  });

  // 5. Mata Kuliah (Wajib, Text Item)
  requests.push({
    createItem: {
      item: {
        title: 'Mata Kuliah',
        description: quizData.mataKuliah ? `Mata Kuliah: ${quizData.mataKuliah}` : 'Nama mata kuliah yang sedang diujikan',
        questionItem: {
          question: {
            required: true,
            textQuestion: {
              paragraph: false
            }
          }
        }
      },
      location: {
        index: currentItemIndex++
      }
    }
  });

  // 6. Kelas (Wajib, Text Item)
  requests.push({
    createItem: {
      item: {
        title: 'Kelas',
        description: quizData.kelas ? `Kelas: ${quizData.kelas}` : 'Contoh: Kelas A, Kelas B, Reguler, Karyawan, TI-2A, dll.',
        questionItem: {
          question: {
            required: true,
            textQuestion: {
              paragraph: false
            }
          }
        }
      },
      location: {
        index: currentItemIndex++
      }
    }
  });

  // 7. Semester (Wajib, Text Item)
  requests.push({
    createItem: {
      item: {
        title: 'Semester',
        description: quizData.semester ? `Semester: ${quizData.semester}` : 'Contoh: Semester 1, 2, 3, 4, 5, 6, 7, atau 8',
        questionItem: {
          question: {
            required: true,
            textQuestion: {
              paragraph: false
            }
          }
        }
      },
      location: {
        index: currentItemIndex++
      }
    }
  });

  // Add Section Header for Exam Questions
  requests.push({
    createItem: {
      item: {
        title: '📝 LEMBAR SOAL UJIAN',
        description: 'Kerjakan seluruh butir soal berikut secara mandiri, teliti, dan jujur.',
        textItem: {}
      },
      location: {
        index: currentItemIndex++
      }
    }
  });

  // Add all questions without question-level time labels
  quizData.questions.forEach((q: Question, idx: number) => {
    const itemTitle = `${idx + 1}. ${q.text || 'Pertanyaan'}`;
    const pointsValue = Math.max(0, Math.round(q.points ?? 10));
    let questionItemObj: any = null;

    if (q.type === 'MULTIPLE_CHOICE') {
      const options = sanitizeChoiceOptions(q.options);
      
      let correctAnswersList: { value: string }[] = [];
      if (q.correctAnswer && options.includes(q.correctAnswer)) {
        correctAnswersList = [{ value: q.correctAnswer }];
      } else if (q.correctOptionIndices && q.correctOptionIndices.length > 0) {
        const selected = options[q.correctOptionIndices[0]];
        if (selected) correctAnswersList = [{ value: selected }];
      } else if (options.length > 0) {
        // Default first option as answer if none specified
        correctAnswersList = [{ value: options[0] }];
      }

      questionItemObj = {
        required: true,
        grading: {
          pointValue: pointsValue,
          correctAnswers: correctAnswersList.length > 0 ? {
            answers: correctAnswersList
          } : undefined,
          whenRight: q.explanation ? { text: q.explanation } : undefined,
          whenWrong: q.explanation ? { text: `Pembahasan: ${q.explanation}` } : undefined
        },
        choiceQuestion: {
          type: 'RADIO',
          options: options.map(opt => ({ value: opt })),
          shuffle: false
        }
      };
    } else if (q.type === 'CHECKBOX') {
      const options = sanitizeChoiceOptions(q.options);
      const selectedAnswers = (q.correctOptionIndices || [])
        .map(i => options[i])
        .filter(Boolean)
        .map(val => ({ value: val }));

      questionItemObj = {
        required: true,
        grading: {
          pointValue: pointsValue,
          correctAnswers: selectedAnswers.length > 0 ? {
            answers: selectedAnswers
          } : undefined,
          generalFeedback: q.explanation ? { text: q.explanation } : undefined
        },
        choiceQuestion: {
          type: 'CHECKBOX',
          options: options.map(opt => ({ value: opt })),
          shuffle: false
        }
      };
    } else if (q.type === 'SHORT_ANSWER') {
      questionItemObj = {
        required: true,
        grading: {
          pointValue: pointsValue,
          correctAnswers: q.correctAnswer ? {
            answers: [{ value: q.correctAnswer }]
          } : undefined,
          generalFeedback: q.explanation ? { text: q.explanation } : undefined
        },
        textQuestion: {
          paragraph: false
        }
      };
    } else {
      // PARAGRAPH / ESSAY
      questionItemObj = {
        required: true,
        grading: {
          pointValue: pointsValue,
          generalFeedback: q.explanation ? { text: q.explanation } : undefined
        },
        textQuestion: {
          paragraph: true
        }
      };
    }

    // Clean question without any visible "Catatan" notes; explanations remain in post-submission grading feedback
    requests.push({
      createItem: {
        item: {
          title: itemTitle,
          questionItem: {
            question: questionItemObj
          }
        },
        location: {
          index: currentItemIndex++
        }
      }
    });
  });

  // Step 3: Execute batchUpdate
  if (requests.length > 0) {
    const batchRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    if (!batchRes.ok) {
      const errorBody = await batchRes.json().catch(() => ({}));
      const message = errorBody.error?.message || `HTTP ${batchRes.status}: Gagal menyisipkan butir-butir soal ke Google Form`;
      throw new Error(message);
    }
  }

  return {
    formId,
    responderUri,
    editUri,
    title: quizData.title,
    totalQuestions: quizData.questions.length
  };
}
