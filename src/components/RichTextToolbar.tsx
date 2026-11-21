import React, { useState } from 'react';
import { Bold, Highlighter, Italic, Type, Underline } from 'lucide-react';
import {
  BANGLA_FONTS,
  BanglaFontId,
  DEFAULT_BANGLA_FONT,
  HIGHLIGHT_COLORS,
  HighlightColorId,
  InlineFormatAction,
  getHighlightHex,
} from '../utils/richText';

interface DocumentTypographyBarProps {
  lang: 'bn' | 'en';
  fontFamily: BanglaFontId;
  onChangeFontFamily: (font: BanglaFontId) => void;
  fontSizePx: number;
  onChangeFontSizePx: (size: number) => void;
  minFontSize?: number;
  maxFontSize?: number;
  bold: boolean;
  onToggleBold: () => void;
  italic: boolean;
  onToggleItalic: () => void;
  underline: boolean;
  onToggleUnderline: () => void;
  highlight: HighlightColorId;
  onChangeHighlight: (color: HighlightColorId) => void;
  compact?: boolean;
}

/**
 * Full Liquid Glass typography & formatting strip for Ready Docs and CV Maker toolbars (Desktop & Mobile)
 */
export const DocumentTypographyBar: React.FC<DocumentTypographyBarProps> = ({
  lang,
  fontFamily,
  onChangeFontFamily,
  fontSizePx,
  onChangeFontSizePx,
  minFontSize = 10,
  maxFontSize = 22,
  bold,
  onToggleBold,
  italic,
  onToggleItalic,
  underline,
  onToggleUnderline,
  highlight,
  onChangeHighlight,
  compact = false,
}) => {
  const isBn = lang === 'bn';
  const [showHlMenu, setShowHlMenu] = useState(false);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Bangla Font Family Selector */}
      <div className="flex items-center gap-1 glass-track px-2 py-1 rounded-xl shrink-0">
        <Type className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <select
          value={fontFamily || DEFAULT_BANGLA_FONT}
          onChange={(e) => onChangeFontFamily(e.target.value as BanglaFontId)}
          title={isBn ? 'বাংলা ফন্ট সিলেক্ট করুন' : 'Select Bangla Font'}
          aria-label={isBn ? 'বাংলা ফন্ট সিলেক্ট করুন' : 'Select Bangla Font'}
          className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer max-w-[148px] sm:max-w-[170px]"
        >
          {BANGLA_FONTS.map((f) => (
            <option
              key={f.id}
              value={f.id}
              style={{ fontFamily: f.fontFamily }}
              className="text-slate-900 bg-white"
            >
              {isBn ? f.nameBn : f.nameEn}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size Controls (অ- / 14px / অ+) */}
      <div className="flex items-center gap-0.5 glass-track p-0.5 rounded-xl shrink-0">
        <button
          type="button"
          onClick={() =>
            onChangeFontSizePx(Math.max(minFontSize, Math.round((fontSizePx - 1) * 10) / 10))
          }
          className="px-2 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
          title={isBn ? 'ফন্ট ছোট করুন' : 'Decrease Font Size'}
        >
          {isBn ? 'অ-' : 'A-'}
        </button>
        <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 px-1 min-w-[32px] text-center tabular-nums">
          {fontSizePx}
        </span>
        <button
          type="button"
          onClick={() =>
            onChangeFontSizePx(Math.min(maxFontSize, Math.round((fontSizePx + 1) * 10) / 10))
          }
          className="glass-btn-primary px-2 py-1 rounded-lg text-xs font-bold text-white cursor-pointer"
          title={isBn ? 'ফন্ট বড় করুন' : 'Increase Font Size'}
        >
          {isBn ? 'অ+' : 'A+'}
        </button>
      </div>

      {/* Bold / Italic / Underline / Highlighter Strip */}
      <div className="flex items-center gap-0.5 glass-track p-0.5 rounded-xl shrink-0 relative">
        <button
          type="button"
          onClick={onToggleBold}
          className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-0.5 ${
            bold
              ? 'glass-btn-primary text-white'
              : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10'
          }`}
          title={isBn ? 'বোল্ড (Bold) — সব বাংলা ফন্টে কাজ করে' : 'Manual Bold (All Bangla Fonts)'}
          aria-pressed={bold}
        >
          <Bold className="w-3.5 h-3.5" />
          {!compact && <span className="hidden xl:inline text-[11px] font-bold">B</span>}
        </button>

        <button
          type="button"
          onClick={onToggleItalic}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            italic
              ? 'glass-btn-primary text-white'
              : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10'
          }`}
          title={isBn ? 'ইটালিক (Italic)' : 'Italic'}
          aria-pressed={italic}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleUnderline}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            underline
              ? 'glass-btn-primary text-white'
              : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10'
          }`}
          title={isBn ? 'আন্ডারলাইন (Underline)' : 'Underline'}
          aria-pressed={underline}
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        {/* Highlighter Swatch Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowHlMenu((v) => !v)}
            className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
              highlight !== 'none'
                ? 'ring-1 ring-amber-500/80 text-slate-900'
                : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10'
            }`}
            style={
              highlight !== 'none'
                ? { backgroundColor: getHighlightHex(highlight) }
                : undefined
            }
            title={isBn ? 'হাইলাইটার (Highlighter)' : 'Highlighter Color'}
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>

          {showHlMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowHlMenu(false)} />
              <div className="glass-dropdown absolute right-0 sm:left-0 mt-2 p-2 rounded-2xl z-40 flex items-center gap-1.5">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChangeHighlight(c.id);
                      setShowHlMenu(false);
                    }}
                    className={`w-6 h-6 rounded-full border transition cursor-pointer flex items-center justify-center text-[10px] font-bold ${
                      highlight === c.id
                        ? 'ring-2 ring-blue-500 scale-110 border-slate-900'
                        : 'border-slate-300 dark:border-white/25 hover:scale-110'
                    }`}
                    style={{
                      backgroundColor: c.id === 'none' ? '#ffffff' : c.hex,
                      color: '#0f172a',
                    }}
                    title={isBn ? c.labelBn : c.labelEn}
                  >
                    {c.id === 'none' ? '✕' : ''}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface InlineTextFormatBarProps {
  lang: 'bn' | 'en';
  onFormat: (action: InlineFormatAction, color?: HighlightColorId) => void;
}

/**
 * Compact per-field / selected-text Rich Formatting bar inside Field Editor Modals
 */
export const InlineTextFormatBar: React.FC<InlineTextFormatBarProps> = ({ lang, onFormat }) => {
  const isBn = lang === 'bn';

  return (
    <div className="flex items-center justify-between gap-2 flex-wrap glass-track px-2 py-1.5 rounded-xl">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onFormat('bold')}
          className="px-2 py-1 rounded-lg glass-tile text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1 cursor-pointer active:scale-95 transition"
          title={isBn ? 'সিলেক্ট করা লেখা বোল্ড করুন' : 'Bold selected text (or entire field)'}
        >
          <Bold className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isBn ? 'বোল্ড' : 'Bold'}</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onFormat('italic')}
          className="px-2 py-1 rounded-lg glass-tile text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1 cursor-pointer active:scale-95 transition"
          title={isBn ? 'সিলেক্ট করা লেখা ইটালিক করুন' : 'Italic selected text'}
        >
          <Italic className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isBn ? 'ইটালিক' : 'Italic'}</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onFormat('underline')}
          className="px-2 py-1 rounded-lg glass-tile text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1 cursor-pointer active:scale-95 transition"
          title={isBn ? 'আন্ডারলাইন করুন' : 'Underline selected text'}
        >
          <Underline className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isBn ? 'দাগ' : 'Underline'}</span>
        </button>
      </div>

      {/* Inline Highlighter Swatches */}
      <div className="flex items-center gap-1">
        <Highlighter className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mr-0.5 shrink-0" />
        {HIGHLIGHT_COLORS.filter((c) => c.id !== 'none').map((c) => (
          <button
            key={c.id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onFormat('highlight', c.id)}
            className="w-5 h-5 rounded-full border border-slate-400/60 hover:scale-110 transition cursor-pointer shrink-0"
            style={{ backgroundColor: c.hex }}
            title={`${isBn ? 'হাইলাইট:' : 'Highlight:'} ${isBn ? c.labelBn : c.labelEn}`}
          />
        ))}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onFormat('highlight', 'none')}
          className="px-1.5 py-0.5 rounded-md glass-tile text-[10px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
          title={isBn ? 'হাইলাইট মুছুন' : 'Clear Highlight'}
        >
          ✕
        </button>
      </div>
    </div>
  );
};
