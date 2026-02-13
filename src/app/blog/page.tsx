import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog & Guides - FastSave",
  description: "Read our latest guides on how to download Instagram content.",
};

export default function Blog() {
  const posts = [
    {
      title: "How to Download Instagram Reels on iPhone",
      excerpt: "A step-by-step guide to saving Reels to your camera roll on iOS devices.",
      date: "October 10, 2023",
      slug: "download-reels-iphone"
    },
    {
      title: "Best Instagram Video Downloaders in 2024",
      excerpt: "We compare the top tools for saving Instagram videos securely.",
      date: "September 15, 2023",
      slug: "best-downloaders-2024"
    },
    {
      title: "How to Save Instagram Stories with Music",
      excerpt: "Learn how to keep the audio when downloading Instagram Stories.",
      date: "August 20, 2023",
      slug: "save-stories-music"
    }
  ];

  return (
    <div className="container-custom py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">FastSave Blog</h1>
        <p className="text-foreground-muted max-w-2xl mx-auto">
            Tips, tricks, and guides for Instagram users.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {posts.map((post) => (
            <article key={post.slug} className="bg-white rounded-xl overflow-hidden border border-border hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gray-100 w-full" /> 
                <div className="p-6">
                    <p className="text-xs text-foreground-muted mb-2">{post.date}</p>
                    <h2 className="text-xl font-bold mb-3 hover:text-primary transition-colors">
                        <Link href={`#`}>{post.title}</Link>
                    </h2>
                    <p className="text-foreground-muted text-sm mb-4">
                        {post.excerpt}
                    </p>
                    <Link href={`#`} className="text-primary font-semibold text-sm hover:underline">
                        Read more →
                    </Link>
                </div>
            </article>
        ))}
      </div>
    </div>
  );
}
