import InputBox from "@/components/InputBox";
import History from "@/components/History";
import Features from "@/components/Features";
import FAQ from "@/components/FAQ";
import ToolNavigation from "@/components/ToolNavigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instagram Photo Downloader - Save IG Images High Quality",
  description: "Download Instagram photos, carousels, and profile pictures in full HD resolution. Free online Instagram image downloader.",
};

export default function PhotosPage() {
  const faqItems = [
    {
      question: "Can I download multiple photos? (Carousel)",
      answer: "Yes, our tool supports downloading all photos from a carousel post.",
    },
    {
      question: "What quality are the photos?",
      answer: "We download photos in the highest resolution available on Instagram.",
    },
    {
      question: "Can I save photos to my PC?",
      answer: "Absolutely. You can save photos to your PC, Mac, iPhone, or Android device.",
    },
  ];

  return (
    <div className="flex flex-col items-center">
      <ToolNavigation />
      <section className="w-full bg-background pt-8 pb-20 px-4">
        <div className="container-custom text-center">
          <h1 className="mb-4 text-3xl md:text-4xl font-bold text-heading">
            Instagram Photo Downloader
          </h1>
          <p className="text-lg text-muted mb-10 max-w-2xl mx-auto">
             Download Instagram photos and carousels securely in high resolution.
          </p>
          <InputBox type="photo" />
          <History />
        </div>
      </section>
      <Features />
      <section className="py-16 w-full bg-background-alt">
        <div className="container-custom">
           <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-heading mb-4">
              Photos FAQ
            </h2>
          </div>
          <FAQ items={faqItems} />
        </div>
      </section>
    </div>
  );
}
