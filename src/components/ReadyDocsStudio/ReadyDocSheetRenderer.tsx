import React from 'react';
import { Camera, Plus, Trash2 } from 'lucide-react';
import {
  ReadyDocBlock,
  ReadyDocField,
  ReadyDocTemplate,
} from '../../types/readyDocs';
import {
  ReadyDocPaperSpec,
  toBanglaDigits,
  toEnglishDigits,
} from '../../utils/readyDocs';
import {
  BanglaFontId,
  DEFAULT_BANGLA_FONT,
  HighlightColorId,
  getBanglaFontStack,
  getHighlightHex,
  renderRichText,
} from '../../utils/richText';

interface ReadyDocSheetRendererProps {
  template: ReadyDocTemplate;
  paper: ReadyDocPaperSpec;
  values: Record<string, string>;
  tableRows: string[][];
  photoSrc?: string;
  fontFamily?: BanglaFontId;
  fontSizePx: number;
  lineHeight: number;
  textBold?: boolean;
  textItalic?: boolean;
  textUnderline?: boolean;
  textHighlight?: HighlightColorId;
  stampTopMm: number;
  showHeader: boolean;
  showBorder: boolean;
  showPageNumber: boolean;
  interactive?: boolean;
  activeFieldKey?: string | null;
  onClickField?: (fieldKey: string) => void;
  onUpdateTableCell?: (rowIdx: number, colIdx: number, value: string) => void;
  onAddTableRow?: () => void;
  onRemoveTableRow?: (rowIdx: number) => void;
  onClickPhoto?: () => void;
}

const MM_TO_PX = 3.7795275591;

export const ReadyDocSheetRenderer: React.FC<ReadyDocSheetRendererProps> = ({
  template,
  paper,
  values,
  tableRows,
  photoSrc,
  fontFamily = DEFAULT_BANGLA_FONT,
  fontSizePx,
  lineHeight,
  textBold = false,
  textItalic = false,
  textUnderline = false,
  textHighlight = 'none',
  stampTopMm,
  showHeader,
  showBorder,
  showPageNumber,
  interactive = false,
  activeFieldKey = null,
  onClickField,
  onUpdateTableCell,
  onAddTableRow,
  onRemoveTableRow,
  onClickPhoto,
}) => {
  const fieldMap = React.useMemo(() => {
    const map = new Map<string, ReadyDocField>();
    for (const f of template.fields) {
      map.set(f.key, f);
    }
    return map;
  }, [template.fields]);

  const effectiveStampPx = template.isStampPaper
    ? Math.round(stampTopMm * MM_TO_PX)
    : 0;

  // Render inline text replacing {{key}} with interactive clickable tokens or clean print text
  const renderInterpolated = (raw: string): React.ReactNode => {
    const parts = raw.split(/(\{\{[a-zA-Z0-9_]+\}\})/g);
    return parts.map((part, idx) => {
      const match = part.match(/^\{\{([a-zA-Z0-9_]+)\}\}$/);
      if (!match) {
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      }
      const key = match[1];
      const field = fieldMap.get(key);
      const val = (values[key] || '').trim();
      const label = field?.label || key;

      if (!interactive) {
        if (val) {
          return (
            <span
              key={idx}
              style={
                textHighlight !== 'none'
                  ? {
                      backgroundColor: getHighlightHex(textHighlight),
                      padding: '0 2px',
                      borderRadius: '2px',
                    }
                  : undefined
              }
            >
              {renderRichText(val, `rd-${key}-${idx}`)}
            </span>
          );
        }
        return (
          <span
            key={idx}
            style={{
              display: 'inline-block',
              minWidth: '64px',
              borderBottom: '1px dotted #475569',
            }}
          >
            &nbsp;
          </span>
        );
      }

      const isActive = activeFieldKey === key;

      if (val) {
        return (
          <span
            key={idx}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onClickField?.(key);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClickField?.(key);
              }
            }}
            style={{
              borderBottom: isActive ? '2px solid #2563eb' : '1.5px dotted #3b82f6',
              backgroundColor:
                textHighlight !== 'none'
                  ? getHighlightHex(textHighlight)
                  : isActive
                  ? 'rgba(59, 130, 246, 0.14)'
                  : 'rgba(59, 130, 246, 0.05)',
              color: '#0f172a',
              borderRadius: '3px',
              padding: '0 3px',
              cursor: 'pointer',
              transition: 'background-color 140ms ease',
            }}
            title={label}
          >
            {renderRichText(val, `rdi-${key}-${idx}`)}
          </span>
        );
      }

      return (
        <span
          key={idx}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onClickField?.(key);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClickField?.(key);
            }
          }}
          style={{
            display: 'inline-block',
            backgroundColor: isActive ? '#fde68a' : '#fef3c7',
            border: isActive ? '1.5px solid #2563eb' : '1px dashed #d97706',
            color: '#92400e',
            borderRadius: '4px',
            padding: '0px 6px',
            margin: '0 1px',
            fontSize: `${Math.max(11, fontSizePx - 1)}px`,
            lineHeight: 1.45,
            cursor: 'pointer',
            fontWeight: 500,
          }}
          title={field?.hint ? `${label} — ${field.hint}` : label}
        >
          {label}
        </span>
      );
    });
  };

  const computeColumnSum = (colIdx: number): string => {
    let total = 0;
    for (const row of tableRows) {
      const cell = (row[colIdx] || '').trim();
      if (!cell) continue;
      const normalized = toEnglishDigits(cell).replace(/[^0-9.-]/g, '');
      const n = parseFloat(normalized);
      if (!Number.isNaN(n)) total += n;
    }
    const formatted = Number.isInteger(total) ? String(total) : total.toFixed(2);
    return template.lang === 'bn' ? toBanglaDigits(formatted) : formatted;
  };

  const renderBlock = (block: ReadyDocBlock, index: number) => {
    switch (block.type) {
      case 'header': {
        if (block.optionalHeader && !showHeader) return null;
        return (
          <div
            key={index}
            style={{
              textAlign: block.align || 'center',
              paddingBottom: block.underline ? '10px' : '4px',
              marginBottom: '14px',
              borderBottom: block.underline ? '2px solid #0f172a' : 'none',
            }}
          >
            <div
              style={{
                fontSize: `${fontSizePx + 6}px`,
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.35,
              }}
            >
              {renderInterpolated(block.title)}
            </div>
            {block.subtitle && (
              <div
                style={{
                  fontSize: `${Math.max(11, fontSizePx - 1)}px`,
                  color: '#334155',
                  marginTop: '3px',
                }}
              >
                {renderInterpolated(block.subtitle)}
              </div>
            )}
          </div>
        );
      }

      case 'dateLine': {
        return (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: block.refText
                ? 'space-between'
                : block.align === 'right'
                ? 'flex-end'
                : 'flex-start',
              alignItems: 'center',
              marginBottom: '12px',
              fontSize: `${fontSizePx}px`,
              color: '#0f172a',
              gap: '12px',
            }}
          >
            {block.refText && <div>{renderInterpolated(block.refText)}</div>}
            <div>{renderInterpolated(block.text)}</div>
          </div>
        );
      }

      case 'recipient': {
        return (
          <div
            key={index}
            style={{
              marginBottom: '14px',
              lineHeight: Math.max(1.55, lineHeight - 0.1),
            }}
          >
            {block.lines.map((line, lIdx) => (
              <div key={lIdx}>{renderInterpolated(line)}</div>
            ))}
          </div>
        );
      }

      case 'subject': {
        return (
          <div
            key={index}
            style={{
              marginBottom: '14px',
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            <span>{block.label} </span>
            <span>{renderInterpolated(block.text)}</span>
          </div>
        );
      }

      case 'salutation': {
        return (
          <div key={index} style={{ marginBottom: '8px' }}>
            {renderInterpolated(block.text)}
          </div>
        );
      }

      case 'heading': {
        return (
          <div
            key={index}
            style={{
              textAlign: block.align || 'center',
              marginTop: '6px',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                fontSize: `${fontSizePx + 4}px`,
                fontWeight: 700,
                color: '#0f172a',
                padding: block.boxed ? '4px 18px' : '0',
                border: block.boxed ? '1.5px solid #0f172a' : 'none',
                borderRadius: block.boxed ? '4px' : '0',
                letterSpacing: '0.01em',
              }}
            >
              {renderInterpolated(block.text)}
            </span>
          </div>
        );
      }

      case 'paragraph': {
        return (
          <p
            key={index}
            style={{
              marginBottom: '12px',
              textIndent: block.indent ? '32px' : '0px',
              fontWeight: block.bold ? 700 : 400,
              textAlign: block.align || 'justify',
              color: '#0f172a',
            }}
          >
            {renderInterpolated(block.text)}
          </p>
        );
      }

      case 'numberedList': {
        return (
          <div key={index} style={{ marginBottom: '14px' }}>
            {block.title && (
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: '6px',
                  textDecoration: 'underline',
                }}
              >
                {renderInterpolated(block.title)}
              </div>
            )}
            <ol
              style={{
                listStyleType: 'none',
                paddingLeft: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '7px',
              }}
            >
              {block.items.map((item, i) => {
                const numLabel =
                  template.lang === 'bn' ? `${toBanglaDigits(i + 1)}।` : `${i + 1}.`;
                return (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      textAlign: 'justify',
                    }}
                  >
                    <span style={{ fontWeight: 700, minWidth: '24px', flexShrink: 0 }}>
                      {numLabel}
                    </span>
                    <span style={{ flex: 1 }}>{renderInterpolated(item)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      }

      case 'keyValueGrid': {
        const cols = block.columns || 1;
        return (
          <div key={index} style={{ marginBottom: '14px' }}>
            {block.title && (
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: '6px',
                  fontSize: `${fontSizePx}px`,
                }}
              >
                {renderInterpolated(block.title)}
              </div>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: cols === 2 ? '1fr 1fr' : '1fr',
                border: block.bordered ? '1px solid #334155' : 'none',
              }}
            >
              {block.rows.map((row, rIdx) => (
                <div
                  key={rIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '8px',
                    padding: block.bordered ? '6px 10px' : '3px 0',
                    borderBottom: block.bordered ? '1px solid #cbd5e1' : 'none',
                    borderRight:
                      block.bordered && cols === 2 && rIdx % 2 === 0
                        ? '1px solid #cbd5e1'
                        : 'none',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      minWidth: cols === 2 ? '110px' : '175px',
                      flexShrink: 0,
                      color: '#1e293b',
                    }}
                  >
                    {row.label}:
                  </span>
                  <span style={{ flex: 1, color: '#0f172a' }}>
                    {renderInterpolated(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'photoRow': {
        return (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '16px',
              paddingBottom: '12px',
              marginBottom: '14px',
              borderBottom: '2px solid #0f172a',
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: `${fontSizePx + 6}px`,
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                {renderInterpolated(block.title)}
              </div>
              {block.subtitle && (
                <div style={{ fontSize: `${Math.max(11, fontSizePx - 1)}px`, color: '#334155', marginTop: '2px' }}>
                  {renderInterpolated(block.subtitle)}
                </div>
              )}
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {block.infoLines.map((line, idx) => (
                  <div key={idx} style={{ fontWeight: idx === 0 ? 700 : 500 }}>
                    {renderInterpolated(line)}
                  </div>
                ))}
              </div>
            </div>

            <div
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              onClick={interactive ? onClickPhoto : undefined}
              style={{
                width: '104px',
                height: '124px',
                border: interactive ? '1.5px dashed #d97706' : '1px solid #334155',
                backgroundColor: photoSrc
                  ? '#ffffff'
                  : interactive
                  ? '#fffbeb'
                  : '#ffffff',
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: interactive ? 'pointer' : 'default',
                textAlign: 'center',
                padding: photoSrc ? '0' : '6px',
              }}
            >
              {photoSrc ? (
                <img
                  src={photoSrc}
                  alt="Photo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <>
                  {interactive && (
                    <Camera
                      style={{ width: '20px', height: '20px', color: '#b45309', marginBottom: '4px' }}
                    />
                  )}
                  <span style={{ fontSize: '11px', color: interactive ? '#92400e' : '#64748b' }}>
                    {block.photoLabel || 'পাসপোর্ট ছবি'}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      }

      case 'table': {
        const rows = tableRows.length > 0 ? tableRows : [block.columns.map(() => '')];
        const cellPad = block.compact ? '4px 5px' : '6px 8px';
        const tableFontSize = block.compact ? Math.max(10, fontSizePx - 3) : Math.max(11, fontSizePx - 1);

        return (
          <div key={index} style={{ marginBottom: '14px' }}>
            {block.title && (
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                {renderInterpolated(block.title)}
              </div>
            )}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: `${tableFontSize}px`,
                tableLayout: block.columnWidths ? 'fixed' : 'auto',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  {block.columns.map((col, cIdx) => (
                    <th
                      key={cIdx}
                      style={{
                        border: '1px solid #334155',
                        padding: cellPad,
                        fontWeight: 700,
                        textAlign: 'center',
                        width: block.columnWidths?.[cIdx],
                        color: '#0f172a',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                  {interactive && (
                    <th
                      style={{
                        border: '1px solid #cbd5e1',
                        width: '28px',
                        padding: '2px',
                        backgroundColor: '#fffbeb',
                      }}
                    />
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {block.columns.map((_, cIdx) => (
                      <td
                        key={cIdx}
                        style={{
                          border: '1px solid #334155',
                          padding: interactive ? '2px 3px' : cellPad,
                          textAlign: cIdx === 0 ? 'center' : 'left',
                          color: '#0f172a',
                          minHeight: '24px',
                        }}
                      >
                        {interactive ? (
                          <input
                            type="text"
                            value={row[cIdx] || ''}
                            onChange={(e) => onUpdateTableCell?.(rIdx, cIdx, e.target.value)}
                            style={{
                              width: '100%',
                              border: 'none',
                              outline: 'none',
                              background: 'transparent',
                              fontSize: `${tableFontSize}px`,
                              color: '#0f172a',
                              textAlign: cIdx === 0 ? 'center' : 'left',
                              padding: '2px 3px',
                            }}
                          />
                        ) : (
                          <span>{row[cIdx] || '\u00A0'}</span>
                        )}
                      </td>
                    ))}
                    {interactive && (
                      <td
                        style={{
                          border: '1px solid #cbd5e1',
                          textAlign: 'center',
                          padding: '2px',
                          backgroundColor: '#fffbeb',
                        }}
                      >
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onRemoveTableRow?.(rIdx)}
                            style={{
                              color: '#dc2626',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="সারি মুছুন"
                          >
                            <Trash2 style={{ width: '12px', height: '12px' }} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}

                {block.showTotalRow && (
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                    <td
                      colSpan={Math.max(1, block.columns.length - 1)}
                      style={{
                        border: '1px solid #334155',
                        padding: cellPad,
                        textAlign: 'right',
                        color: '#0f172a',
                      }}
                    >
                      {block.totalLabel || 'সর্বমোট'}
                    </td>
                    <td
                      style={{
                        border: '1px solid #334155',
                        padding: cellPad,
                        textAlign: 'left',
                        color: '#0f172a',
                      }}
                    >
                      {computeColumnSum(
                        block.sumColumnIndex !== undefined
                          ? block.sumColumnIndex
                          : block.columns.length - 1
                      )}
                      /-
                    </td>
                    {interactive && <td style={{ border: '1px solid #cbd5e1' }} />}
                  </tr>
                )}
              </tbody>
            </table>

            {interactive && (
              <div style={{ marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={onAddTableRow}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#1d4ed8',
                    backgroundColor: '#eff6ff',
                    border: '1px dashed #60a5fa',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    cursor: 'pointer',
                  }}
                >
                  <Plus style={{ width: '12px', height: '12px' }} />
                  <span>{template.lang === 'bn' ? 'আরেকটি সারি যোগ করুন' : 'Add Row'}</span>
                </button>
              </div>
            )}
          </div>
        );
      }

      case 'witnesses': {
        const count = block.count || 2;
        return (
          <div key={index} style={{ marginTop: '18px', marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, marginBottom: '10px', fontSize: `${fontSizePx - 1}px` }}>
              {block.title || 'সাক্ষীগণের স্বাক্ষর:'}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(count, 3)}, 1fr)`,
                gap: '16px',
              }}
            >
              {Array.from({ length: count }).map((_, wIdx) => (
                <div key={wIdx} style={{ fontSize: `${Math.max(11, fontSizePx - 2)}px`, color: '#334155' }}>
                  <div>{toBanglaDigits(wIdx + 1)}। স্বাক্ষর: ..............................</div>
                  <div style={{ marginTop: '4px' }}>নাম ও ঠিকানা: ......................</div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'signatures': {
        const layout = block.layout || 'single-right';
        return (
          <div
            key={index}
            style={{
              marginTop: '38px',
              display: 'flex',
              justifyContent:
                layout === 'single-right'
                  ? 'flex-end'
                  : 'space-between',
              gap: '24px',
              alignItems: 'flex-end',
            }}
          >
            {block.items.map((sig, sIdx) => (
              <div
                key={sIdx}
                style={{
                  textAlign: sig.align || 'center',
                  minWidth: layout === 'three-col' ? '150px' : '195px',
                }}
              >
                <div
                  style={{
                    borderTop: '1px solid #0f172a',
                    paddingTop: '5px',
                    fontWeight: 700,
                    fontSize: `${fontSizePx - 1}px`,
                    color: '#0f172a',
                  }}
                >
                  {renderInterpolated(sig.title)}
                </div>
                {sig.subtitle && (
                  <div
                    style={{
                      fontSize: `${Math.max(11, fontSizePx - 2)}px`,
                      color: '#334155',
                      marginTop: '2px',
                    }}
                  >
                    {renderInterpolated(sig.subtitle)}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }

      case 'note': {
        return (
          <div
            key={index}
            style={{
              marginTop: '8px',
              marginBottom: '12px',
              fontSize: `${Math.max(11, fontSizePx - 1)}px`,
              color: '#334155',
              fontStyle: 'italic',
            }}
          >
            {renderInterpolated(block.text)}
          </div>
        );
      }

      case 'divider': {
        return (
          <hr
            key={index}
            style={{
              border: 'none',
              borderTop: '1px solid #cbd5e1',
              margin: '12px 0',
            }}
          />
        );
      }

      default:
        return null;
    }
  };

  const resolvedFontStack =
    template.lang === 'en' && fontFamily === DEFAULT_BANGLA_FONT
      ? `'Georgia', 'Times New Roman', ${getBanglaFontStack(fontFamily)}`
      : getBanglaFontStack(fontFamily);

  const rootFormatClasses = [
    'bangla-font-root',
    textBold ? 'bangla-manual-bold' : '',
    textItalic ? 'bangla-manual-italic' : '',
    textUnderline ? 'bangla-manual-underline' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rootFormatClasses}
      style={{
        width: `${paper.widthPx}px`,
        minHeight: `${paper.heightPx}px`,
        backgroundColor: '#ffffff',
        color: '#0f172a',
        position: 'relative',
        boxSizing: 'border-box',
        fontFamily: resolvedFontStack,
        fontSize: `${fontSizePx}px`,
        lineHeight,
        padding: showBorder ? '28px' : '0px',
      }}
    >
      <div
        style={{
          minHeight: showBorder ? `${paper.heightPx - 56}px` : `${paper.heightPx}px`,
          border: showBorder ? '2px double #1e293b' : 'none',
          paddingTop: effectiveStampPx > 0 ? '0px' : '54px',
          paddingBottom: '48px',
          paddingLeft: paper.orientation === 'landscape' ? '44px' : '62px',
          paddingRight: paper.orientation === 'landscape' ? '44px' : '62px',
          position: 'relative',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Stamp Paper / Pre-printed Pad Top Blank Area */}
        {effectiveStampPx > 0 && (
          <div
            style={{
              height: `${effectiveStampPx}px`,
              width: '100%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              ...(interactive
                ? {
                    background:
                      'repeating-linear-gradient(-45deg, rgba(254, 243, 199, 0.72), rgba(254, 243, 199, 0.72) 10px, rgba(253, 230, 138, 0.45) 10px, rgba(253, 230, 138, 0.45) 20px)',
                    borderBottom: '1.5px dashed #d97706',
                    borderRadius: '0 0 8px 8px',
                  }
                : {
                    background: 'transparent',
                  }),
            }}
          >
            {interactive && (
              <span
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.92)',
                  border: '1px solid #f59e0b',
                  color: '#92400e',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '999px',
                }}
              >
                {template.isPadHeader
                  ? `ছাপানো প্যাডের হেডারের ফাঁকা জায়গা (${Math.round(stampTopMm)}mm — প্রিন্টে সাদা থাকবে)`
                  : `স্ট্যাম্প-পেপারের উপরের ফাঁকা জায়গা (${Math.round(stampTopMm)}mm / ${(stampTopMm / 25.4).toFixed(1)}" — প্রিন্টে সাদা থাকবে)`}
              </span>
            )}
          </div>
        )}

        {/* Document Content */}
        <div style={{ flex: 1 }}>
          {template.blocks.map((block, idx) => renderBlock(block, idx))}
        </div>

        {/* Subtle Page Number */}
        {showPageNumber && (
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '24px',
              fontSize: '11px',
              color: '#64748b',
            }}
          >
            {template.lang === 'bn' ? '১' : '1'}
          </div>
        )}
      </div>
    </div>
  );
};
