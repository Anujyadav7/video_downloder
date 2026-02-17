
import InputBox from "@/components/InputBox";
import History from "@/components/History";
import Features from "@/components/Features";
import FAQ from "@/components/FAQ";
import ToolNavigation from "@/components/ToolNavigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instagram Reel Script Generator - AI Transcription for Reels",
  description: "Convert Instagram Reels to text instantly. Extract scripts from any Reel in Romanized Hinglish. Free AI transcription tool.",
};

export default function ScriptPage() {
  const faqItems = [
    {
      question: "How does the AI Script Generator work?",
      answer: "Paste an Instagram Reel link, click 'Get Script', and our AI listens to the audio to generate a word-for-word transcript in Hinglish.",
    },
    {
      question: "Which languages are supported?",
      answer: "Currently, we specialize in Hinglish (Hindi + English) transcription derived from speech.",
    },
    {
      question: "Is it free?",
      answer: "Yes, the script generator is 100% free to use.",
    },
  ];

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground transition-colors duration-300">
       <ToolNavigation />

      <section className="w-full pt-12 pb-20 px-4 flex flex-col items-center">
        <div className="container-custom w-full max-w-5xl">
          <InputBox type="script" />
          <div className="mt-12">
            <History />
          </div>
        </div>
      </section>

      <Features />

      <section className="py-16 w-full bg-background-alt">
        <div className="container-custom">
           <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Script FAQ</h2>
          </div>
          <FAQ items={faqItems} />
        </div>
      </section>
    </div>
  );
}
