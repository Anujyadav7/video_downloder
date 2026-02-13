import InputBox from "@/components/InputBox";
import History from "@/components/History";
import Features from "@/components/Features";
import FAQ from "@/components/FAQ";
import ToolNavigation from "@/components/ToolNavigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instagram Video Downloader - Fast, Free & Secure",
  description: "Download Instagram videos, reels, stories, and photos in high quality. No watermark, no login required. Works on Android, iPhone, and PC.",
};

export default function Home() {
  const faqItems = [
    {
      question: "How do I download Instagram videos?",
      answer: "Copy the URL of the Instagram video/reel, paste it into the input box above, and click the Download button. Choose your preferred quality and save it to your device.",
    },
    {
      question: "Is it free to use FastSave?",
      answer: "Yes, FastSave is 100% free to use. You can download unlimited videos, photos, and stories without any hidden charges or subscription fees.",
    },
    {
      question: "Do I need to log in to my Instagram account?",
      answer: "No, you do not need to log in to your Instagram account. We do not ask for your credentials. Just paste the link and download.",
    },
    {
      question: "Can I download videos from private accounts?",
      answer: "No, currently we only support downloading content from public Instagram accounts due to privacy restrictions.",
    },
    {
      question: "Where are videos saved after downloading?",
      answer: "Videos are usually saved in the 'Downloads' folder on your device, or wherever your browser is set to save files.",
    },
    {
      question: "Does FastSave work on iPhone/iPad?",
      answer: "Yes, FastSave works perfectly on iOS devices using the Safari or Chrome browser.",
    },
  ];

  return (
    <div className="flex flex-col items-center">
       {/* Tool Navigation Bar */}
       <ToolNavigation />

      {/* Hero Section */}
      <section className="w-full bg-background pt-8 pb-20 px-4">
        <div className="container-custom text-center">
          <h1 className="mb-4 text-3xl md:text-4xl font-bold text-heading">
            Instagram Video Downloader
          </h1>
          <p className="text-lg text-muted mb-10 max-w-2xl mx-auto">
            Download Instagram Videos, Reels, Photos, and Stories directly to your device. Fast, free, and secure.
          </p>
          
          <InputBox type="reels" />
          
          <History />
        </div>
      </section>

      {/* Features Section */}
      <Features />

      {/* How it works / SEO Content */}
      <section className="py-16 w-full bg-background">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-heading mb-4">
              How to Download Instagram Videos?
            </h2>
            <p className="text-muted">
              Follow these simple steps to save your favorite content.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
             <div className="text-center p-6">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
                <h3 className="font-bold mb-2 text-heading">Copy Link</h3>
                <p className="text-sm text-muted">Open Instagram and copy the link of the video or photo you want to download.</p>
             </div>
             <div className="text-center p-6">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
                <h3 className="font-bold mb-2 text-heading">Paste Link</h3>
                <p className="text-sm text-muted">Paste the link into the input field on FastSave and click the Download button.</p>
             </div>
             <div className="text-center p-6">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
                <h3 className="font-bold mb-2 text-heading">Download</h3>
                <p className="text-sm text-muted">Wait for the video to process, then click the Download button to save it.</p>
             </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 w-full bg-background-alt">
        <div className="container-custom">
           <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-heading mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          <FAQ items={faqItems} />
        </div>
      </section>
    </div>
  );
}
