"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items: FAQItem[];
}

export default function FAQ({ items }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {items.map((item, index) => (
        <div
          key={index}
          className="bg-surface border border-border rounded-xl overflow-hidden transition-all duration-200"
        >
          <button
            onClick={() => setOpenIndex(index === openIndex ? null : index)}
            className="w-full flex items-center justify-between p-5 text-left bg-surface hover:bg-background-alt transition-colors"
          >
            <span className="font-semibold text-heading pr-8">
              {item.question}
            </span>
            <ChevronDown
              className={`w-5 h-5 text-muted transition-transform duration-300 ${
                index === openIndex ? "rotate-180" : ""
              }`}
            />
          </button>
          
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
              index === openIndex ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div className="p-5 pt-0 text-muted leading-relaxed">
                {item.answer}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
