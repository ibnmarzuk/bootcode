import { DocumentItem, DocumentChunk } from '../src/types';

export class DocumentProcessor {
  /**
   * Process raw text or page-by-page extracted document contents into structured semantic chunks
   */
  static processTextIntoChunks(
    documentId: string,
    filename: string,
    rawText: string,
    estimatedPageCount: number = 1,
    pageTexts?: { page: number; text: string }[]
  ): DocumentItem {
    const chunks: DocumentChunk[] = [];
    let chunkCounter = 1;

    if (pageTexts && pageTexts.length > 0) {
      for (const pt of pageTexts) {
        const pageClean = (pt.text || '').trim();
        if (!pageClean) continue;

        // Split large page into readable chunks if page has substantial text
        const paragraphs = pageClean.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
        let currentChunkText = '';
        let currentSection = `Page ${pt.page}`;

        for (const para of paragraphs) {
          const firstLine = para.split('\n')[0].trim();
          if (
            firstLine.length < 70 &&
            (firstLine.startsWith('#') ||
             firstLine.toUpperCase().startsWith('CHAPTER') ||
             firstLine.toUpperCase().startsWith('MODULE') ||
             firstLine.toUpperCase().startsWith('SECTION') ||
             firstLine.endsWith(':'))
          ) {
            currentSection = firstLine.replace(/^[#\s]+/, '').replace(/[:]$/, '');
          }

          if ((currentChunkText + ' ' + para).length > 1400 && currentChunkText.length > 200) {
            chunks.push({
              id: `chunk-${documentId}-${chunkCounter++}`,
              documentId,
              page: pt.page,
              section: currentSection,
              text: currentChunkText.trim()
            });
            currentChunkText = '';
          }
          currentChunkText += (currentChunkText ? '\n\n' : '') + para;
        }

        if (currentChunkText.trim().length > 0) {
          chunks.push({
            id: `chunk-${documentId}-${chunkCounter++}`,
            documentId,
            page: pt.page,
            section: currentSection,
            text: currentChunkText.trim()
          });
        }
      }
    }

    // Fallback if no pageTexts or chunks produced
    if (chunks.length === 0) {
      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      let currentSection = 'Curriculum Overview';
      let currentChunkText = '';
      let currentPage = 1;
      const approxLinesPerPage = Math.max(25, Math.ceil(lines.length / Math.max(1, estimatedPageCount)));

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        currentPage = Math.min(estimatedPageCount, Math.floor(i / approxLinesPerPage) + 1);

        if (
          line.startsWith('#') ||
          line.toUpperCase().startsWith('MODULE') ||
          line.toUpperCase().startsWith('CHAPTER') ||
          line.toUpperCase().startsWith('SECTION') ||
          (line.length < 60 && line.endsWith(':'))
        ) {
          if (currentChunkText.length > 200) {
            chunks.push({
              id: `chunk-${documentId}-${chunkCounter++}`,
              documentId,
              page: currentPage,
              section: currentSection,
              text: currentChunkText.trim()
            });
            currentChunkText = '';
          }
          currentSection = line.replace(/^[#\s]+/, '').replace(/[:]$/, '');
        }

        currentChunkText += ' ' + line;
        if (currentChunkText.length >= 1200) {
          chunks.push({
            id: `chunk-${documentId}-${chunkCounter++}`,
            documentId,
            page: currentPage,
            section: currentSection,
            text: currentChunkText.trim()
          });
          currentChunkText = '';
        }
      }

      if (currentChunkText.trim().length > 0) {
        chunks.push({
          id: `chunk-${documentId}-${chunkCounter++}`,
          documentId,
          page: currentPage,
          section: currentSection,
          text: currentChunkText.trim()
        });
      }
    }

    const calculatedPages = pageTexts?.length || Math.max(1, estimatedPageCount);

    return {
      id: documentId,
      filename,
      size: rawText.length,
      uploadDate: new Date().toISOString(),
      status: 'READY',
      pageCount: Math.max(1, calculatedPages),
      textExtractionStatus: 'SUCCESS',
      chunks,
      questionsGeneratedCount: 0
    };
  }

  /**
   * PDF parser that extracts true page text and total pages using pdf-parse
   */
  static async extractTextFromBuffer(
    buffer: Buffer,
    filename: string
  ): Promise<{ text: string; pages: number; pageTexts?: { page: number; text: string }[] }> {
    // If text file or markdown
    if (!filename.toLowerCase().endsWith('.pdf')) {
      const raw = buffer.toString('utf-8');
      return {
        text: raw,
        pages: Math.max(1, Math.ceil(raw.length / 2500))
      };
    }

    try {
      // Load the parser only when a PDF is actually processed. This keeps
      // health and non-PDF API routes independent from optional parser
      // runtime dependencies in serverless deployments.
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();

      if (parsed && parsed.text && parsed.text.trim().length > 20) {
        const pageTexts = parsed.pages && parsed.pages.length > 0
          ? parsed.pages.map((p: any, i: number) => ({
              page: p.num || i + 1,
              text: (p.text || '').trim()
            })).filter((p: any) => p.text.length > 0)
          : undefined;

        const totalPages = Math.max(1, parsed.total || (pageTexts ? pageTexts.length : 1));
        return {
          text: parsed.text.trim(),
          pages: totalPages,
          pageTexts
        };
      }
    } catch (err) {
      console.warn(`[DocumentProcessor] PDFParse parser warning for ${filename}:`, err);
    }

    // Heuristic stream extraction for unencrypted or flat text streams
    const raw = buffer.toString('utf-8');
    const textMatches: string[] = [];
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;

    while ((match = streamRegex.exec(raw)) !== null) {
      const streamContent = match[1];
      const tjRegex = /\(([^)]+)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(streamContent)) !== null) {
        textMatches.push(tjMatch[1]);
      }
    }

    if (textMatches.length > 5) {
      const text = textMatches.join(' ');
      const pages = Math.max(1, (raw.match(/\/Type\s*\/Page[^s]/g) || []).length);
      return { text, pages };
    }

    // Clean ASCII text fallback (ignoring PDF headers and trailer xref tables)
    const withoutXref = raw.replace(/xref[\s\S]*$/i, '').replace(/%PDF[\s\S]*?obj/g, '');
    const asciiWords = withoutXref
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && /^[a-zA-Z0-9.,;:!?'"()\-]+$/.test(w));

    const text = asciiWords.join(' ');
    const pages = Math.max(1, (raw.match(/\/Type\s*\/Page[^s]/g) || []).length);

    return {
      text: text.length > 30 ? text : `Curriculum content from ${filename}`,
      pages: pages > 0 ? pages : 1
    };
  }
}
