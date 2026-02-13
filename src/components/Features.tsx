import { Zap, Shield, Smartphone, Download, CheckCircle, Layout } from "lucide-react";

export default function Features() {
  const features = [
    {
      icon: <Zap className="w-6 h-6 text-yellow-500" />,
      title: "Lightning Fast",
      description: "Download photos, videos, and reels in seconds with our optimized engine.",
    },
    {
      icon: <Shield className="w-6 h-6 text-green-500" />,
      title: "Secure & Private",
      description: "We don't store your data. Your downloads are processed securely and privately.",
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-blue-500" />,
      title: "No Watermark",
      description: "Get clean, high-quality downloads without any annoying watermarks.",
    },
    {
      icon: <Smartphone className="w-6 h-6 text-purple-500" />,
      title: "Mobile Friendly",
      description: "Works perfectly on iPhone, Android, tablets, and desktop browsers.",
    },
     {
      icon: <Layout className="w-6 h-6 text-pink-500" />,
      title: "User FriendlyUI",
      description: "Simple, clean interface designed for the best user experience.",
    },
     {
      icon: <Download className="w-6 h-6 text-orange-500" />,
      title: "Unlimited Downloads",
      description: "Download as much as you want without any daily limits or restrictions.",
    },
  ];

  return (
    <section className="py-16 bg-background-alt">
      <div className="container-custom">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-4 text-heading">Why Choose FastSave?</h2>
          <p className="text-muted">
            We provide the best tools to help you save content from Instagram quickly and easily.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-surface p-8 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow flex flex-col gap-5 text-center items-center h-full"
            >
              <div className="w-12 h-12 bg-background-alt rounded-xl flex items-center justify-center">
                {feature.icon}
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-xl font-bold text-heading">{feature.title}</h3>
                <p className="text-muted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
