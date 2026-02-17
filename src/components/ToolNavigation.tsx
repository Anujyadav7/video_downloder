
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Image as ImageIcon, Sparkles } from "lucide-react";

/**
 * Premium SaaS-Style Navigation
 * Clean, Monochrome, Minimalist. No heavy borders or shadows.
 */

const tools = [
  { name: "Video", href: "/", icon: Film },
  { name: "Script", href: "/script", icon: Sparkles },
  { name: "Photo", href: "/photos", icon: ImageIcon },
];

export default function ToolNavigation() {
  const pathname = usePathname();

  return (
    <div className="w-full bg-white border-b border-gray-100 py-4 dark:bg-neutral-900 dark:border-neutral-800 transition-colors">
      <div className="container-custom">
        <div className="flex items-center justify-center gap-1 sm:gap-2 px-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            
            // Logic: Is this tool active? (Note: Video is root / so check strictly or startsWith for others)
            const isActive = tool.href === "/" 
               ? pathname === "/" 
               : pathname.startsWith(tool.href);
            
            return (
              <Link
                key={tool.name}
                href={tool.href}
                className={`
                  relative flex items-center gap-2 px-6 py-2.5 rounded-full transition-all duration-300 ease-out group
                  ${isActive 
                    ? "bg-zinc-900 text-white shadow-md dark:bg-white dark:text-zinc-900 active:scale-[0.98]" 
                    : "bg-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  }
                `}
              >
                <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? "" : "opacity-70 group-hover:opacity-100"}`} strokeWidth={isActive ? 2 : 1.8} />
                <span className={`text-sm md:text-base font-semibold tracking-tight ${isActive ? "" : "font-medium"}`}>
                  {tool.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
