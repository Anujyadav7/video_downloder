"use client";

import { useState } from "react";
import { Image as ImageIcon, Music, Play } from "lucide-react";

interface MediaThumbnailProps {
  thumbnail?: string | null;
  videoUrl?: string; // used as fallback
  type?: string;
  alt?: string;
  className?: string; // wrapper class
  autoPlay?: boolean;
  instagramUrl?: string; // For Embed fallback
}

export default function MediaThumbnail({ thumbnail, videoUrl, type, alt, className = "", autoPlay = false, instagramUrl }: MediaThumbnailProps) {
  const [imgError, setImgError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  // Extract Instagram Shortcode for Embed
  const getInstagramEmbedUrl = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:instagram\.com\/(?:p|reel|tv)\/)([^/?#&]+)/);
    if (match && match[1]) {
        return `https://www.instagram.com/p/${match[1]}/embed/captioned/?cr=1&v=14&wp=540&rd=http%3A%2F%2Flocalhost%3A3000&rp=%2F`;
    }
    return null;
  };

  const embedUrl = instagramUrl ? getInstagramEmbedUrl(instagramUrl) : null;
  const showEmbed = videoError || (!thumbnail && !videoUrl); // Show embed if video failed OR no other media available

  if (type === 'audio') {
      return (
          <div className={`w-full h-full flex items-center justify-center bg-background-alt text-primary ${className}`}>
              <Music className="w-8 h-8" />
          </div>
      );
  }

  // Priority 1: Photo (if type is explicitly photo)
  if (type === 'photo' && (videoUrl || thumbnail)) {
      const photoSrc = videoUrl || thumbnail;
      return (
          <div className={`relative w-full h-full bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 ${className} overflow-hidden`}>
            <img 
                src={photoSrc!} 
                alt={alt || "Photo"} 
                className="object-cover w-full h-full"
                onError={() => setImgError(true)}
            />
          </div>
      );
  }

  // Priority 2: Video with Poster (Live Preview)
  // ALWAYS render video if URL exists. Do NOT fallback to simple IMG tag to satisfy "Reverse Proxy" requirement.
  if (videoUrl && (type === 'video' || type === 'reels' || !type)) {
      return (
          <div className={`relative w-full h-full bg-black/5 dark:bg-neutral-900 ${className} group overflow-hidden flex items-center justify-center`}>
            <video 
                src={`${videoUrl}`} 
                poster={thumbnail || undefined}
                muted
                loop
                playsInline
                autoPlay={autoPlay}
                preload="metadata"
                onMouseOver={(e) => e.currentTarget.play().catch(() => {})}
                onMouseOut={(e) => !autoPlay && e.currentTarget.pause()}
                onError={(e) => {
                    console.error("Video Playback Error", e);
                    setVideoError(true); 
                }}
                className="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-700 group-hover:scale-[1.02]"
            />
            
            {/* Play Overlay (Only visual) */}
            {!autoPlay && !videoError && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/5 group-hover:bg-transparent transition-all">
                 <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center border border-white/50 shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 text-neutral-900 fill-neutral-900 ml-0.5" />
                 </div>
              </div>
            )}

            {/* Error Overlay (Instead of hiding video) */}
            {videoError && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
                    <p className="text-white text-xs font-bold px-3 py-2 bg-red-500/90 rounded-lg shadow-lg">Video Stream Error</p>
                 </div>
            )}
          </div>
      );
  }

  // Priority 3: Static Image (If no video URL)
  if (thumbnail && !imgError) {
      return (
          <div className={`relative w-full h-full bg-neutral-100 dark:bg-neutral-800 ${className}`}>
            <img 
                src={thumbnail} 
                alt={alt || "Thumbnail"} 
                className="object-cover w-full h-full"
                onError={() => setImgError(true)}
            />
          </div>
      );
  }

  // Priority 3: Instagram Embed (Reliable Fallback)
  // Only used if Thumbnail AND Video failed (or are missing)
  if (embedUrl && (showEmbed || imgError)) {
      return (
          <div className={`relative w-full h-full overflow-hidden bg-background-alt ${className}`}>
             <iframe 
                src={embedUrl} 
                className="absolute inset-0 w-full h-full object-cover" 
                frameBorder="0" 
                scrolling="no" 
                allowTransparency={true}
                allow="encrypted-media"
                style={{ pointerEvents: autoPlay ? 'auto' : 'none' }}
             />
             {!autoPlay && <div className="absolute inset-0 z-10 bg-transparent" />} 
          </div>
      );
  }

  // Final Placeholder
  return (
      <div className={`w-full h-full flex items-center justify-center bg-background-alt text-muted ${className}`}>
          <ImageIcon className="w-8 h-8" />
      </div>
  );
}
