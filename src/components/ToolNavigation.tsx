"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Video, Music, Image, Camera, Facebook, Captions } from "lucide-react";

const tools = [
  { name: "Reels", href: "/reels", icon: Film },
  { name: "Scripts", href: "/script", icon: Captions },
  { name: "Photos", href: "/photos", icon: Image },
];

export default function ToolNavigation() {
  const pathname = usePathname();

  return (
    <div className="w-full bg-surface py-6">
      <div className="container-custom">
        <div className="flex items-center justify-center gap-4 md:gap-8 px-4">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = pathname === tool.href;
            
            return (
              <Link
                key={tool.name}
                href={tool.href}
                className={`flex flex-col items-center gap-2 group min-w-[64px] transition-all duration-200 ${
                  isActive ? "opacity-100 scale-105" : "opacity-60 hover:opacity-100 hover:scale-105"
                }`}
              >
                <div
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all duration-200 border-2 ${ 
                    isActive
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted hover:border-primary/50 hover:text-primary bg-background-alt/50"
                  }`}
                >
                  <Icon className={`w-6 h-6 md:w-7 md:h-7`} strokeWidth={isActive ? 2 : 1.5} />
                </div>
                <span
                  className={`text-sm font-medium ${
                    isActive ? "text-primary" : "text-muted group-hover:text-primary"
                  }`}
                >
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
