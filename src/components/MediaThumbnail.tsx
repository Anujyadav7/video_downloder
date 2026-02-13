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

  // Priority 1: Static Thumbnail (Fastest)
  if (thumbnail && !imgError) {
    return (
      <img 
        src={thumbnail} 
        alt={alt || "Thumbnail"} 
        className={`object-cover w-full h-full ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  // Priority 2: Local Video Proxy (Safe & Fast)
  // We try this before the Embed. 
  if (videoUrl && (type === 'video' || type === 'reels' || !type) && !videoError) {
      return (
          <div className={`relative w-full h-full bg-background-alt ${className}`}>
            <video 
                src={`${videoUrl}#t=0.001`} 
                muted
                loop
                playsInline
                autoPlay={autoPlay}
                preload="auto"
                onMouseOver={(e) => e.currentTarget.play().catch(() => {})}
                onMouseOut={(e) => !autoPlay && e.currentTarget.pause()}
                onError={() => setVideoError(true)} // Trigger fallback to Embed
                className="object-cover w-full h-full"
            />
            {!autoPlay && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10">
                <Play className="w-8 h-8 text-white/80 fill-white/50" />
              </div>
            )}
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
