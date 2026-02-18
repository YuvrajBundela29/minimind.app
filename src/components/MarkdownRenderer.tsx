import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const parseMarkdown = (text: string): React.ReactNode[] => {
    // Split into lines for block-level processing
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = () => {
      if (listItems.length > 0 && listType) {
        const ListTag = listType;
        elements.push(
          <ListTag key={`list-${elements.length}`} className={listType === 'ul' ? 'list-disc pl-5 my-2 space-y-1' : 'list-decimal pl-5 my-2 space-y-1'}>
            {listItems.map((item, i) => (
              <li key={i} className="text-muted-foreground">{parseInline(item)}</li>
            ))}
          </ListTag>
        );
        listItems = [];
        listType = null;
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Empty line
      if (!trimmedLine) {
        flushList();
        return;
      }

      // Headings with ^^ or # syntax
      if (trimmedLine.startsWith('^^') && trimmedLine.endsWith('^^')) {
        flushList();
        const headingText = trimmedLine.slice(2, -2);
        elements.push(
          <h3 key={index} className="text-lg font-heading font-semibold text-foreground mt-4 mb-2">
            {parseInline(headingText)}
          </h3>
        );
        return;
      }

      // H1
      if (trimmedLine.startsWith('# ')) {
        flushList();
        elements.push(
          <h2 key={index} className="text-xl font-heading font-bold text-foreground mt-4 mb-2">
            {parseInline(trimmedLine.slice(2))}
          </h2>
        );
        return;
      }

      // H2
      if (trimmedLine.startsWith('## ')) {
        flushList();
        elements.push(
          <h3 key={index} className="text-lg font-heading font-semibold text-foreground mt-3 mb-2">
            {parseInline(trimmedLine.slice(3))}
          </h3>
        );
        return;
      }

      // H3
      if (trimmedLine.startsWith('### ')) {
        flushList();
        elements.push(
          <h4 key={index} className="text-base font-heading font-semibold text-foreground mt-3 mb-1">
            {parseInline(trimmedLine.slice(4))}
          </h4>
        );
        return;
      }

      // H4
      if (trimmedLine.startsWith('#### ')) {
        flushList();
        elements.push(
          <h5 key={index} className="text-sm font-heading font-semibold text-foreground mt-2 mb-1">
            {parseInline(trimmedLine.slice(5))}
          </h5>
        );
        return;
      }

      // Horizontal rule
      if (/^[-*_]{3,}$/.test(trimmedLine)) {
        flushList();
        elements.push(<hr key={index} className="my-4 border-border" />);
        return;
      }

      // Unordered list items
      if (/^[-*•]\s/.test(trimmedLine)) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        listItems.push(trimmedLine.replace(/^[-*•]\s/, ''));
        return;
      }

      // Ordered list items
      if (/^\d+[.)]\s/.test(trimmedLine)) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        listItems.push(trimmedLine.replace(/^\d+[.)]\s/, ''));
        return;
      }

      // Regular paragraph
      flushList();
      elements.push(
        <p key={index} className="text-muted-foreground leading-relaxed mb-2">
          {parseInline(trimmedLine)}
        </p>
      );
    });

    flushList();
    return elements;
  };

  // Convert LaTeX-like commands to readable symbols
  const formatMathExpression = (expr: string): string => {
    return expr
      .replace(/\\angle\s*/g, '∠')
      .replace(/\\cos\s*/g, 'cos ')
      .replace(/\\sin\s*/g, 'sin ')
      .replace(/\\tan\s*/g, 'tan ')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\\sqrt\s*/g, '√')
      .replace(/\\pi/g, 'π')
      .replace(/\\theta/g, 'θ')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\delta/g, 'δ')
      .replace(/\\infty/g, '∞')
      .replace(/\\pm/g, '±')
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\neq/g, '≠')
      .replace(/\\leq/g, '≤')
      .replace(/\\geq/g, '≥')
      .replace(/\\approx/g, '≈')
      .replace(/\\circ/g, '°')
      .replace(/\\degree/g, '°')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
      .replace(/\^(\{[^}]+\})/g, (_, exp) => {
        const inner = exp.slice(1, -1);
        return toSuperscript(inner);
      })
      .replace(/\^(\d+)/g, (_, exp) => toSuperscript(exp))
      .replace(/\^([a-zA-Z])/g, (_, exp) => toSuperscript(exp))
      .replace(/_(\{[^}]+\})/g, (_, sub) => {
        const inner = sub.slice(1, -1);
        return toSubscript(inner);
      })
      .replace(/_(\d+)/g, (_, sub) => toSubscript(sub))
      .replace(/_([a-zA-Z])/g, (_, sub) => toSubscript(sub))
      .replace(/\\\\/g, '')
      .replace(/\\,/g, ' ')
      .replace(/\\;/g, ' ')
      .replace(/\\quad/g, '  ')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\left/g, '')
      .replace(/\\right/g, '')
      .trim();
  };

  const toSuperscript = (str: string): string => {
    const superMap: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      'n': 'ⁿ', 'i': 'ⁱ', '+': '⁺', '-': '⁻', '=': '⁼',
      '(': '⁽', ')': '⁾', 'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ',
      'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ',
      'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'o': 'ᵒ', 'p': 'ᵖ',
      'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ',
      'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
    };
    return str.split('').map(c => superMap[c] || c).join('');
  };

  const toSubscript = (str: string): string => {
    const subMap: Record<string, string> = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
      'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
      'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
      'v': 'ᵥ', 'x': 'ₓ', '+': '₊', '-': '₋', '=': '₌',
      '(': '₍', ')': '₎',
    };
    return str.split('').map(c => subMap[c] || c).join('');
  };

  // Also format inline math-like patterns outside of $...$ (e.g. c^2, a^2)
  const formatInlineMathPatterns = (text: string): string => {
    return text
      .replace(/(\b[a-zA-Z])(\^)(\d+)/g, (_, letter, _caret, exp) => letter + toSuperscript(exp))
      .replace(/(\b[a-zA-Z])(\^)\{([^}]+)\}/g, (_, letter, _caret, exp) => letter + toSuperscript(exp))
      .replace(/\\angle\s*/g, '∠')
      .replace(/\\cos\s*/g, 'cos ')
      .replace(/\\sin\s*/g, 'sin ')
      .replace(/\\tan\s*/g, 'tan ')
      .replace(/\\circ/g, '°')
      .replace(/\\pi/g, 'π')
      .replace(/\\theta/g, 'θ')
      .replace(/\\times/g, '×');
  };

  const parseInline = (text: string): React.ReactNode => {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyCounter = 0;

    // Simple approach: process text step by step
    let processedText = remaining;
    
    // Bold **text**
    processedText = processedText.replace(/\*\*(.+?)\*\*/g, '⟨BOLD⟩$1⟨/BOLD⟩');
    // Bold __text__
    processedText = processedText.replace(/__(.+?)__/g, '⟨BOLD⟩$1⟨/BOLD⟩');
    // Italic *text* (not preceded/followed by *)
    processedText = processedText.replace(/(?<!\*)(?<![⟨/])\*([^*]+?)\*(?!\*)/g, '⟨ITALIC⟩$1⟨/ITALIC⟩');
    // Italic _text_
    processedText = processedText.replace(/(?<!_)_([^_]+?)_(?!_)/g, '⟨ITALIC⟩$1⟨/ITALIC⟩');
    // Code `text`
    processedText = processedText.replace(/`([^`]+)`/g, '⟨CODE⟩$1⟨/CODE⟩');
    // Strikethrough ~~text~~
    processedText = processedText.replace(/~~(.+?)~~/g, '⟨STRIKE⟩$1⟨/STRIKE⟩');
    // Math expressions $..$ and $$..$$
    processedText = processedText.replace(/\$\$(.+?)\$\$/g, (_, expr) => '⟨MATH⟩' + formatMathExpression(expr) + '⟨/MATH⟩');
    processedText = processedText.replace(/\$([^$]+?)\$/g, (_, expr) => '⟨MATH⟩' + formatMathExpression(expr) + '⟨/MATH⟩');
    // Clean up ^^ markers that might remain
    processedText = processedText.replace(/\^\^(.+?)\^\^/g, '⟨HEADING⟩$1⟨/HEADING⟩');

    // Format remaining inline math patterns (like c^2 outside of $...$)
    // Only apply to segments NOT inside markers
    const markerPattern = /⟨[A-Z]+⟩[\s\S]*?⟨\/[A-Z]+⟩/g;
    let lastIndex = 0;
    let formattedText = '';
    let match;
    while ((match = markerPattern.exec(processedText)) !== null) {
      formattedText += formatInlineMathPatterns(processedText.slice(lastIndex, match.index));
      formattedText += match[0];
      lastIndex = match.index + match[0].length;
    }
    formattedText += formatInlineMathPatterns(processedText.slice(lastIndex));
    processedText = formattedText;

    // Now convert markers to React elements
    const segments = processedText.split(/(⟨BOLD⟩|⟨\/BOLD⟩|⟨ITALIC⟩|⟨\/ITALIC⟩|⟨CODE⟩|⟨\/CODE⟩|⟨STRIKE⟩|⟨\/STRIKE⟩|⟨MATH⟩|⟨\/MATH⟩|⟨HEADING⟩|⟨\/HEADING⟩)/);
    
    let inBold = false;
    let inItalic = false;
    let inCode = false;
    let inStrike = false;
    let inMath = false;
    let inHeading = false;

    segments.forEach((segment, idx) => {
      if (segment === '⟨BOLD⟩') { inBold = true; return; }
      if (segment === '⟨/BOLD⟩') { inBold = false; return; }
      if (segment === '⟨ITALIC⟩') { inItalic = true; return; }
      if (segment === '⟨/ITALIC⟩') { inItalic = false; return; }
      if (segment === '⟨CODE⟩') { inCode = true; return; }
      if (segment === '⟨/CODE⟩') { inCode = false; return; }
      if (segment === '⟨STRIKE⟩') { inStrike = true; return; }
      if (segment === '⟨/STRIKE⟩') { inStrike = false; return; }
      if (segment === '⟨MATH⟩') { inMath = true; return; }
      if (segment === '⟨/MATH⟩') { inMath = false; return; }
      if (segment === '⟨HEADING⟩') { inHeading = true; return; }
      if (segment === '⟨/HEADING⟩') { inHeading = false; return; }

      if (!segment) return;

      if (inBold) {
        parts.push(<strong key={idx} className="font-semibold text-foreground">{segment}</strong>);
      } else if (inItalic) {
        parts.push(<em key={idx} className="italic">{segment}</em>);
      } else if (inCode) {
        parts.push(<code key={idx} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{segment}</code>);
      } else if (inStrike) {
        parts.push(<del key={idx} className="line-through opacity-70">{segment}</del>);
      } else if (inMath) {
        parts.push(
          <span key={idx} className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded-md bg-primary/5 border border-primary/15 font-mono text-sm font-semibold text-foreground tracking-wide">
            {segment}
          </span>
        );
      } else if (inHeading) {
        parts.push(<strong key={idx} className="font-semibold text-foreground">{segment}</strong>);
      } else {
        parts.push(segment);
      }
    });

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={`markdown-content ${className}`}>
      {parseMarkdown(content)}
    </div>
  );
};

export default MarkdownRenderer;
