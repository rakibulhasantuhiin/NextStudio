import React from 'react';

export type BanglaFontId =
  | 'solaimanlipi'
  | 'noto-sans-bengali'
  | 'tiro-bangla'
  | 'hind-siliguri'
  | 'sonar-bangla';

export type HighlightColorId = 'none' | 'yellow' | 'green' | 'blue' | 'pink' | 'orange';

export interface BanglaFontOption {
  id: BanglaFontId;
  nameEn: string;
  nameBn: string;
  fontFamily: string;
  sampleBn: string;
}

export const DEFAULT_BANGLA_FONT: BanglaFontId = 'solaimanlipi';

export const BANGLA_FONTS: BanglaFontOption[] = [
  {
    id: 'solaimanlipi',
    nameEn: 'SolaimanLipi (Default)',
    nameBn: 'সোলাইমানলিপি (ডিফল্ট)',
    fontFamily: "'SolaimanLipi', 'Noto Serif Bengali', 'Hind Siliguri', serif",
    sampleBn: 'সোলাইমানলিপি',
  },
  {
    id: 'noto-sans-bengali',
    nameEn: 'Noto Sans Bengali',
    nameBn: 'নোটো স্যান্স বাংলা',
    fontFamily: "'Noto Sans Bengali', 'Hind Siliguri', sans-serif",
    sampleBn: 'নোটো স্যান্স বাংলা',
  },
  {
    id: 'tiro-bangla',
    nameEn: 'Tiro Bangla',
    nameBn: 'টিরো বাংলা',
    fontFamily: "'Tiro Bangla', 'Noto Serif Bengali', serif",
    sampleBn: 'টিরো বাংলা',
  },
  {
    id: 'hind-siliguri',
    nameEn: 'Hind Siliguri',
    nameBn: 'হিন্দ শিলিগুড়ি',
    fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
    sampleBn: 'হিন্দ শিলিগুড়ি',
  },
  {
    id: 'sonar-bangla',
    nameEn: 'Sonar Bangla',
    nameBn: 'সোনার বাংলা',
    fontFamily: "'Shonar Bangla', 'Sonar Bangla', 'Noto Serif Bengali', 'Tiro Bangla', serif",
    sampleBn: 'সোনার বাংলা',
  },
];

export const HIGHLIGHT_COLORS: {
  id: HighlightColorId;
  hex: string;
  labelBn: string;
  labelEn: string;
}[] = [
  { id: 'none', hex: 'transparent', labelBn: 'হাইলাইট নেই', labelEn: 'No Highlight' },
  { id: 'yellow', hex: '#fef08a', labelBn: 'হলুদ', labelEn: 'Yellow' },
  { id: 'green', hex: '#bbf7d0', labelBn: 'সবুজ', labelEn: 'Green' },
  { id: 'blue', hex: '#bfdbfe', labelBn: 'নীল', labelEn: 'Blue' },
  { id: 'pink', hex: '#fbcfe8', labelBn: 'গোলাপি', labelEn: 'Pink' },
  { id: 'orange', hex: '#fed7aa', labelBn: 'কমলা', labelEn: 'Orange' },
];

export function getBanglaFontStack(fontId?: BanglaFontId): string {
  const found = BANGLA_FONTS.find((f) => f.id === (fontId || DEFAULT_BANGLA_FONT));
  return found ? found.fontFamily : BANGLA_FONTS[0].fontFamily;
}

export function getHighlightHex(color?: HighlightColorId): string {
  if (!color || color === 'none') return 'transparent';
  const found = HIGHLIGHT_COLORS.find((c) => c.id === color);
  return found ? found.hex : '#fef08a';
}

export type InlineFormatAction = 'bold' | 'italic' | 'underline' | 'highlight';

/**
 * Safely wraps/unwraps selected text (or the full field if no substring is selected)
 * with lightweight reversible rich-text markers.
 */
export function applyInlineFormatToValue(
  value: string,
  selStart: number,
  selEnd: number,
  action: InlineFormatAction,
  highlightColor: HighlightColorId = 'yellow'
): { nextValue: string; nextStart: number; nextEnd: number } {
  const hasSelection = selEnd > selStart;
  const start = hasSelection ? selStart : 0;
  const end = hasSelection ? selEnd : value.length;
  const target = value.slice(start, end);

  if (!target) {
    return { nextValue: value, nextStart: selStart, nextEnd: selEnd };
  }

  let openTag = '';
  let closeTag = '';

  if (action === 'bold') {
    openTag = '**';
    closeTag = '**';
  } else if (action === 'italic') {
    openTag = '~~';
    closeTag = '~~';
  } else if (action === 'underline') {
    openTag = '__';
    closeTag = '__';
  } else if (action === 'highlight') {
    if (highlightColor === 'none') {
      // Strip any existing highlight markers from selection
      const cleaned = target.replace(/==(?:[a-z]+:)?([\s\S]*?)==/g, '$1');
      const nextValue = value.slice(0, start) + cleaned + value.slice(end);
      return { nextValue, nextStart: start, nextEnd: start + cleaned.length };
    }
    openTag = `==${highlightColor}:`;
    closeTag = '==';
  }

  // Toggle off if already wrapped with the exact tags
  if (
    target.startsWith(openTag) &&
    target.endsWith(closeTag) &&
    target.length > openTag.length + closeTag.length
  ) {
    const unwrapped = target.slice(openTag.length, target.length - closeTag.length);
    const nextValue = value.slice(0, start) + unwrapped + value.slice(end);
    return { nextValue, nextStart: start, nextEnd: start + unwrapped.length };
  }

  // If applying a highlight color to text already wrapped in another highlight color, replace color
  if (action === 'highlight') {
    const existingHl = target.match(/^==(?:[a-z]+:)?([\s\S]*?)==$/);
    if (existingHl) {
      const replaced = `${openTag}${existingHl[1]}${closeTag}`;
      const nextValue = value.slice(0, start) + replaced + value.slice(end);
      return { nextValue, nextStart: start, nextEnd: start + replaced.length };
    }
  }

  const wrapped = `${openTag}${target}${closeTag}`;
  const nextValue = value.slice(0, start) + wrapped + value.slice(end);
  return { nextValue, nextStart: start, nextEnd: start + wrapped.length };
}

/**
 * Strips formatting markers when plain text is needed (e.g. filenames or numeric parsing)
 */
export function stripRichTextMarkers(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/==(?:[a-z]+:)?([\s\S]*?)==/g, '$1')
    .replace(/\*\*([\s\S]*?)\*\*/g, '$1')
    .replace(/__([\s\S]*?)__/g, '$1')
    .replace(/~~([\s\S]*?)~~/g, '$1');
}

const TOKEN_REGEX =
  /(\*\*[\s\S]+?\*\*|__[\s\S]+?__|~~[\s\S]+?~~|==(?:yellow|green|blue|pink|orange):[\s\S]+?==|==[\s\S]+?==)/;

/**
 * Safe recursive React rich-text renderer (no dangerouslySetInnerHTML).
 * Supports manual Bold (**), Italic (~~), Underline (__), and Colored Highlighter (==color:...==).
 */
export function renderRichText(raw: string, keyPrefix = 'rt'): React.ReactNode {
  if (!raw) return null;
  // Fast path if no rich-text delimiters exist
  if (
    !raw.includes('**') &&
    !raw.includes('__') &&
    !raw.includes('~~') &&
    !raw.includes('==')
  ) {
    return raw;
  }

  const nodes: React.ReactNode[] = [];
  let remaining = raw;
  let idx = 0;

  while (remaining.length > 0) {
    const match = TOKEN_REGEX.exec(remaining);
    if (!match || match.index === undefined) {
      nodes.push(remaining);
      break;
    }

    if (match.index > 0) {
      nodes.push(remaining.slice(0, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${idx++}`;

    if (token.startsWith('**') && token.endsWith('**')) {
      const inner = token.slice(2, -2);
      nodes.push(
        <strong key={key} className="rt-bold">
          {renderRichText(inner, `${key}-b`)}
        </strong>
      );
    } else if (token.startsWith('__') && token.endsWith('__')) {
      const inner = token.slice(2, -2);
      nodes.push(
        <u key={key} className="rt-underline">
          {renderRichText(inner, `${key}-u`)}
        </u>
      );
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      const inner = token.slice(2, -2);
      nodes.push(
        <em key={key} className="rt-italic">
          {renderRichText(inner, `${key}-i`)}
        </em>
      );
    } else if (token.startsWith('==') && token.endsWith('==')) {
      const colorMatch = token.match(/^==(yellow|green|blue|pink|orange):([\s\S]+)==$/);
      const colorId: HighlightColorId = colorMatch
        ? (colorMatch[1] as HighlightColorId)
        : 'yellow';
      const inner = colorMatch ? colorMatch[2] : token.slice(2, -2);
      nodes.push(
        <mark
          key={key}
          className="rt-mark"
          style={{
            backgroundColor: getHighlightHex(colorId),
            color: 'inherit',
            padding: '0 2px',
            borderRadius: '2px',
          }}
        >
          {renderRichText(inner, `${key}-h`)}
        </mark>
      );
    } else {
      nodes.push(token);
    }

    remaining = remaining.slice(match.index + token.length);
  }

  return nodes;
}
