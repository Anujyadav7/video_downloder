
import InputBox from "@/components/InputBox";
import History from "@/components/History";
import Features from "@/components/Features";
import FAQ from "@/components/FAQ";
import ToolNavigation from "@/components/ToolNavigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instagram Photo Downloader - Download Full Size Images",
  description: "Download high-quality Instagram photos and profile pictures instantly. Free online tool for mobile and PC.",
};

export default function PhotoPage() {
  const faqItems = [
    {
      question: "How to download Instagram Photos?",
      answer: "Copy the post link, paste it into the box, and download the full-resolution image.",
    },
    {
      question: "Does it support carousel posts?",
      answer: "Yes, you can download all images from a carousel post.",
    },
    {
      question: "Is it HD?",
      answer: "We download the highest resolution available on Instagram's servers.",
    },
  ];

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground transition-colors duration-300">
       <ToolNavigation />

      <section className="w-full pt-12 pb-20 px-4 flex flex-col items-center">
        <div className="container-custom w-full max-w-5xl">
          <InputBox type="photo" />
          <div className="mt-12">
            <History />
          </div>
        </div>
      </section>

      <Features />

      <section className="py-16 w-full bg-background-alt">
        <div className="container-custom">
           <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Photo FAQ</h2>
          </div>
          <FAQ items={faqItems} />
        </div>
      </section>
    </div>
  );
}
