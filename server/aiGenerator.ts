import { GoogleGenAI, Type } from '@google/genai';
import { Question, DocumentChunk } from '../src/types';

interface GenerateOptions {
  chunks: DocumentChunk[];
  documentName: string;
  count: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
  category?: string;
  language?: string;
  autoApprove?: boolean;
  base64Pdf?: string;
}

interface RawGeneratedItem {
  question: string;
  options: { id: string; text: string }[];
  correct_answer: string;
  explanation: string;
  difficulty?: string;
  category?: string;
  source_document?: string;
  source_page?: number;
}

export class AIQuestionGenerator {
  private static getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  static async generateQuestions(options: GenerateOptions): Promise<Question[]> {
    const {
      chunks,
      documentName,
      count,
      difficulty = 'MEDIUM',
      category = 'Curriculum',
      language = 'English',
      autoApprove = false,
      base64Pdf
    } = options;

    const ai = this.getClient();

    // Prepare text context from chunks
    const validChunks = chunks.filter(c => c && c.text && c.text.trim().length > 15);
    const contextText = validChunks
      .map(c => `[Page ${c.page || 1} - ${c.section || 'Curriculum Point'}]\n${c.text.trim()}`)
      .join('\n\n---\n\n');

    if (ai) {
      const systemInstruction = `You are a strict, precise academic test author for live competition games.
ABSOLUTE MANDATORY GROUNDING RULE - ZERO OUTSIDE KNOWLEDGE:
1. Every single question, all 4 options, the correct answer, and the explanation MUST be 100% sourced and factually verifiable SOLELY from the provided document content.
2. You are strictly FORBIDDEN from using any external world knowledge, unmentioned facts, or outside topics.
3. STRICT TOPIC COMPLIANCE: If the document is about Social Media Marketing, ALL questions must be about the social media marketing principles in this document. If the document is about Accounting, ALL questions must be about that accounting text. You MUST NEVER introduce Machine Learning, Transformers, AI, cloud architecture, or general trivia UNLESS the uploaded document explicitly and primarily discusses those exact topics.
4. If a fact, name, date, definition, formula, number, or rule is not explicitly written in the provided document, you MUST NOT ask a question about it.
5. In the "explanation" field, quote or directly cite the exact sentence or fact from the document that verifies the answer.
6. Options MUST be labeled "A", "B", "C", and "D", with exactly one unambiguously correct answer based on the document.`;

      const userPrompt = `DOCUMENT NAME: ${documentName}
TARGET QUESTION COUNT: ${count}
TARGET DIFFICULTY: ${difficulty}
PREFERRED CATEGORY: ${category || 'Curriculum'}
TARGET LANGUAGE: ${language}

TASK:
Formulate exactly ${count} multiple choice questions strictly based on the content of "${documentName}".
Ensure all questions test clear understanding of concepts, terms, definitions, steps, or facts explicitly stated in the document.

${contextText.length > 0 ? `DOCUMENT TEXT CONTEXT:
${contextText.slice(0, 35000)}` : ''}

REMINDER: Absolutely zero questions outside of this document's text.`;

      let contentsPayload: any;
      if (base64Pdf) {
        const cleanBase64 = base64Pdf
          .replace(/^data:application\/pdf;base64,/, '')
          .replace(/[\r\n\s]+/g, '');

        contentsPayload = [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: cleanBase64
            }
          },
          {
            text: userPrompt
          }
        ];
      } else {
        contentsPayload = userPrompt;
      }

      const generationConfig = {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: {
                type: Type.STRING,
                description: 'Question text strictly based on the document'
              },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: 'A, B, C, or D' },
                    text: { type: Type.STRING, description: 'Option text' }
                  },
                  required: ['id', 'text']
                },
                description: 'Exactly 4 distinct options labeled A, B, C, D'
              },
              correct_answer: {
                type: Type.STRING,
                description: 'The correct option letter: A, B, C, or D'
              },
              explanation: {
                type: Type.STRING,
                description: 'Direct quote or citation from the document proving the correct answer'
              },
              difficulty: {
                type: Type.STRING,
                description: 'EASY, MEDIUM, or HARD'
              },
              category: {
                type: Type.STRING,
                description: 'Topic or chapter name from the document'
              },
              source_document: {
                type: Type.STRING,
                description: 'Filename of the source document'
              },
              source_page: {
                type: Type.INTEGER,
                description: 'Page number where the fact appears'
              }
            },
            required: ['question', 'options', 'correct_answer', 'explanation']
          }
        },
        temperature: 0.2
      };

      // Model cascade: try fast models in order of availability
      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: contentsPayload,
            config: generationConfig
          });

          const rawText = response.text || '';
          if (rawText.trim().length > 0) {
            // Strip any markdown code fences or conversational text wrapper
            let jsonString = rawText.trim();
            const fenceMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            if (fenceMatch) {
              jsonString = fenceMatch[1].trim();
            } else {
              // Try finding array boundaries [ ... ]
              const firstBracket = jsonString.indexOf('[');
              const lastBracket = jsonString.lastIndexOf(']');
              if (firstBracket !== -1 && lastBracket > firstBracket) {
                jsonString = jsonString.substring(firstBracket, lastBracket + 1);
              }
            }

            try {
              const parsed = JSON.parse(jsonString) as RawGeneratedItem[];
              if (Array.isArray(parsed) && parsed.length > 0) {
                const validated = this.validateAndTransform(parsed, documentName, autoApprove);
                if (validated.length > 0) {
                  return validated.slice(0, count);
                }
              }
            } catch (jsonErr: any) {
              console.warn(`[AIQuestionGenerator] JSON parse error for model ${model}:`, jsonErr?.message || jsonErr);
            }
          }
        } catch (err: any) {
          console.warn(`[AIQuestionGenerator] Model ${model} generation attempt returned: ${err?.message || err}`);
          // If error is high demand (503), continue to next model in cascade
        }
      }
    }

    // Document-grounded algorithmic generator: strictly derives questions from chunk text
    return this.generateAlgorithmicFallback(options, validChunks);
  }

  private static validateAndTransform(
    items: RawGeneratedItem[],
    fallbackDocName: string,
    autoApprove: boolean = false
  ): Question[] {
    const validQuestions: Question[] = [];

    for (const item of items) {
      if (!item.question || !Array.isArray(item.options) || item.options.length < 2) {
        continue;
      }

      const validIds: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
      const rawCorrect = (item.correct_answer || '').toUpperCase().trim();
      const correctAnswer = (validIds.includes(rawCorrect as any) ? rawCorrect : 'A') as 'A' | 'B' | 'C' | 'D';

      // Ensure 4 options with valid ids
      const mappedOptions = validIds.map((id, idx) => {
        const found = item.options.find(o => o.id?.toUpperCase() === id);
        if (found && found.text && found.text.trim()) {
          return { id, text: found.text.trim() };
        }
        const fallbackOption = item.options[idx];
        return {
          id,
          text: fallbackOption?.text?.trim() || `Option ${id}`
        };
      });

      const qId = `q-ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      validQuestions.push({
        id: qId,
        text: item.question.trim(),
        options: mappedOptions,
        correctAnswer,
        explanation: item.explanation?.trim() || `Verified from ${fallbackDocName}.`,
        category: item.category?.trim() || 'Curriculum',
        difficulty: (['EASY', 'MEDIUM', 'HARD'].includes((item.difficulty || '').toUpperCase())
          ? (item.difficulty as any).toUpperCase()
          : 'MEDIUM'),
        points: 1,
        timeLimit: 10,
        sourceDocument: item.source_document || fallbackDocName,
        sourcePage: typeof item.source_page === 'number' && item.source_page > 0 ? item.source_page : 1,
        status: autoApprove ? 'APPROVED' : 'PENDING',
        createdAt: new Date().toISOString()
      });
    }

    return validQuestions;
  }

  /**
   * Fallback question generator strictly grounded in the document's actual text chunks.
   * NEVER generates outside knowledge or hardcoded AI topics.
   */
  private static generateAlgorithmicFallback(
    options: GenerateOptions,
    validChunks: DocumentChunk[]
  ): Question[] {
    const { documentName, count, difficulty = 'MEDIUM', category = 'Curriculum', autoApprove = false } = options;

    if (validChunks.length === 0) {
      throw new Error(
        `Unable to generate questions: No readable text could be extracted from "${documentName}". Please ensure the PDF file contains readable, non-empty text.`
      );
    }

    // Extract real sentences and factual statements from document chunks
    interface ExtractedFact {
      sentence: string;
      chunk: DocumentChunk;
      keyTerm: string;
      predicate: string;
    }

    const facts: ExtractedFact[] = [];
    const allKeywords: string[] = [];

    for (const chunk of validChunks) {
      const sentences = chunk.text
        .replace(/([.?!])\s+/g, '$1\n')
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length >= 30 && s.length <= 300 && !s.startsWith('#') && !s.includes('---'));

      for (const sent of sentences) {
        // Look for definitional or factual patterns
        const defMatch = sent.match(/^([^,:–—-]+?)\s+(?:is|are|refers to|means|includes|defines|consists of|represents|requires|provides)\s+(.+)$/i);
        if (defMatch) {
          const subject = defMatch[1].trim();
          const rest = defMatch[2].trim();
          if (subject.length > 2 && subject.length < 50 && rest.length > 10) {
            facts.push({
              sentence: sent,
              chunk,
              keyTerm: subject,
              predicate: rest.replace(/[.]$/, '')
            });
            allKeywords.push(subject);
          }
        } else {
          // General factual statement
          const words = sent.split(/\s+/).filter(w => w.length > 4);
          if (words.length >= 3) {
            facts.push({
              sentence: sent,
              chunk,
              keyTerm: words[0] + ' ' + words[1],
              predicate: sent
            });
          }
        }
      }
    }

    if (facts.length === 0) {
      // Chunk-based paragraph extraction if strict sentences couldn't be parsed
      for (const chunk of validChunks) {
        facts.push({
          sentence: chunk.text.slice(0, 150),
          chunk,
          keyTerm: chunk.section || 'Curriculum Point',
          predicate: chunk.text.slice(0, 120)
        });
      }
    }

    const questions: Question[] = [];

    for (let i = 0; i < count; i++) {
      const fact = facts[i % facts.length];
      const otherFacts = facts.filter((_, idx) => idx !== (i % facts.length));

      // Build plausible distractors solely from other parts of the same document
      const distractor1 = otherFacts[0]?.predicate?.slice(0, 85) || 'Not addressed in this curriculum module';
      const distractor2 = otherFacts[1]?.predicate?.slice(0, 85) || 'Contradicted by the primary document reference';
      const distractor3 = otherFacts[2]?.predicate?.slice(0, 85) || 'Secondary extraneous factor omitted from text';

      const questionText = fact.keyTerm && fact.predicate && fact.predicate !== fact.sentence
        ? `According to "${documentName}", what is stated regarding ${fact.keyTerm}?`
        : `Based on the text in "${documentName}" (${fact.chunk.section || 'Page ' + fact.chunk.page}), which of the following is correct?`;

      const correctAnswerText = fact.predicate.slice(0, 95);

      // Randomize correct option position (A, B, C, or D)
      const correctSlot = (['A', 'B', 'C', 'D'][i % 4]) as 'A' | 'B' | 'C' | 'D';
      const pool = [distractor1, distractor2, distractor3];
      const optionsArray: { id: 'A' | 'B' | 'C' | 'D'; text: string }[] = [];

      for (const id of ['A', 'B', 'C', 'D'] as const) {
        if (id === correctSlot) {
          optionsArray.push({ id, text: correctAnswerText });
        } else {
          const dist = pool.shift() || 'None of the other options are supported by the text';
          optionsArray.push({ id, text: dist });
        }
      }

      questions.push({
        id: `q-doc-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        text: questionText,
        options: optionsArray,
        correctAnswer: correctSlot,
        explanation: `Directly stated in the document: "${fact.sentence.slice(0, 200)}"`,
        category: fact.chunk.section || category || 'Curriculum',
        difficulty: (difficulty === 'MIXED' ? (['EASY', 'MEDIUM', 'HARD'][i % 3] as any) : difficulty),
        points: 1,
        timeLimit: 10,
        sourceDocument: documentName,
        sourcePage: fact.chunk.page || 1,
        status: autoApprove ? 'APPROVED' : 'PENDING',
        createdAt: new Date().toISOString()
      });
    }

    return questions;
  }
}
