import InputBox from "@/components/InputBox";
import History from "@/components/History";
import Features from "@/components/Features";
import FAQ from "@/components/FAQ";
import ToolNavigation from "@/components/ToolNavigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Script Extractor - Transcribe Instagram Reels & Videos",
  description: "Extract text scripts from Instagram Reels and videos instantly using AI. Get Hinglish transcripts, copy to clipboard, and repurpose content.",
};

export default function ScriptPage() {
  const faqItems = [
    {
      question: "How does the AI Script Extractor work?",
      answer: "We use advanced AI to listen to the audio of the Instagram Reel or video and transcribe it into text. It works best with clear speech.",
    },
    {
      question: "Does it support Hinglish?",
      answer: "Yes! Our AI is optimized to understand and transcribe Hinglish (Hindi + English) speech accurately.",
    },
     {
      question: "Is it free?",
      answer: "Yes, the script extraction feature is completely free to use.",
    },
    {
      question: "Can I edit the script?",
      answer: "Yes, once the script is generated, you can edit it directly in the text box before checking or copying it.",
    },
  ];

  return (
    <div className="flex flex-col items-center">
      <ToolNavigation />
      <section className="w-full bg-background pt-8 pb-20 px-4">
         <div className="container-custom text-center">
          <h1 className="mb-4 text-3xl md:text-4xl font-bold text-heading">
            AI Script Extractor
          </h1>
          <p className="text-lg text-muted mb-10 max-w-2xl mx-auto">
            Turn Instagram Reels into text instantly. Perfect for content creators and marketers.
          </p>
          {/* Reuse InputBox but we might want to default to script mode? 
              Currently InputBox handles download first, then script. 
              The user flow is: Paste Link -> Download -> Extract Script.
          */}
          <InputBox type="script" />
          <History />
        </div>
      </section>
      <Features />
      <section className="py-16 w-full bg-background-alt">
        <div className="container-custom">
           <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-heading mb-4">
              Script Extractor FAQ
            </h2>
          </div>
          <FAQ items={faqItems} />
        </div>
      </section>
    </div>
  );
}
