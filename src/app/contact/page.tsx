import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact FastSave Support",
};

export default function Contact() {
  return (
    <div className="container-custom py-20 max-w-2xl text-center">
      <h1 className="text-3xl font-bold mb-8">Contact Us</h1>
      <p className="text-foreground-muted mb-8">
        Have questions or feedback? Reach out to us.
      </p>
      
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-border">
        <p className="text-lg mb-4">You can email us at:</p>
        <a href="mailto:support@fastvideosave.net" className="text-xl font-bold text-primary hover:underline">
            support@fastvideosave.net
        </a>
      </div>
    </div>
  );
}
