
import InputBox from "@/components/InputBox";
import History from "@/components/History";
import Features from "@/components/Features";
import FAQ from "@/components/FAQ";
import ToolNavigation from "@/components/ToolNavigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Multiplatform Video Downloader - YouTube, Instagram, TikTok & More",
  description: "Download videos from YouTube, Instagram, Facebook, TikTok, and Twitter in high quality. AI-powered script extraction in Hinglish. Fast, free, and secure.",
};

export default function Home() {
  const faqItems = [
    {
      question: "Which platforms are supported?",
      answer: "We support downloading videos from YouTube (Shorts & Long), Instagram (Reels & Posts), Facebook, TikTok, and Twitter (X).",
    },
    {
      question: "How to use the AI Script Extractor?",
      answer: "Paste a video link and click 'Get Script'. Our AI will generate a Romanized Hinglish transcript for you in seconds.",
    },
    {
      question: "Is there a limit on video length?",
      answer: "For transcription, we support videos up to 3 minutes long to ensure speed and accuracy. Downloading has no strict length limit.",
    },
    {
      question: "Is it free?",
      answer: "Yes, 100% free with no hidden charges.",
    },
    {
      question: "Can I download private videos?",
      answer: "Currently, we only support public content.",
    },
  ];

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground transition-colors duration-300">
       {/* Tool Navigation Bar */}
       <ToolNavigation />

      {/* Hero Section */}
      <section className="w-full pt-12 pb-20 px-4 flex flex-col items-center">
        <div className="container-custom w-full max-w-5xl">
          {/* Dynamic Input Box takes center stage */}
          <InputBox type="video" />
          
          <div className="mt-12">
            <History />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <Features />

      {/* How it works */}
      <section className="py-16 w-full bg-surface border-y border-border">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
              How it Works
            </h2>
            <p className="text-muted">
              Simple steps to download or transcribe your favorite content.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
             <div className="text-center p-6 rounded-2xl bg-background border border-border hover:border-primary/50 transition-all group">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4 group-hover:scale-110 transition-transform">1</div>
                <h3 className="font-bold mb-2">Copy Link</h3>
                <p className="text-sm text-muted">Copy the URL from YouTube, Instagram, or TikTok.</p>
             </div>
             <div className="text-center p-6 rounded-2xl bg-background border border-border hover:border-primary/50 transition-all group">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4 group-hover:scale-110 transition-transform">2</div>
                <h3 className="font-bold mb-2">Paste & Go</h3>
                <p className="text-sm text-muted">Paste into the Smart Input box above and hit Download.</p>
             </div>
             <div className="text-center p-6 rounded-2xl bg-background border border-border hover:border-primary/50 transition-all group">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4 group-hover:scale-110 transition-transform">3</div>
                <h3 className="font-bold mb-2">Save or Transcribe</h3>
                <p className="text-sm text-muted">Download HD video or extract AI-powered Hinglish script.</p>
             </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 w-full bg-background-alt">
        <div className="container-custom">
           <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          <FAQ items={faqItems} />
        </div>
      </section>
    </div>
  );
}
