"use client";

import { useEffect, useState } from "react";
import { Clock, Trash2, Download } from "lucide-react";
import MediaThumbnail from "./MediaThumbnail";

interface HistoryItem {
  url: string;
  timestamp: number;
  type: string;
  thumbnail?: string | null;
  title?: string;
  downloadUrl?: string;
  picker?: Array<{ url: string; type: string }>;
  isAudio?: boolean;
}

export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("download_history");
    if (stored) {
      setHistory(JSON.parse(stored));
    }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("download_history");
    setHistory([]);
  };

  const handleDownloadAgain = (item: HistoryItem) => {
    // Dispatch event to restore this item in InputBox
    const event = new CustomEvent('restore_download', { detail: item });
    window.dispatchEvent(event);
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (history.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 mb-12">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-heading flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Recent Downloads
        </h3>
        <button
          onClick={clearHistory}
          className="text-xs text-muted hover:text-red-500 flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Clear History
        </button>
      </div>
      
      <div className="bg-surface rounded-xl shadow-sm border border-border divide-y divide-border overflow-hidden">
        {history.map((item, index) => (
          <div key={index} className="p-3 sm:p-4 flex items-center gap-4 hover:bg-background-alt transition-colors group">
            
            {/* Thumbnail - Auto Height based on content */}
            <div className="bg-background-alt rounded-lg overflow-hidden flex-shrink-0 border border-background-alt relative w-16 sm:w-20">
                <MediaThumbnail 
                  thumbnail={item.thumbnail}
                  videoUrl={item.downloadUrl}
                  type={item.isAudio ? 'audio' : item.type}
                  instagramUrl={item.url}
                  className="h-auto min-h-[4rem]" // Allow height to adapt, min-height for safety
                />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-heading truncate mb-1">
                    {item.title || 'Instagram Content'}
                </p>
                <p className="text-xs text-muted capitalize flex items-center gap-2">
                    <span className="bg-background-alt px-2 py-0.5 rounded text-[10px] font-medium tracking-wide border border-border">
                        {item.type}
                    </span>
                    <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                </p>
            </div>

            {/* Action */}
            <div className="flex-shrink-0">
                <button 
                    onClick={() => handleDownloadAgain(item)}
                    className="flex items-center gap-2 bg-primary text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm"
                >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Download Again</span>
                    <span className="sm:hidden">Get</span>
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
