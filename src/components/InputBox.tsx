"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Loader2, Link as LinkIcon, Download, Image as ImageIcon, Music, Captions } from "lucide-react";
import ScriptEditor from "./ScriptEditor";
import type { CobaltResponse, DownloadResult } from "@/types/cobalt";
import { fetchInstagramThumbnail } from "@/app/actions";
import MediaThumbnail from "./MediaThumbnail";

interface InputBoxProps {
  onDownload?: (url: string) => void;
  type?: "video" | "photo" | "story" | "audio" | "reels" | "script";
}

export default function InputBox({ onDownload, type = "reels" }: InputBoxProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [downloadMode, setDownloadMode] = useState<"auto" | "audio">("auto");
  const [script, setScript] = useState("");
  const [showScript, setShowScript] = useState(false);
  const [extractingScript, setExtractingScript] = useState(false);

  // Restore result from History "Download Again" click
  useEffect(() => {
    const handleRestore = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail) {
            const item = customEvent.detail;
            setResult({
                title: item.title,
                thumbnail: item.thumbnail,
                picker: item.picker, 
                downloadUrl: item.downloadUrl,
                isAudio: item.isAudio,
                url: item.url,
                type: item.type
            });
            setUrl(item.url);
            setError("");
            setScript("");
            setShowScript(false);
        }
    };
    
    window.addEventListener('restore_download', handleRestore);
    return () => window.removeEventListener('restore_download', handleRestore);
  }, []);

  const handleDownload = async (e: React.FormEvent, mode: "auto" | "audio" = "auto") => {
    e.preventDefault();
    if (!url) {
        setError("Please paste a valid Instagram URL");
        return;
    }
    
    // Basic validation
    if (!url.includes("instagram.com")) {
      setError("Please enter a valid Instagram URL");
      return;
    }

    setError("");
    setLoading(true);
    setLoadingProgress(0);
    setResult(null);
    setScript("");
    setShowScript(false);

    try {
      // Simulate progress
      setLoadingProgress(10);
      
      const effectiveMode = mode; // Reverting to auto mode to prevent Cobalt errors with audio-only requests

      // Fetch from our backend API (Cobalt Proxy)
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, mode: effectiveMode }),
      });

      setLoadingProgress(40);

      const data: CobaltResponse = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Download failed");
      }

      console.log("[Frontend] Cobalt response:", data);

      setLoadingProgress(60);

      // Fetch thumbnail from Cobalt or Instagram OG tags
      let thumbnail: string | null = data.thumb || null;
      if (!thumbnail) {
        try {
          thumbnail = await fetchInstagramThumbnail(url);
          setLoadingProgress(80);
        } catch (e) {
          console.log("[Frontend] Thumbnail fetch failed, continuing without it");
        }
      }

      // Handle different response types
      let newResult: DownloadResult;

      if (data.status === "error") {
        throw new Error(data.text || "Cobalt returned an error");
      } else if (data.status === "picker") {
        // Photo carousel or multiple items
        newResult = {
          thumbnail: data.picker?.[0]?.thumb || data.picker?.[0]?.url || thumbnail,
          title: `Instagram ${data.picker?.length || 0} Photos`,
          type: 'photo',
          url: url,
          picker: data.picker,
        };
      } else if (data.status === "stream" || data.status === "redirect" || data.status === "tunnel") {
        // Single video or audio (tunnel is for proxied downloads)
        newResult = {
          thumbnail: thumbnail,
          title: data.filename || (mode === "audio" ? "Instagram Audio" : "Instagram Content"),
          type: type === 'script' ? 'video' : type,
          url: url,
          downloadUrl: data.url,
          isAudio: effectiveMode === "audio",
        };
      } else {
        console.error("[Frontend] Unknown status:", data.status);
        console.error("[Frontend] Full response:", JSON.stringify(data, null, 2));
        throw new Error(`Unexpected response format: ${data.status}. Check console for details.`);
      }

      setResult(newResult);
      
      // Save to history (limit to 5 items)
      const history = JSON.parse(localStorage.getItem("download_history") || "[]");
      const filteredHistory = history.filter((item: any) => item.url !== url);
      filteredHistory.unshift({ 
        ...newResult,
        timestamp: Date.now() 
      });
      localStorage.setItem("download_history", JSON.stringify(filteredHistory.slice(0, 5)));

      setLoadingProgress(100);

      // Auto-extract script if type is script
      if (type === "script" && newResult.downloadUrl) {
          await performScriptExtraction(newResult.downloadUrl);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch content. Make sure the link is public and valid.");
    } finally {
      setLoading(false);
      setTimeout(() => setLoadingProgress(0), 500);
    }
  };

  const performScriptExtraction = async (downloadUrl: string) => {
    setShowScript(true); 
    setExtractingScript(true);
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: downloadUrl }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setScript(data.formatted_script || data.raw_transcript);
    } catch (err: any) {
      console.error("Transcription failed:", err);
      // Raw error message as requested
      setScript(`Failed to extract script: ${err.message || "Unknown error"}. Please try again.`);
    } finally {
      setExtractingScript(false);
    }
  };

  const handleExtractScript = async () => {
    if (!result?.downloadUrl) return;
    performScriptExtraction(result.downloadUrl);
  };

  const startDownload = (link: string, filename?: string) => {
    if (!link) return;
    
    let downloadLink = link;
    
    // Check if the link is already proxied (from our updated API)
    if (link.startsWith('/api/proxy')) {
      // Ensure download=true is present
      if (!link.includes('download=true')) {
         // Check if query param exists
         const separator = link.includes('?') ? '&' : '?';
         downloadLink = `${link}${separator}download=true`;
      }
    } else {
      // Use our proxy endpoint to force download
      downloadLink = `/api/proxy?url=${encodeURIComponent(link)}&filename=${encodeURIComponent(filename || 'instagram_video.mp4')}&download=true`;
    }
    
    // Create a temporary anchor
    const a = document.createElement('a');
    a.href = downloadLink;
    a.download = filename || 'instagram_video.mp4';
    
    // Trigger download immediately
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);
  };

  return (
    <div className={`w-full mx-auto transition-all duration-300 ${showScript ? 'max-w-6xl' : 'max-w-2xl'}`}>
      <div className="bg-surface p-2 shadow-xl border ring-4 ring-primary/5 border-border" style={{ borderRadius: 'calc(var(--radius) * 1.5)' }}>
        <form onSubmit={handleDownload} className="relative flex items-center">
          <div className="absolute left-4 text-muted">
            <LinkIcon className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={`Paste Instagram ${type === 'script' ? 'Reel/Video for Script' : type} link...`}
            className="w-full flex-1 py-4.5 pl-12 pr-32 bg-transparent text-base md:text-lg outline-none placeholder:text-muted min-w-0 truncate text-foreground"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-1.5 top-1.5 bottom-1.5 text-white px-6 font-semibold transition-all flex items-center justify-center min-w-[120px] bg-primary hover:bg-primary-hover rounded-lg"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                {type === 'script' ? (
                   <>Extract Script <Captions className="w-4 h-4" /></>
                ) : (
                   <>Download <ArrowRight className="w-4 h-4" /></>
                )}
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Progress Bar */}
      {loading && loadingProgress > 0 && (
        <div className="mt-4 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300 ease-out"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="mt-3 text-red-500 text-sm text-center font-medium animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}

    {/* Result Card */}
      {result && (
        <div className="mt-8 bg-surface rounded-2xl p-6 shadow-lg border animate-in fade-in slide-in-from-bottom-4 border-border">
          {/* Script Extraction View (Responsive Grid) */}
          {showScript ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
               {/* Left: Video Player */}
               <div className="flex flex-col gap-4">
                  <div className="aspect-[9/16] max-h-[600px] w-full bg-black rounded-xl overflow-hidden relative shadow-lg mx-auto flex items-center justify-center">
                    {result.downloadUrl ? (
                        <video 
                            src={result.downloadUrl} 
                            className="w-full h-full object-contain"
                            controls
                            playsInline
                            loop
                            // Auto-play if desired, but user might want to extract first
                        />
                    ) : (
                        <p className="text-white">Video not available</p>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <button 
                       onClick={() => startDownload(result.downloadUrl || '', result.title)}
                       className="w-full max-w-xs text-white px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 hover:opacity-90 transition-opacity justify-center bg-primary"
                     >
                       <Download className="w-4 h-4" /> 
                       {result.isAudio ? 'Download Audio' : 'Download Video'}
                     </button>
                  </div>
               </div>

               {/* Right: Script Editor */}
               <div className="h-full min-h-[400px]">
                  <ScriptEditor 
                    initialScript={script} 
                    loading={extractingScript} 
                    className="h-full shadow-none border-0 bg-transparent" 
                  />
               </div>
            </div>
          ) : (
             /* Standard View */
             result.picker && result.picker.length > 0 ? (
            <div>
              <h3 className="font-bold text-lg mb-4">{result.title}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {result.picker.map((item, index) => (
                  <div key={index} className="relative group h-48 bg-background-alt rounded-lg overflow-hidden">
                    <MediaThumbnail 
                      thumbnail={item.type === 'photo' ? item.url : item.thumb} 
                      videoUrl={item.url} 
                      type={item.type} 
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full"
                    />
                    <button
                      onClick={() => startDownload(item.url, `instagram_photo_${index + 1}.jpg`)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
                    >
                      <Download className="w-8 h-8 text-white" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  result.picker?.forEach((item, i) => {
                    setTimeout(() => startDownload(item.url, `instagram_photo_${i + 1}.jpg`), i * 500);
                  });
                }}
                className="w-full text-white px-5 py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity bg-primary"
              >
                <Download className="w-5 h-5" /> Download All Photos
              </button>
            </div>
          ) : (
            /* Single Video or Audio */
            <div className="flex flex-col md:flex-row gap-6 items-center">
              {/* Vertical Reel Thumbnail (9:16 aspect ratio) */}
              <div className={`bg-background-alt rounded-xl overflow-hidden flex-shrink-0 relative group flex items-center justify-center ${
                result.isAudio || (result.picker && result.picker.length > 0) || type === 'photo' 
                  ? 'w-32 h-32 sm:w-40 sm:h-40' 
                  : 'w-24 h-40 sm:w-28 sm:h-48'
              }`}>
                <MediaThumbnail 
                  key={result.url || result.downloadUrl}
                  thumbnail={result.thumbnail} 
                  videoUrl={result.downloadUrl} 
                  type={result.isAudio ? 'audio' : type} 
                  autoPlay={true}
                  instagramUrl={result.url}
                />
              </div>
              <div className="flex-1 text-center md:text-left w-full min-w-0">
                <h3 className="font-bold text-base mb-1 break-words px-2 md:px-0 text-heading">{result.title}</h3>
                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start px-2 md:px-0 mt-4">
                  {/* Main Download Button */}
                  <button 
                    onClick={() => startDownload(result.downloadUrl || '', result.title)}
                    className="text-white px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 hover:opacity-90 transition-opacity justify-center bg-primary"
                  >
                    <Download className="w-4 h-4" /> 
                    {result.isAudio ? 'Download Audio' : 'Download Video'}
                  </button>

                  {/* Extract Script Button */}
                  {!result.isAudio && type !== 'photo' && (
                     <button 
                       onClick={handleExtractScript}
                       className="text-primary bg-primary/10 border border-primary/20 px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-primary/20 transition-all justify-center"
                     >
                       <Captions className="w-4 h-4" />
                       Extract Script
                     </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
