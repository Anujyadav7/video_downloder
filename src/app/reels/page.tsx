
import InputBox from "@/components/InputBox";
import History from "@/components/History";
import Features from "@/components/Features";
import FAQ from "@/components/FAQ";
import ToolNavigation from "@/components/ToolNavigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instagram Reels Downloader - Save Reels Videos Online",
  description: "Download Instagram Reels videos in high quality MP4 format. Fast, free, and no watermark. Best Reels Saver for mobile and PC.",
};

export default function ReelsPage() {
  const faqItems = [
    {
      question: "How to download Instagram Reels?",
      answer: "Copy the Reel link, paste it into our input box, and hit Download. It's that simple.",
    },
    {
      question: "Do you download Reels with audio?",
      answer: "Yes, all Reels are downloaded with their original audio.",
    },
  ];

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground transition-colors duration-300">
       <ToolNavigation />

      <section className="w-full pt-12 pb-20 px-4 flex flex-col items-center">
        <div className="container-custom w-full max-w-5xl">
          <InputBox type="video" />
          <div className="mt-12">
            <History />
          </div>
        </div>
      </section>

      <Features />

      <section className="py-16 w-full bg-background-alt">
        <div className="container-custom">
           <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Reels FAQ</h2>
          </div>
          <FAQ items={faqItems} />
        </div>
      </section>
    </div>
  );
}
