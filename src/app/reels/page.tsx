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
     {
      question: "Is it unlimited?",
      answer: "Yes, you can download as many Reels as you want for free.",
    },
    {
      question: "Is the video quality reduced?",
      answer: "No, we download the original quality uploaded to Instagram.",
    },
    {
      question: "Does it work on Android?",
      answer: "Yes, our Reels downloader works on all Android devices via Chrome or any browser.",
    },
  ];

  return (
    <div className="flex flex-col items-center">
      <ToolNavigation />
      <section className="w-full bg-background pt-8 pb-20 px-4">
         <div className="container-custom text-center">
          <h1 className="mb-4 text-3xl md:text-4xl font-bold text-heading">
            Instagram Reels Downloader
          </h1>
          <p className="text-lg text-muted mb-10 max-w-2xl mx-auto">
            Save your favorite Instagram Reels in HD quality. 100% Free and Fast.
          </p>
          <InputBox type="reels" />
          <History />
        </div>
      </section>
      <Features />
      <section className="py-16 w-full bg-background-alt">
        <div className="container-custom">
           <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-heading mb-4">
              Reels FAQ
            </h2>
          </div>
          <FAQ items={faqItems} />
        </div>
      </section>
    </div>
  );
}
