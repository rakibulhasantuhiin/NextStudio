import React from 'react';
import {
  CuttingGuideStyle,
  MarginSettings,
  NIDCardSettings,
  PaperDimensions,
  PaperOrientation,
  StudioMode,
} from '../types';
import { CalculatedItem } from '../utils/layoutCalculator';

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
}) => {
  const isLandscape = orientation === 'landscape';
  const paperWidthMm = isLandscape ? paper.height : paper.width;
  const paperHeightMm = isLandscape ? paper.width : paper.height;

  return (
    <div
      id="print-sheet-root"
      className="print-only-container hidden print:block"
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
    </div>
  );
};
