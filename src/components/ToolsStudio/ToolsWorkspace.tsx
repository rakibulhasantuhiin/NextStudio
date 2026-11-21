import React, { useRef, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { ToolId } from './SharedToolUI';
import { ALL_TOOL_QUICK_LIST, ToolsDashboard } from './ToolsDashboard';
import {
  GovtPhotoSignTool,
  ImageCompressTool,
  ImageConvertTool,
  ImageResizeTool,
  ImageToPdfTool,
} from './ImageToolsViews';
import {
  PdfCompressTool,
  PdfExtractTextTool,
  PdfMergeTool,
  PdfOrganizeTool,
  PdfSplitTool,
  PdfToImageTool,
  PdfWatermarkNumberTool,
} from './PdfToolsViews';
import { WatermarkRemoveTool } from './WatermarkRemoveTool';

interface ToolsWorkspaceProps {
  lang?: 'bn' | 'en';
}

export const ToolsWorkspace: React.FC<ToolsWorkspaceProps> = () => {
  const [activeTool, setActiveTool] = useState<ToolId>('dashboard');
  const containerRef = useRef<HTMLDivElement>(null);

  const navigateTool = (id: ToolId) => {
    setActiveTool(id);
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderActiveTool = () => {
    switch (activeTool) {
      case 'govt-photo-sign':
        return <GovtPhotoSignTool onBack={() => navigateTool('dashboard')} />;
      case 'watermark-remove':
        return <WatermarkRemoveTool onBack={() => navigateTool('dashboard')} />;
      case 'image-resize':
        return (
          <ImageResizeTool
            onBack={() => navigateTool('dashboard')}
            onNavigateTool={navigateTool}
          />
        );
      case 'image-compress':
        return <ImageCompressTool onBack={() => navigateTool('dashboard')} />;
      case 'image-convert':
        return <ImageConvertTool onBack={() => navigateTool('dashboard')} />;
      case 'image-to-pdf':
        return <ImageToPdfTool onBack={() => navigateTool('dashboard')} />;
      case 'pdf-merge':
        return <PdfMergeTool onBack={() => navigateTool('dashboard')} />;
      case 'pdf-split':
        return <PdfSplitTool onBack={() => navigateTool('dashboard')} />;
      case 'pdf-organize':
        return <PdfOrganizeTool onBack={() => navigateTool('dashboard')} />;
      case 'pdf-to-image':
        return <PdfToImageTool onBack={() => navigateTool('dashboard')} />;
      case 'pdf-compress':
        return <PdfCompressTool onBack={() => navigateTool('dashboard')} />;
      case 'pdf-extract-text':
        return <PdfExtractTextTool onBack={() => navigateTool('dashboard')} />;
      case 'pdf-watermark-number':
        return <PdfWatermarkNumberTool onBack={() => navigateTool('dashboard')} />;
      default:
        return <ToolsDashboard onSelectTool={navigateTool} />;
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full overflow-y-auto studio-desk-grid lg:h-[calc(100vh-3.5rem)]"
    >
      {/* Quick Tool Switcher Strip (Visible when inside a specific tool for instant switching) */}
      {activeTool !== 'dashboard' && (
        <div className="sticky top-0 z-20 px-3 sm:px-6 pt-3 pb-2">
          <div className="max-w-7xl mx-auto glass-strip rounded-2xl px-2.5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => navigateTool('dashboard')}
              className="glass-tile px-3 py-1.5 rounded-xl text-xs font-extrabold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>সব টুলস</span>
            </button>

            <div className="h-4 w-px bg-slate-900/10 dark:bg-white/15 shrink-0 mx-0.5" />

            {ALL_TOOL_QUICK_LIST.map((item) => {
              const isCurrent = activeTool === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTool(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                    isCurrent
                      ? 'glass-btn-primary text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 sm:py-6 pb-16">
        {renderActiveTool()}
      </div>
    </div>
  );
};
