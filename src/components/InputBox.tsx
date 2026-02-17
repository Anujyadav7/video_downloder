
"use client";

import { useState, useRef, useEffect } from "react";
import { 
  ArrowRight, Loader2, Link as LinkIcon, Download, Captions, AlertTriangle, 
  Youtube, Instagram, Facebook, Twitter, Video, CheckCircle2, FileText, Image as ImageIcon, Sparkles, AlertCircle 
} from "lucide-react";
import ScriptEditor from "./ScriptEditor";
import type { CobaltResponse, DownloadResult } from "@/types/cobalt";
import { fetchInstagramThumbnail } from "@/app/actions";
import MediaThumbnail from "./MediaThumbnail";
import CircularProgress from "./CircularProgress";

interface InputBoxProps {
  onDownload?: (url: string) => void;
  type?: "video" | "photo" | "story" | "audio" | "reels" | "script";
}

const getModeDetails = (url: string, type: string) => {
    let details = {
        title: "Smart Video Downloader",
        tag: "Universal Saver",
        icon: LinkIcon,
        color: "text-zinc-700 dark:text-zinc-300",
        bg: "bg-zinc-100 dark:bg-zinc-800/50",
        border: "border-zinc-200 dark:border-zinc-700"
    };

    if (type === 'script') {
        details.title = "Video Link to AI Script";
        details.tag = "AI Transcription";
        details.icon = Sparkles;
        details.color = "text-violet-600 dark:text-violet-400";
        details.bg = "bg-violet-50 dark:bg-violet-900/10";
        details.border = "border-violet-100 dark:border-violet-800/30";
    } else if (type === 'photo') {
        details.title = "Instagram Photo Downloader";
        details.tag = "HD Images";
        details.icon = ImageIcon;
        details.color = "text-pink-600 dark:text-pink-400";
        details.bg = "bg-pink-50 dark:bg-pink-900/10";
        details.border = "border-pink-100 dark:border-pink-800/30";
    }

    if (url) {
        if (url.includes("youtube.com") || url.includes("youtu.be")) {
             details.tag = "YouTube";
             details.icon = Youtube;
             details.color = "text-red-600 dark:text-red-400";
             details.bg = "bg-red-50 dark:bg-red-900/10";
             details.border = "border-red-100 dark:border-red-800/30";
        } else if (url.includes("instagram.com")) {
             details.tag = "Instagram";
             details.icon = Instagram;
             details.color = "text-pink-600 dark:text-pink-400";
             details.bg = "bg-pink-50 dark:bg-pink-900/10";
             details.border = "border-pink-100 dark:border-pink-800/30";
        } else if (url.includes("facebook.com") || url.includes("fb.watch")) {
             details.tag = "Facebook";
             details.icon = Facebook;
             details.color = "text-blue-600 dark:text-blue-400";
             details.bg = "bg-blue-50 dark:bg-blue-900/10";
             details.border = "border-blue-100 dark:border-blue-800/30";
        } else if (url.includes("twitter.com") || url.includes("x.com")) {
             details.tag = "Twitter";
             details.icon = Twitter;
             details.color = "text-black dark:text-white"; 
             details.bg = "bg-zinc-100 dark:bg-zinc-800";
             details.border = "border-zinc-200 dark:border-zinc-700";
        } else if (url.includes("tiktok.com")) {
             details.tag = "TikTok";
             details.icon = Video;
             details.color = "text-pink-500 dark:text-pink-400";
             details.bg = "bg-zinc-50 dark:bg-zinc-900";
             details.border = "border-zinc-200 dark:border-zinc-700";
        }
    }

    return details;
};

export default function InputBox({ onDownload, type = "video" }: InputBoxProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0); 
  const [transcribeProgress, setTranscribeProgress] = useState(0); 
  const [error, setError] = useState("");
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [script, setScript] = useState("");
  const [showScript, setShowScript] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionComplete, setTranscriptionComplete] = useState(false);
  
  // Video Source Logic (Proxy vs Direct)
  const [videoSrc, setVideoSrc] = useState("");

  const mode = getModeDetails(url, type);
  const ModeIcon = mode.icon;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const handleRestore = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail) {
            const item = customEvent.detail;
            setResult({ ...item });
            setUrl(item.url);
            
            // Intelligent Source Selection
            if (item.downloadUrl) {
                const isInternal = item.downloadUrl.startsWith("/");
                setVideoSrc(isInternal ? item.downloadUrl : `/api/proxy?url=${encodeURIComponent(item.downloadUrl)}`);
            } else {
                setVideoSrc("");
            }
            
            setError("");
            setScript("");
            setShowScript(false);
        }
    };
    window.addEventListener('restore_download', handleRestore);
    return () => window.removeEventListener('restore_download', handleRestore);
  }, []);

  const handleDownload = async (e: React.FormEvent, reqMode: "auto" | "audio" = "auto") => {
    e.preventDefault();
    setError("");
    setTranscriptionComplete(false);
    setVideoSrc("");

    if (!url) { setError("Please paste a valid video URL"); return; }
    try { new URL(url); } catch { setError("Invalid URL format"); return; }

    setLoading(true);
    setLoadingProgress(10);
    setResult(null);
    setScript("");
    setShowScript(false);
    setTimeout(() => setLoadingProgress(25), 300);

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, mode: type === 'audio' ? 'audio' : 'auto' }),
      });
      setLoadingProgress(50);
      
      const data: CobaltResponse = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Download failed. Please check the link.");

      setLoadingProgress(85);

      const downloadUrl = data.url || (data.picker?.[0]?.url);
      
      // Intelligent Source Selection (Fixes Double Proxy Error)
      const isInternal = downloadUrl?.startsWith("/");
      const initialSrc = downloadUrl ? (isInternal ? downloadUrl : `/api/proxy?url=${encodeURIComponent(downloadUrl)}`) : "";
      
      setVideoSrc(initialSrc);
      console.log("Setting initial video src:", initialSrc);

      // Detect actual content type from the media URL, not just filename
      const filename = data.filename || 'Content';
      const mediaUrl = data.url || (data.picker?.[0]?.url) || '';
      
      // Check the actual media URL for type
      const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.m3u8') || 
                     mediaUrl.includes('video') || type === 'video' || type === 'reels';
      const isPhoto = !isVideo && (mediaUrl.includes('.jpg') || mediaUrl.includes('.jpeg') || 
                     mediaUrl.includes('.png') || mediaUrl.includes('.heic') ||
                     mediaUrl.includes('.webp') || type === 'photo');
      
      const contentType = type === 'script' ? 'video' : 
                         type === 'audio' ? 'audio' :
                         isVideo ? 'video' :
                         isPhoto ? 'photo' : type;

      const newResult: DownloadResult = {
          thumbnail: data.thumb || (mode.tag === "Instagram" ? await fetchInstagramThumbnail(url).catch(()=>null) : null),
          title: filename,
          type: contentType,
          url: url,
          downloadUrl: initialSrc, // Use the Safe/Proxied URL!
          isAudio: type === 'audio',
          picker: data.picker 
      };

      setResult(newResult);
      setLoadingProgress(100);

      if (type === "script") {
          startTranscription(downloadUrl || "");
      }

    } catch (err: any) {
      setError(err.message || "Failed.");
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  const startTranscription = async (videoUrl: string) => {
      let finalUrl = videoUrl;
      // Intelligently decide if we need the external proxy
      // If it's an internal API link (e.g. /api/stream), DO NOT wrap it.
      const isInternal = finalUrl.startsWith("/");
      const proxyEndpoint = isInternal ? finalUrl : `/api/proxy?url=${encodeURIComponent(finalUrl)}`;

      setTranscribing(true);
      setShowScript(true); // Switch view
      setTranscribeProgress(0);
      setTranscriptionComplete(false);
      
      // Ensure video source is maintained
      if (!videoSrc) {
          // If internal, likely safe to use directly
          setVideoSrc(isInternal ? finalUrl : `/api/proxy?url=${encodeURIComponent(finalUrl)}`);
      }

      const interval = setInterval(() => {
        setTranscribeProgress(old => {
            if (old >= 90) return 90;
            return old + Math.random() * 2;
        });
      }, 500);

      try {
          // Robust Transcription Strategy: Server-Side Fetch
          // Instead of downloading the Blob in browser (slow, CORS issues), 
          // we send the URL to the server to download directly.
          
          // Use the original URL (state) if available, to allow backend to re-resolve fresh stream
          // consistently. This fixes YouTube/GoogleVideo link expiration/IP mismatch issues.
          let targetUrl = url || videoUrl;
          
          console.log("Requesting transcription for:", targetUrl);
          
          const response = await fetch("/api/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: targetUrl }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Transcription Failed");

          setScript(data.script);
          setTranscribeProgress(100);
          setTranscriptionComplete(true);

      } catch (err: any) {
          console.error("Transcription Error:", err);
          setScript(`[Error: ${err.message}]`);
          setTranscribeProgress(0);
          setError(err.message);
      } finally {
          clearInterval(interval);
          setTranscribing(false);
      }
  };
  
  const startDownloadFile = (link: string, filename?: string) => {
    if(!link) return;
    
    // Use provided filename or default based on link type
    const defaultFilename = link.includes('.jpg') || link.includes('.jpeg') || 
                           link.includes('.png') || link.includes('.heic') || 
                           link.includes('.webp') ? 'photo.jpg' : 'video.mp4';
    const finalFilename = filename || defaultFilename;
    
    // Check if link is internal (e.g. /api/stream)
    let dLink = "";
    if (link.startsWith("/")) {
        // Internal Link: Append download param manually if needed
        dLink = `${link}${link.includes('?') ? '&' : '?'}download=true&filename=${encodeURIComponent(finalFilename)}`;
    } else {
        // External Link: Use Proxy wrapper
        dLink = `/api/proxy?url=${encodeURIComponent(link)}&filename=${encodeURIComponent(finalFilename)}&download=true`;
    }
    
    const a = document.createElement('a'); a.href = dLink; a.download = finalFilename;
    document.body.appendChild(a); a.click(); setTimeout(()=>document.body.removeChild(a),100);
  };

  const handleVideoError = () => {
      // If Proxy Fails, try Direct URL fallback
      console.log("Video Proxy failed to load. Falling back to direct URL.");
      if (result?.downloadUrl && videoSrc.includes("/api/proxy")) {
          setVideoSrc(result.downloadUrl);
      }
  };

  return (
    <div className={`w-full mx-auto transition-all duration-700 ease-in-out ${showScript ? 'max-w-[1400px]' : 'max-w-3xl'}`}>
      
      {/* Search Header */}
      <div className={`mb-10 text-center transition-all duration-300 ${url ? 'opacity-100 translate-y-0' : 'opacity-90 translate-y-1'}`}>
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4 border ${mode.bg} ${mode.color} ${mode.border}`}>
             <ModeIcon className="w-3.5 h-3.5" />
             <span>{mode.tag}</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight pb-2 leading-tight text-neutral-900 dark:text-neutral-100">
              {mode.title}
          </h1>
          
          <p className="text-neutral-500 dark:text-neutral-400 mt-3 text-lg font-medium max-w-xl mx-auto opacity-80">
             {type === 'script' ? 'Professional AI Transcription for Videos.' : 
              type === 'photo' ? 'Download HD Photos Instantly.' :
              'Download High-Quality Videos from All Major Platforms.'}
          </p>
      </div>

      {/* Input Field */}
      <div className={`relative group transition-all duration-300 z-10 ${showScript ? 'opacity-0 h-0 overflow-hidden pointer-events-none' : 'opacity-100 scale-100'}`}>
        <div className={`absolute -inset-0.5 rounded-[2rem] bg-gradient-to-r from-neutral-200 to-neutral-200 opacity-0 blur-2xl transition duration-1000 group-hover:opacity-50 dark:from-neutral-800 dark:to-neutral-900`}></div>
        
        <div className="relative bg-white p-2 shadow-xl border ring-1 ring-black/5 border-neutral-100 rounded-[2rem] dark:bg-neutral-900 dark:border-neutral-800 dark:ring-white/5 transition-all">
            <form onSubmit={handleDownload} className="relative flex items-center">
                <div className={`absolute left-5 transition-colors duration-300 ${mode.color}`}>
                    <ModeIcon className="w-6 h-6" />
                </div>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={type === 'script' ? 'Paste video URL to transcribe...' : 'Paste video or photo URL...'}
                    className="w-full flex-1 py-4 pl-14 pr-36 bg-transparent text-lg font-medium outline-none placeholder:text-neutral-400 min-w-0 truncate text-neutral-900 dark:text-neutral-100"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="absolute right-2 top-2 bottom-2 text-white px-6 md:px-8 font-semibold transition-all flex items-center justify-center min-w-[130px] bg-neutral-900 hover:bg-black rounded-[1.5rem] shadow-none hover:shadow-lg active:scale-95 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                     type === 'script' ? 
                     <span className="flex gap-2 items-center text-sm">AI Script <Sparkles className="w-3.5 h-3.5" /></span> : 
                     <span className="flex gap-2 items-center text-sm">Download <ArrowRight className="w-4 h-4" /></span>
                    }
                </button>
            </form>
        </div>
      </div>

      {loading && <div className="mt-8 w-full bg-neutral-100 rounded-full h-0.5 overflow-hidden dark:bg-neutral-800"><div className="h-full bg-neutral-900 dark:bg-neutral-100 transition-all duration-300 ease-out" style={{ width: `${loadingProgress}%` }} /></div>}
      
      {error && (
        <div className="mt-6 mx-auto max-w-lg p-3 px-4 bg-red-50/50 border border-red-100 rounded-xl flex items-center justify-center gap-3 text-red-700 shadow-sm animate-in fade-in slide-in-from-top-2 dark:bg-red-900/10 dark:border-red-900/30 dark:text-red-400 text-center">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
          {showScript ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 min-h-[500px] h-auto">
               
               {/* Video Player (Preview View) */}
               <div className="flex flex-col gap-4 order-1 lg:order-none">
                  <div className="w-full h-[300px] sm:h-[400px] lg:h-[500px] flex items-center justify-center">
                    {/* Error State or Video Player */}
                    {videoSrc ? (
                        <video 
                            ref={videoRef}
                            src={videoSrc} // Uses proxyUrl first, falls back to direct on Error
                            key={videoSrc} // Force re-render on src change
                            className="w-full h-full object-contain rounded-2xl shadow-sm bg-black/5 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800"
                            controls
                            playsInline
                            crossOrigin="anonymous" 
                            onError={handleVideoError} 
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 gap-2">
                            <AlertCircle className="w-8 h-8 opacity-50" />
                            <p>Preview Unavailable</p>
                        </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                         onClick={() => { setShowScript(false); setScript(""); }}
                         className="flex-1 py-3 px-4 bg-white text-neutral-700 border border-neutral-200 rounded-xl font-medium text-sm hover:bg-neutral-50 transition-colors dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                         ← Back
                    </button>
                    <button 
                        onClick={() => startDownloadFile(result.downloadUrl || '', result.title)}
                        className="flex-[2] py-3 px-4 bg-neutral-900 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-black transition-transform active:scale-[0.99] dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                    >
                        <Download className="w-4 h-4" /> Download Video
                    </button>
                  </div>
               </div>

               {/* Script Editor */}
               <div className="relative flex flex-col bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden dark:bg-neutral-900 dark:border-neutral-800 order-2 lg:order-none min-h-[500px]">
                  {/* Analysis Overlay */}
                  {transcribing && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm transition-all duration-300 dark:bg-neutral-900/95">
                          <div className="p-6">
                              <CircularProgress progress={transcribeProgress} size={120} strokeWidth={6} color="text-neutral-900 dark:text-white" />
                          </div>
                          <p className="mt-4 text-sm font-medium text-neutral-500 animate-pulse">Analyzing Audio...</p>
                      </div>
                  )}

                  {/* Clean Editor Header with Status */}
                  <div className="px-5 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-900 dark:border-neutral-800">
                      <div className="flex items-center gap-2">
                        <Sparkles className={`w-4 h-4 ${transcriptionComplete ? "text-green-600 dark:text-green-400" : "text-violet-600 dark:text-violet-400"}`} />
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest dark:text-neutral-400">
                            {transcriptionComplete ? "AI Script • Ready" : "AI Script"}
                        </span>
                      </div>
                      {script && (
                          <button onClick={() => navigator.clipboard.writeText(script)} className="text-xs font-bold text-neutral-700 hover:text-black flex items-center gap-1.5 transition-colors px-3 py-1.5 bg-white border border-neutral-200 rounded-lg shadow-sm hover:shadow-md dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 dark:hover:text-white dark:hover:bg-neutral-700">
                              <FileText className="w-3.5 h-3.5" /> Copy
                          </button>
                      )}
                  </div>

                  <div className="flex-1 flex flex-col relative">
                      <ScriptEditor 
                        initialScript={script} 
                        loading={false}
                        className="h-full w-full border-0 shadow-none resize-none focus:ring-0 text-base leading-relaxed p-5 font-normal text-neutral-800 dark:bg-transparent dark:text-neutral-200" 
                      />
                  </div>
               </div>
            </div>
          ) : (
             /* Standard Result (Default View) */
             <div className="bg-white/80 backdrop-blur-xl p-4 sm:p-6 md:p-8 rounded-3xl shadow-2xl border border-neutral-200/50 flex flex-col gap-6 items-center dark:bg-neutral-900/80 dark:border-neutral-800/50">
                {/* Check if carousel (picker exists with multiple items) */}
                {result.picker && result.picker.length > 1 ? (
                   /* Carousel View */
                   <div className="w-full max-w-5xl mx-auto space-y-6">
                      <div className="text-center">
                         <div className="inline-block px-3 py-1.5 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-700 dark:text-purple-400 text-xs font-bold rounded-full mb-3 border border-purple-200/50 dark:border-purple-800/30 shadow-sm">
                            📸 CAROUSEL ({result.picker.length} items)
                         </div>
                         <h3 className="font-bold text-lg sm:text-xl md:text-2xl text-neutral-900 dark:text-white mb-2">{result.title}</h3>
                         <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Download all items individually</p>
                      </div>
                      
                      {/* Carousel Grid - Reverted to Standard Grid (Clean Look) */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                         {result.picker.map((item, index) => {
                            const itemUrl = item.url.startsWith("/") ? item.url : `/api/proxy?url=${encodeURIComponent(item.url)}`;
                            
                            // Stronger Type Detection: Default to PHOTO unless it's explicitly a video file
                            // This fixes "Video Stream Error" on webp images or mixed content
                            const isExplicitVideo = item.url.includes('.mp4') || item.url.includes('.m3u8');
                            const itemType = isExplicitVideo ? 'video' : 'photo'; 
                            
                            const itemFilename = `instagram_carousel_${index + 1}.${itemType === 'photo' ? 'jpg' : 'mp4'}`;
                            
                            return (
                               <div key={index} className="group relative aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all w-full">
                                  {/* Media - shows full photo without cropping */}
                                  <div className="absolute inset-0 flex items-center justify-center p-0">
                                     {itemType === 'photo' ? (
                                        <img 
                                           src={itemUrl}
                                           alt={`Item ${index + 1}`}
                                           className="w-full h-full object-cover" // object-cover for photos in grid looks better (fills box)
                                           onError={(e) => {
                                              // Fallback to MediaThumbnail on error, but try to hide if broken
                                              e.currentTarget.style.display = 'none';
                                           }}
                                        />
                                     ) : (
                                        <MediaThumbnail 
                                           thumbnail={item.thumb} 
                                           videoUrl={itemUrl} 
                                           type={itemType}
                                           autoPlay={false}
                                        />
                                     )}
                                  </div>
                                  
                                  {/* Hover overlay with download button */}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                     <button 
                                        onClick={() => startDownloadFile(itemUrl, itemFilename)}
                                        className="bg-white/90 backdrop-blur-sm text-neutral-900 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:bg-white hover:scale-105 transition-all"
                                     >
                                        <Download className="w-4 h-4" />
                                        {itemType === 'photo' ? 'Photo' : 'Video'}
                                     </button>
                                  </div>
                                  
                                  {/* Item number badge */}
                                  <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-full border border-white/20">
                                     {index + 1}
                                  </div>
                               </div>
                            );
                         })}
                      </div>
                      
                      {/* Download All Button - Premium SaaS Style */}
                      <button 
                         onClick={() => {
                            result.picker?.forEach((item, index) => {
                               const itemUrl = item.url.startsWith("/") ? item.url : `/api/proxy?url=${encodeURIComponent(item.url)}`;
                               const itemType = item.type || 'photo';
                               const itemFilename = `instagram_carousel_${index + 1}.${itemType === 'photo' ? 'jpg' : 'mp4'}`;
                               setTimeout(() => startDownloadFile(itemUrl, itemFilename), index * 500);
                            });
                         }}
                         className="w-full py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex justify-center items-center gap-2.5 text-sm shadow-sm"
                      >
                         <Download className="w-4 h-4" /> Download All ({result.picker.length} items)
                      </button>
                   </div>
                ) : (
                   /* Single Item View */
                   <div className="w-full flex flex-col md:flex-row gap-6 md:gap-8">
                      {/* Thumbnail - Adaptive aspect ratio for mobile */}
                      <div className="w-full md:w-56 aspect-[4/5] md:aspect-[3/4] bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 mx-auto md:mx-0 ring-1 ring-black/5 dark:ring-white/5">
                          <MediaThumbnail 
                              thumbnail={result.thumbnail} 
                              videoUrl={videoSrc || (result.downloadUrl?.startsWith("/") ? result.downloadUrl : `/api/proxy?url=${encodeURIComponent(result.downloadUrl || '')}`)}
                              type={result.type} 
                              autoPlay={true} 
                              onError={handleVideoError}
                          />
                      </div>
                      
                      <div className="flex-1 w-full space-y-5 text-center md:text-left min-w-0">
                          <div>
                              <div className="inline-block px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-full mb-3 border border-green-200/50 dark:border-green-800/30 shadow-sm">
                                  ✓ READY TO DOWNLOAD
                              </div>
                               {/* Responsive title sizing */}
                              <h3 className="font-bold text-lg sm:text-xl md:text-2xl text-neutral-900 line-clamp-2 break-words leading-tight dark:text-white mb-2" title={result.title}>{result.title}</h3>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                                  {result.type === 'photo' ? 'High Quality • Photo • JPG/PNG' : 
                                   result.type === 'audio' ? 'High Quality • Audio • MP3' :
                                   'High Quality • Video • MP4'}
                              </p>
                          </div>
                          
                          {/* Improved button layout for mobile */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                               <button 
                                  onClick={() => startDownloadFile(result.downloadUrl || '', result.title)} 
                                  className="py-4 sm:py-3.5 bg-gradient-to-r from-neutral-900 to-black dark:from-white dark:to-neutral-100 text-white dark:text-black rounded-xl font-bold hover:shadow-xl transition-all flex justify-center items-center gap-2.5 text-sm sm:text-base shadow-lg active:scale-[0.97] touch-manipulation"
                               >
                                  <Download className="w-4 h-4 sm:w-5 sm:h-5" /> Download
                               </button>
                               {type !== 'photo' && (
                                   <button 
                                      onClick={() => startTranscription(result.downloadUrl || '')} 
                                      className="py-4 sm:py-3.5 bg-white/80 backdrop-blur-sm text-neutral-900 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl font-bold hover:bg-neutral-50 dark:bg-neutral-800/80 dark:text-white dark:hover:bg-neutral-700 transition-all flex justify-center items-center gap-2.5 text-sm sm:text-base shadow-md active:scale-[0.97] touch-manipulation"
                                   >
                                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" /> AI Script
                                   </button>
                               )}
                          </div>
                      </div>
                   </div>
                )}
             </div>
          )}
        </div>
      )}
    </div>
  );
}
