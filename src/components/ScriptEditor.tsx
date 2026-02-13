
"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Sparkles, Loader2 } from "lucide-react";

interface ScriptEditorProps {
  initialScript?: string;
  className?: string;
  loading?: boolean;
}

export default function ScriptEditor({ initialScript = "", className = "", loading = false }: ScriptEditorProps) {
  const [script, setScript] = useState(initialScript);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialScript) {
      setScript(initialScript);
    }
  }, [initialScript]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-surface border border-border rounded-xl overflow-hidden shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background-alt/50">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <Sparkles className="w-4 h-4" />
          <span>AI Script</span>
        </div>
        {loading && (
           <div className="flex items-center gap-2 text-xs text-muted">
             <Loader2 className="w-3 h-3 animate-spin" />
             <span>Transcribing...</span>
           </div>
        )}
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative bg-gray-50 dark:bg-zinc-900 group">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-4">
             <div className="w-full space-y-2">
                 <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4 animate-pulse"></div>
                 <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-full animate-pulse"></div>
                 <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-5/6 animate-pulse"></div>
                 <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-2/3 animate-pulse"></div>
             </div>
             <p className="text-sm text-muted animate-pulse">Listening to audio...</p>
          </div>
        ) : (
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Transcript will appear here..."
            className="w-full h-full p-4 resize-none bg-transparent outline-none text-base leading-relaxed text-foreground min-h-[300px]"
            spellCheck={false}
          />
        )}
      </div>

      {/* Footer / Actions */}
      <div className="p-3 border-t border-border bg-background flex justify-end">
        <button
          onClick={handleCopy}
          disabled={loading || !script}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors 
            hover:bg-primary/10 text-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy to Clipboard</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
