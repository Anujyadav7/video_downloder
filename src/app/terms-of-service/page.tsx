import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for FastSave",
};

export default function TermsOfService() {
  return (
    <div className="container-custom py-20 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <div className="prose prose-blue max-w-none text-muted">
        <h2 className="text-2xl font-semibold text-heading mt-8 mb-4">1. Terms</h2>
        <p className="mb-4">
          By accessing this Website, accessible from https://fastvideosave.net, you are agreeing to be bound by these Website Terms and Conditions of Use and agree that you are responsible for the agreement with any applicable local laws. If you disagree with any of these terms, you are prohibited from accessing this site.
        </p>

        <h2 className="text-2xl font-semibold text-heading mt-8 mb-4">2. Use License</h2>
        <p className="mb-4">
          Permission is granted to temporarily download one copy of the materials on FastSave's Website for personal, non-commercial transitory viewing only.
        </p>

        <h2 className="text-2xl font-semibold text-heading mt-8 mb-4">3. Disclaimer</h2>
        <p className="mb-4">
          All the materials on FastSave’s Website are provided "as is". FastSave makes no warranties, may it be expressed or implied, therefore negates all other warranties. Furthermore, FastSave does not make any representations concerning the accuracy or likely results of the use of the materials on its Website or otherwise relating to such materials or on any sites linked to this Website.
        </p>
        
        <p className="font-bold mt-4">
            You must only download content that you own or have permission to download. We are not responsible for any copyright infringement.
        </p>
      </div>
    </div>
  );
}
