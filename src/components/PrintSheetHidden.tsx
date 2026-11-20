import React from 'react';
import {
  CuttingGuideStyle,
  CvData,
  DocumentPrintSettings,
  LaminationCardSettings,
  MarginSettings,
  NIDCardSettings,
  PaperDimensions,
  PaperOrientation,
  ReadyDocState,
  StudioMode,
} from '../types';
import { calculateDocumentPlacement } from '../utils/documentLayout';
import { CalculatedItem } from '../utils/layoutCalculator';
import {
  getReadyDocTemplateById,
  resolveReadyDocPaper,
} from '../utils/readyDocs';
import { CvSheetRenderer } from './CvStudio/CvSheetRenderer';
import { ReadyDocSheetRenderer } from './ReadyDocsStudio/ReadyDocSheetRenderer';

interface Props {
  mode: StudioMode;
  paper: PaperDimensions;
  orientation: PaperOrientation;
  margins: MarginSettings;
  cuttingGuide: CuttingGuideStyle;
  bleedArea: number;
  colorProfile: 'srgb' | 'cmyk' | 'bw';
  passportItems: CalculatedItem[];
  nid: NIDCardSettings;
  lamination?: LaminationCardSettings;
  documentSettings?: DocumentPrintSettings;
  cvData?: CvData;
  readyDocState?: ReadyDocState;
}

export const PrintSheetHidden: React.FC<Props> = ({
  mode,
  paper,
  orientation,
  margins,
  cuttingGuide,
  bleedArea,
  colorProfile,
  passportItems,
  nid,
  lamination,
  documentSettings,
  cvData,
  readyDocState,
}) => {
  const readyTemplate =
    mode === 'readydocs' && readyDocState
      ? getReadyDocTemplateById(readyDocState.selectedDocId)
      : null;
  const readyPaper =
    readyTemplate && readyDocState
      ? resolveReadyDocPaper(readyTemplate, readyDocState.paperOverride)
      : null;

  const isLandscape = orientation === 'landscape';
  const paperWidthMm =
    mode === 'cv'
      ? 210
      : mode === 'readydocs' && readyPaper
      ? readyPaper.widthMm
      : isLandscape
      ? paper.height
      : paper.width;
  const paperHeightMm =
    mode === 'cv'
      ? 297
      : mode === 'readydocs' && readyPaper
      ? readyPaper.heightMm
      : isLandscape
      ? paper.width
      : paper.height;
  const docPages = mode === 'document' ? documentSettings?.pages || [] : [];
  const isMultiDoc = mode === 'document' && docPages.length > 0;
  const isFlowPrint = isMultiDoc || mode === 'cv' || mode === 'readydocs';

  return (
    <div
      id="print-sheet-root"
      className="print-only-container hidden print:block"
      style={{
        width: `${paperWidthMm}mm`,
        height: isFlowPrint ? 'auto' : `${paperHeightMm}mm`,
        position: 'relative',
        backgroundColor: '#ffffff',
        background: '#ffffff',
        boxShadow: 'none',
        border: 'none',
        outline: 'none',
        overflow: isFlowPrint ? 'visible' : 'hidden',
      }}
    >
      {/* 1. Passport Mode Items */}
      {mode === 'passport' &&
        passportItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${item.x}mm`,
              top: `${item.y}mm`,
              width: `${item.width}mm`,
              height: `${item.height}mm`,
              boxSizing: 'border-box',
              boxShadow: 'none',
              border: 'none',
            }}
          >
            <img
              src={item.photo.processedSrc || item.photo.originalSrc}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                boxShadow: 'none',
                border: 'none',
                filter:
                  colorProfile === 'bw'
                    ? 'grayscale(100%)'
                    : colorProfile === 'cmyk'
                    ? 'saturate(0.9) contrast(1.05)'
                    : 'none',
              }}
            />

            {/* Bleed line */}
            {bleedArea > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: `-${bleedArea}mm`,
                  left: `-${bleedArea}mm`,
                  right: `-${bleedArea}mm`,
                  bottom: `-${bleedArea}mm`,
                  border: '0.2mm dotted #94a3b8',
                }}
              />
            )}

            {/* Cutting Guides */}
            {cuttingGuide === 'dashed' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  border: '0.2mm dashed #94a3b8',
                }}
              />
            )}
            {cuttingGuide === 'solid' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  border: '0.15mm solid #cbd5e1',
                }}
              />
            )}
            {cuttingGuide === 'scissors' && (
              <>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    border: '0.2mm dotted #94a3b8',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '-2.5mm',
                    left: '-2.5mm',
                    fontSize: '2.5mm',
                    lineHeight: 1,
                    color: '#64748b',
                  }}
                >
                  ✂
                </span>
              </>
            )}
            {cuttingGuide === 'crosshair' && (
              <>
                <div
                  style={{
                    position: 'absolute',
                    top: '-1mm',
                    left: '-1mm',
                    width: '2mm',
                    height: '0.2mm',
                    background: '#64748b',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '-1mm',
                    left: '-1mm',
                    width: '0.2mm',
                    height: '2mm',
                    background: '#64748b',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '-1mm',
                    right: '-1mm',
                    width: '2mm',
                    height: '0.2mm',
                    background: '#64748b',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '-1mm',
                    right: '-1mm',
                    width: '0.2mm',
                    height: '2mm',
                    background: '#64748b',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-1mm',
                    left: '-1mm',
                    width: '2mm',
                    height: '0.2mm',
                    background: '#64748b',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-1mm',
                    left: '-1mm',
                    width: '0.2mm',
                    height: '2mm',
                    background: '#64748b',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-1mm',
                    right: '-1mm',
                    width: '2mm',
                    height: '0.2mm',
                    background: '#64748b',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-1mm',
                    right: '-1mm',
                    width: '0.2mm',
                    height: '2mm',
                    background: '#64748b',
                  }}
                />
              </>
            )}
          </div>
        ))}

      {/* 2. NID Mode Items */}
      {mode === 'nid' &&
        (() => {
          const cardWidthMm = nid.cardWidth || 85.6;
          const cardHeightMm = nid.cardHeight || 53.98;
          const vGapMm = nid.verticalSpacing || 15;
          const totalHeightMm = cardHeightMm * 2 + vGapMm;

          const startXmm = nid.centerOnPage
            ? (paperWidthMm - cardWidthMm) / 2
            : margins.left;
          const startYmm = nid.centerOnPage
            ? (paperHeightMm - totalHeightMm) / 2
            : margins.top;

          const backYmm = startYmm + cardHeightMm + vGapMm;

          return (
            <>
              {/* Front side */}
              {(nid.processedFrontImage || nid.frontImage) && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${startXmm}mm`,
                    top: `${startYmm}mm`,
                    width: `${cardWidthMm}mm`,
                    height: `${cardHeightMm}mm`,
                  }}
                >
                  <img
                    src={nid.processedFrontImage || nid.frontImage!}
                    alt="Front"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'fill',
                      display: 'block',
                      boxShadow: 'none',
                      border: 'none',
                      filter:
                        colorProfile === 'bw'
                          ? 'grayscale(100%)'
                          : colorProfile === 'cmyk'
                          ? 'saturate(0.9) contrast(1.05)'
                          : 'none',
                    }}
                  />
                  {cuttingGuide === 'scissors' && (
                    <>
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          border: '0.2mm dotted #94a3b8',
                          boxShadow: 'none',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: '-2.5mm',
                          left: '-2.5mm',
                          fontSize: '2.5mm',
                          color: '#64748b',
                        }}
                      >
                        ✂
                      </span>
                    </>
                  )}
                  {cuttingGuide === 'dashed' && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        border: '0.2mm dashed #94a3b8',
                        boxShadow: 'none',
                      }}
                    />
                  )}
                </div>
              )}

              {/* Back side */}
              {(nid.processedBackImage || nid.backImage) && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${startXmm}mm`,
                    top: `${backYmm}mm`,
                    width: `${cardWidthMm}mm`,
                    height: `${cardHeightMm}mm`,
                    boxShadow: 'none',
                    border: 'none',
                  }}
                >
                  <img
                    src={nid.processedBackImage || nid.backImage!}
                    alt="Back"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'fill',
                      display: 'block',
                      boxShadow: 'none',
                      border: 'none',
                      filter:
                        colorProfile === 'bw'
                          ? 'grayscale(100%)'
                          : colorProfile === 'cmyk'
                          ? 'saturate(0.9) contrast(1.05)'
                          : 'none',
                    }}
                  />
                  {cuttingGuide === 'scissors' && (
                    <>
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          border: '0.2mm dotted #94a3b8',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: '-2.5mm',
                          left: '-2.5mm',
                          fontSize: '2.5mm',
                          color: '#64748b',
                        }}
                      >
                        ✂
                      </span>
                    </>
                  )}
                  {cuttingGuide === 'dashed' && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        border: '0.2mm dashed #94a3b8',
                      }}
                    />
                  )}
                </div>
              )}
            </>
          );
        })()}

      {/* 2B. Lamination Side-by-Side Fold ID Card (Strictly Equal Front & Back) */}
      {mode === 'lamination' &&
        lamination &&
        (() => {
          const cardW = lamination.cardWidth || 85.6;
          const cardH = lamination.cardHeight || 54;
          const imgFilter =
            colorProfile === 'bw'
              ? 'grayscale(100%)'
              : colorProfile === 'cmyk'
              ? 'saturate(0.9) contrast(1.05)'
              : 'none';
          const imgFit = lamination.imageFit === 'cover' ? 'cover' : 'fill';
          const isLevel = Math.abs(lamination.frontY - lamination.backY) <= 1;
          const seamX =
            lamination.frontX < lamination.backX
              ? (lamination.frontX + cardW + lamination.backX) / 2
              : (lamination.backX + cardW + lamination.frontX) / 2;
          const minY = Math.min(lamination.frontY, lamination.backY);

          const renderCutGuide = () => {
            if (lamination.outerCutGuide === 'dashed') {
              return (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    border: '0.2mm dashed #94a3b8',
                    boxShadow: 'none',
                  }}
                />
              );
            }
            if (lamination.outerCutGuide === 'solid') {
              return (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    border: '0.15mm solid #cbd5e1',
                    boxShadow: 'none',
                  }}
                />
              );
            }
            if (lamination.outerCutGuide === 'scissors') {
              return (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      border: '0.2mm dotted #94a3b8',
                      boxShadow: 'none',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2.5mm',
                      left: '-2.5mm',
                      fontSize: '2.5mm',
                      color: '#64748b',
                    }}
                  >
                    ✂
                  </span>
                </>
              );
            }
            return null;
          };

          return (
            <>
              {(lamination.processedFrontImage || lamination.frontImage) && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${lamination.frontX}mm`,
                    top: `${lamination.frontY}mm`,
                    width: `${cardW}mm`,
                    height: `${cardH}mm`,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    boxShadow: 'none',
                    border: 'none',
                  }}
                >
                  <img
                    src={lamination.processedFrontImage || lamination.frontImage!}
                    alt="Front"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: imgFit,
                      display: 'block',
                      boxShadow: 'none',
                      border: 'none',
                      filter: imgFilter,
                    }}
                  />
                  {renderCutGuide()}
                </div>
              )}

              {(lamination.processedBackImage || lamination.backImage) && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${lamination.backX}mm`,
                    top: `${lamination.backY}mm`,
                    width: `${cardW}mm`,
                    height: `${cardH}mm`,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    boxShadow: 'none',
                    border: 'none',
                  }}
                >
                  <img
                    src={lamination.processedBackImage || lamination.backImage!}
                    alt="Back"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: imgFit,
                      display: 'block',
                      boxShadow: 'none',
                      border: 'none',
                      filter: imgFilter,
                      transform: lamination.backRotate180 ? 'rotate(180deg)' : 'none',
                    }}
                  />
                  {renderCutGuide()}
                </div>
              )}

              {/* Subtle Center Fold Crease Line */}
              {lamination.showFoldLine &&
                isLevel &&
                (lamination.frontImage || lamination.backImage) && (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${seamX}mm`,
                      top: `${Math.max(0, minY - 3)}mm`,
                      width: '0mm',
                      height: `${cardH + 6}mm`,
                      borderLeft: '0.25mm dashed #64748b',
                      boxShadow: 'none',
                    }}
                  />
                )}
            </>
          );
        })()}

      {/* 3. Document / Fit-to-Paper Mode Pages (One pure white page per uploaded document) */}
      {mode === 'document' &&
        documentSettings &&
        docPages.map((docPage, idx) => {
          const placement = calculateDocumentPlacement({
            imgWidth: docPage.naturalWidth || 1000,
            imgHeight: docPage.naturalHeight || 1414,
            paperWidthMm,
            paperHeightMm,
            marginMm: documentSettings.marginMm,
            fitMode: documentSettings.fitMode,
            autoRotateToFit: documentSettings.autoRotateToFit,
          });

          const imgFilter =
            colorProfile === 'bw'
              ? 'grayscale(100%)'
              : colorProfile === 'cmyk'
              ? 'saturate(0.9) contrast(1.05)'
              : 'none';

          return (
            <div
              key={docPage.id}
              className="print-page"
              style={{
                width: `${paperWidthMm}mm`,
                height: `${paperHeightMm}mm`,
                position: 'relative',
                backgroundColor: '#ffffff',
                background: '#ffffff',
                boxShadow: 'none',
                border: 'none',
                outline: 'none',
                overflow: 'hidden',
                pageBreakAfter: idx < docPages.length - 1 ? 'always' : 'auto',
                breakAfter: idx < docPages.length - 1 ? 'page' : 'auto',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: `${placement.availXmm}mm`,
                  top: `${placement.availYmm}mm`,
                  width: `${placement.availWmm}mm`,
                  height: `${placement.availHmm}mm`,
                  overflow: 'hidden',
                  boxShadow: 'none',
                  border: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: `${placement.xMm - placement.availXmm}mm`,
                    top: `${placement.yMm - placement.availYmm}mm`,
                    width: `${placement.widthMm}mm`,
                    height: `${placement.heightMm}mm`,
                    boxShadow: 'none',
                    border: 'none',
                  }}
                >
                  {placement.shouldRotate90 ? (
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: `${placement.heightMm}mm`,
                        height: `${placement.widthMm}mm`,
                        transform: 'translate(-50%, -50%) rotate(90deg)',
                      }}
                    >
                      <img
                        src={docPage.processedSrc || docPage.originalSrc}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'fill',
                          display: 'block',
                          boxShadow: 'none',
                          border: 'none',
                          filter: imgFilter,
                        }}
                      />
                    </div>
                  ) : (
                    <img
                      src={docPage.processedSrc || docPage.originalSrc}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'fill',
                        display: 'block',
                        boxShadow: 'none',
                        border: 'none',
                        filter: imgFilter,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}

      {/* 4. CV Maker Mode (Pure white A4 vector DOM, clean print output without highlights) */}
      {mode === 'cv' && cvData && (
        <div
          style={{
            width: '210mm',
            minHeight: '297mm',
            backgroundColor: '#ffffff',
            background: '#ffffff',
            overflow: 'visible',
          }}
        >
          <CvSheetRenderer data={cvData} interactive={false} />
        </div>
      )}

      {/* 5. Ready-Made Documents Mode (Exact A4 / A4 Landscape / Legal / Legal 13.5" vector print) */}
      {mode === 'readydocs' && readyDocState && readyTemplate && readyPaper && (
        <div
          style={{
            width: `${readyPaper.widthMm}mm`,
            minHeight: `${readyPaper.heightMm}mm`,
            backgroundColor: '#ffffff',
            background: '#ffffff',
            overflow: 'visible',
          }}
        >
          <ReadyDocSheetRenderer
            template={readyTemplate}
            paper={readyPaper}
            values={readyDocState.valuesByDoc[readyTemplate.id] || {}}
            tableRows={
              readyDocState.tablesByDoc[readyTemplate.id]?.length
                ? readyDocState.tablesByDoc[readyTemplate.id]
                : readyTemplate.defaultTableRows || []
            }
            photoSrc={readyDocState.photosByDoc[readyTemplate.id] || ''}
            fontSizePx={readyDocState.fontSizePx}
            lineHeight={readyDocState.lineHeight}
            stampTopMm={readyDocState.stampTopMm}
            showHeader={readyDocState.showHeader}
            showBorder={readyDocState.showBorder}
            showPageNumber={readyDocState.showPageNumber}
            interactive={false}
          />
        </div>
      )}
    </div>
  );
};
