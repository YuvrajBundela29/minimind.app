import { modes, ModeKey } from '@/config/minimind';

// ─── Color themes per mode ───────────────────────────────────────────
const MODE_COLORS: Record<ModeKey, { primary: [number, number, number]; light: [number, number, number]; accent: [number, number, number] }> = {
  beginner: { primary: [16, 185, 129], light: [236, 253, 245], accent: [5, 150, 105] },
  thinker:  { primary: [139, 92, 246],  light: [245, 243, 255], accent: [109, 40, 217] },
  story:    { primary: [245, 158, 11],  light: [255, 251, 235], accent: [217, 119, 6] },
  mastery:  { primary: [59, 130, 246],  light: [239, 246, 255], accent: [37, 99, 235] },
};

// ─── Thoroughly strip ALL markdown to clean plain text ───────────────
function stripMarkdown(text: string): string {
  return text
    // Code blocks (multi-line)
    .replace(/```[\s\S]*?```/g, '')
    // Inline code
    .replace(/`([^`]+)`/g, '$1')
    // Bold+italic combinations
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/___(.+?)___/g, '$1')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    // Italic
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_([^_\s][^_]*[^_\s])_/g, '$1')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '$1')
    // Highlight
    .replace(/==(.+?)==/g, '$1')
    .replace(/\^\^(.+?)\^\^/g, '$1')
    // Wiki-style links
    .replace(/\[\[(.+?)\]\]/g, '$1')
    // Markdown links
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    // Images
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Blockquotes
    .replace(/^>\s?/gm, '')
    // Heading markers
    .replace(/^#{1,6}\s+/gm, '')
    // Horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Stray asterisks and underscores at word boundaries
    .replace(/(?<!\w)\*{1,2}(?!\s)/g, '')
    .replace(/(?<!\s)\*{1,2}(?!\w)/g, '')
    // HTML tags
    .replace(/<[^>]*>/g, '')
    // Multiple spaces
    .replace(/ {2,}/g, ' ')
    .trim();
}

// ─── Parse content into structured blocks ────────────────────────────
interface ContentBlock {
  type: 'heading' | 'paragraph' | 'bullet' | 'numbered' | 'emoji-heading' | 'divider';
  content: string;
  level?: number;
  emoji?: string;
  boldParts?: string[]; // track which parts should be bold
}

function extractBoldParts(text: string): { clean: string; boldParts: string[] } {
  const boldParts: string[] = [];
  const clean = text.replace(/\*\*(.+?)\*\*/g, (_match, p1) => {
    boldParts.push(p1);
    return p1;
  });
  return { clean: stripMarkdown(clean), boldParts };
}

function parseContentToBlocks(text: string): ContentBlock[] {
  const lines = text.split('\n');
  const blocks: ContentBlock[] = [];
  let numberedIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip pure symbol lines (horizontal rules)
    if (/^[-=_*]{3,}$/.test(trimmed)) {
      blocks.push({ type: 'divider', content: '' });
      continue;
    }

    // Emoji heading: starts with emoji followed by bold text or colon
    const emojiHeadingMatch = trimmed.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}]+)\s+\*\*(.+?)\*\*\s*[-:\u2014]?\s*(.*)/u);
    if (emojiHeadingMatch) {
      const emoji = emojiHeadingMatch[1];
      const heading = stripMarkdown(emojiHeadingMatch[2]);
      const rest = emojiHeadingMatch[3]?.trim();
      blocks.push({ type: 'emoji-heading', content: heading, emoji });
      if (rest) {
        const { clean, boldParts } = extractBoldParts(rest);
        blocks.push({ type: 'paragraph', content: clean, boldParts });
      }
      numberedIndex = 0;
      continue;
    }

    // Emoji heading variant: emoji + text (no bold markers)
    const emojiSimpleMatch = trimmed.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}]+)\s+([A-Z][\w\s]+)[:]\s*(.*)/u);
    if (emojiSimpleMatch) {
      blocks.push({ type: 'emoji-heading', content: stripMarkdown(emojiSimpleMatch[2]), emoji: emojiSimpleMatch[1] });
      if (emojiSimpleMatch[3]?.trim()) {
        const { clean, boldParts } = extractBoldParts(emojiSimpleMatch[3]);
        blocks.push({ type: 'paragraph', content: clean, boldParts });
      }
      numberedIndex = 0;
      continue;
    }

    // Standard heading: # ## ###
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ type: 'heading', content: stripMarkdown(headingMatch[2]), level: headingMatch[1].length });
      numberedIndex = 0;
      continue;
    }

    // Bold-only line as sub-heading
    const boldLineMatch = trimmed.match(/^\*\*(.+?)\*\*\s*$/);
    if (boldLineMatch && trimmed.length < 80) {
      blocks.push({ type: 'heading', content: stripMarkdown(boldLineMatch[1]), level: 3 });
      numberedIndex = 0;
      continue;
    }

    // Bullet points (-, *, bullet char)
    const bulletMatch = trimmed.match(/^[-*\u2022]\s+(.+)$/);
    if (bulletMatch) {
      const { clean, boldParts } = extractBoldParts(bulletMatch[1]);
      blocks.push({ type: 'bullet', content: clean, boldParts });
      numberedIndex = 0;
      continue;
    }

    // Numbered lists
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (numberedMatch) {
      numberedIndex++;
      const { clean, boldParts } = extractBoldParts(numberedMatch[1]);
      blocks.push({ type: 'numbered', content: clean, boldParts, level: numberedIndex });
      continue;
    }

    // Regular paragraph
    const { clean, boldParts } = extractBoldParts(trimmed);
    blocks.push({ type: 'paragraph', content: clean, boldParts });
    numberedIndex = 0;
  }

  return blocks;
}

// ─── Dynamic import of jsPDF ─────────────────────────────────────────
async function loadJsPDF() {
  const { default: jsPDF } = await import('jspdf');
  return jsPDF;
}

// ─── Render text with inline bold highlighting ───────────────────────
function renderTextWithBold(
  doc: any,
  text: string,
  boldParts: string[],
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  textColor: [number, number, number],
  accentColor: [number, number, number]
): number {
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'normal');
  const lineHeight = fontSize * 0.45;
  const wrappedLines: string[] = doc.splitTextToSize(text, maxWidth);

  let totalHeight = 0;

  for (const line of wrappedLines) {
    // Check if this line contains any bold part
    let hasBold = false;
    for (const bp of boldParts) {
      if (line.includes(bp)) {
        hasBold = true;
        break;
      }
    }

    if (hasBold && boldParts.length > 0) {
      // Render with bold segments
      let xOffset = x;
      let remaining = line;

      while (remaining.length > 0) {
        let foundBold = false;
        for (const bp of boldParts) {
          const idx = remaining.indexOf(bp);
          if (idx >= 0) {
            // Render text before the bold part
            if (idx > 0) {
              const before = remaining.substring(0, idx);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(...textColor);
              doc.text(before, xOffset, y + totalHeight);
              xOffset += doc.getTextWidth(before);
            }
            // Render the bold part
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...accentColor);
            doc.text(bp, xOffset, y + totalHeight);
            xOffset += doc.getTextWidth(bp);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...textColor);

            remaining = remaining.substring(idx + bp.length);
            foundBold = true;
            break;
          }
        }
        if (!foundBold) {
          // No more bold parts, render rest normally
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...textColor);
          doc.text(remaining, xOffset, y + totalHeight);
          remaining = '';
        }
      }
    } else {
      // Normal line
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);
      doc.text(line, x, y + totalHeight);
    }
    totalHeight += lineHeight;
  }

  return totalHeight;
}

// ─── Main PDF generator ──────────────────────────────────────────────
export async function generatePDF(
  content: string,
  modeKey: ModeKey,
  question: string
) {
  const jsPDF = await loadJsPDF();
  const mode = modes[modeKey];
  const colors = MODE_COLORS[modeKey];
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 0;

  const addPageDecoration = () => {
    // Subtle background
    doc.setFillColor(252, 252, 253);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Top accent bar
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Left accent stripe
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, 3, pageHeight, 'F');

    // Diagonal watermark
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(230, 230, 235);
    doc.text('MiniMind', pageWidth / 2, pageHeight / 2, {
      angle: 45,
      align: 'center',
    });

    // Footer bar
    doc.setFillColor(245, 245, 248);
    doc.rect(0, pageHeight - 18, pageWidth, 18, 'F');
    doc.setDrawColor(220, 220, 225);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    // Footer text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 140, 150);
    doc.text('Generated by MiniMind  |  Your AI Learning Companion', margin, pageHeight - 8);
    doc.text(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), pageWidth - margin, pageHeight - 8, { align: 'right' });
  };

  const checkNewPage = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - 28) {
      doc.addPage();
      addPageDecoration();
      yPos = 18;
      return true;
    }
    return false;
  };

  // ═══ PAGE 1 HEADER ═══
  addPageDecoration();
  yPos = 16;

  // Mode banner
  doc.setFillColor(...colors.light);
  doc.roundedRect(margin, yPos, contentWidth, 28, 4, 4, 'F');
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, yPos, contentWidth, 28, 4, 4, 'S');

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.accent);
  doc.text(`${mode.name} Mode`, margin + 10, yPos + 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 110);
  doc.text(mode.tagline, margin + 10, yPos + 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('MiniMind', pageWidth - margin - 10, yPos + 13, { align: 'right' });

  yPos += 36;

  // ── Question card ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 50);
  const cleanQuestion = stripMarkdown(question);
  const questionLines: string[] = doc.splitTextToSize(cleanQuestion, contentWidth - 16);
  const questionBoxHeight = 22 + questionLines.length * 4.5;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, yPos, contentWidth, questionBoxHeight, 3, 3, 'F');
  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, yPos, contentWidth, questionBoxHeight, 3, 3, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.primary);
  doc.text('QUESTION', margin + 8, yPos + 8);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 50);
  doc.text(questionLines, margin + 8, yPos + 16);

  yPos += questionBoxHeight + 8;

  // Accent divider
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(1.2);
  doc.line(margin, yPos, margin + 40, yPos);
  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.3);
  doc.line(margin + 42, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // ═══ ANSWER CONTENT ═══
  const blocks = parseContentToBlocks(content);

  for (const block of blocks) {
    switch (block.type) {
      case 'emoji-heading': {
        checkNewPage(18);
        doc.setFillColor(...colors.light);
        doc.roundedRect(margin, yPos - 3, contentWidth, 12, 2, 2, 'F');
        doc.setDrawColor(...colors.primary);
        doc.setLineWidth(0.4);
        doc.line(margin, yPos - 3, margin, yPos + 9);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.accent);
        // Use a simple marker instead of emoji (emojis don't render in jsPDF)
        doc.text(`> ${block.content}`, margin + 6, yPos + 5);
        yPos += 16;
        break;
      }

      case 'heading': {
        const level = block.level || 2;
        const hSize = level === 1 ? 14 : level === 2 ? 12 : 10;
        checkNewPage(hSize + 8);

        if (level <= 2) {
          doc.setDrawColor(...colors.primary);
          doc.setLineWidth(0.6);
          doc.line(margin, yPos, margin + 20, yPos);
          yPos += 4;
        }

        doc.setFontSize(hSize);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 40);
        const headingLines: string[] = doc.splitTextToSize(block.content, contentWidth);
        doc.text(headingLines, margin, yPos);
        yPos += headingLines.length * (hSize * 0.45) + 6;
        break;
      }

      case 'bullet': {
        checkNewPage(14);
        // Colored bullet dot
        doc.setFillColor(...colors.primary);
        doc.circle(margin + 3, yPos - 1.2, 1.5, 'F');

        const h = renderTextWithBold(
          doc, block.content, block.boldParts || [],
          margin + 9, yPos, contentWidth - 12, 9.5,
          [45, 45, 55], colors.accent
        );
        yPos += h + 3;
        break;
      }

      case 'numbered': {
        checkNewPage(14);
        // Numbered circle
        doc.setFillColor(...colors.primary);
        doc.circle(margin + 4, yPos - 1, 4, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`${block.level}`, margin + 4, yPos + 0.5, { align: 'center' });

        const h = renderTextWithBold(
          doc, block.content, block.boldParts || [],
          margin + 12, yPos, contentWidth - 16, 9.5,
          [45, 45, 55], colors.accent
        );
        yPos += h + 3;
        break;
      }

      case 'divider': {
        checkNewPage(8);
        doc.setDrawColor(210, 210, 215);
        doc.setLineWidth(0.3);
        doc.line(margin + 20, yPos, pageWidth - margin - 20, yPos);
        yPos += 6;
        break;
      }

      case 'paragraph':
      default: {
        checkNewPage(14);
        const h = renderTextWithBold(
          doc, block.content, block.boldParts || [],
          margin, yPos, contentWidth, 9.5,
          [45, 45, 55], colors.accent
        );
        yPos += h + 4;
        break;
      }
    }
  }

  // ── Bottom brand card ──
  if (yPos < pageHeight - 50) {
    yPos = Math.max(yPos + 8, pageHeight - 45);
  } else {
    checkNewPage(35);
    yPos += 8;
  }

  doc.setFillColor(...colors.light);
  doc.roundedRect(margin, yPos, contentWidth, 18, 3, 3, 'F');
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, contentWidth, 18, 3, 3, 'S');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.accent);
  doc.text('MiniMind', margin + 8, yPos + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 110);
  doc.text('AI-powered learning that makes concepts click forever.', margin + 38, yPos + 8);
  doc.setFontSize(7);
  doc.text(`${mode.name} Mode  |  ${new Date().toLocaleDateString('en-IN')}`, margin + 8, yPos + 14);

  return doc;
}

export async function downloadPDF(content: string, modeKey: ModeKey, question: string): Promise<void> {
  const doc = await generatePDF(content, modeKey, question);
  const filename = generateFilename(modeKey, question);
  doc.save(filename);
}

export type SharePlatform = 'whatsapp' | 'email' | 'copy' | 'native' | 'download';

export async function sharePDF(
  content: string,
  modeKey: ModeKey,
  question: string,
  platform: SharePlatform = 'native'
): Promise<boolean> {
  const mode = modes[modeKey];
  const cleanContent = stripMarkdown(content);
  const shareText = `Check out this ${mode.name} explanation from MiniMind:\n\n"${stripMarkdown(question).substring(0, 100)}..."\n\n${cleanContent.substring(0, 500)}...\n\nLearn more at MiniMind`;
  const shareTitle = `MiniMind ${mode.name} - ${stripMarkdown(question).substring(0, 50)}`;

  switch (platform) {
    case 'whatsapp': {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
      return true;
    }

    case 'email': {
      const subject = encodeURIComponent(shareTitle);
      const body = encodeURIComponent(shareText);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      return true;
    }

    case 'copy': {
      try {
        await navigator.clipboard.writeText(shareText);
        return true;
      } catch {
        return false;
      }
    }

    case 'download': {
      await downloadPDF(content, modeKey, question);
      return true;
    }

    case 'native':
    default: {
      const doc = await generatePDF(content, modeKey, question);
      const filename = generateFilename(modeKey, question);
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare) {
        const shareData = {
          title: shareTitle,
          text: `Check out this ${mode.name} explanation from MiniMind: "${stripMarkdown(question).substring(0, 50)}..."`,
          files: [file],
        };

        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            return true;
          } catch (error: any) {
            if (error.name === 'AbortError') return false;
            console.error('Share failed:', error);
          }
        }
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: `Check out this ${mode.name} explanation from MiniMind: "${stripMarkdown(question).substring(0, 50)}..."`,
          });
          await downloadPDF(content, modeKey, question);
          return true;
        } catch (error: any) {
          if (error.name === 'AbortError') return false;
        }
      }

      await downloadPDF(content, modeKey, question);
      return false;
    }
  }
}

function generateFilename(modeKey: ModeKey, question: string): string {
  const mode = modes[modeKey];
  const sanitizedQuestion = question
    .substring(0, 35)
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .trim();

  const timestamp = new Date().toISOString().split('T')[0];
  return `MiniMind_${mode.name}_${sanitizedQuestion || 'answer'}_${timestamp}.pdf`;
}
