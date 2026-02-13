"use client";

import Link from "next/link";
import { Share2 } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed w-full top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container-custom flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 z-50">
          <span className="text-xl md:text-2xl font-bold tracking-tight text-heading">
            FastVideoSave<span className="text-primary">.Net</span>
          </span>
        </Link>
        
        {/* Share Button (Right side, as per vibe) */}
        <button className="p-2 hover:bg-background-alt rounded-full transition-colors text-heading">
            <Share2 className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </div>
    </header>
  );
}

