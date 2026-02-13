import { Metadata } from "next";

export const metadata: Metadata = {
  title: "DMCA Policy",
  description: "DMCA Copyright Policy for FastSave",
};

export default function DMCA() {
  return (
    <div className="container-custom py-20 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">DMCA Policy</h1>
      <div className="prose prose-blue max-w-none text-muted">
        <p className="mb-4">
          FastSave respects the intellectual property rights of others. It is our policy to respond to any claim that Content posted on the Service infringes on the copyright or other intellectual property rights ("Infringement") of any person or entity.
        </p>
        <p className="mb-4">
          If you are a copyright owner, or authorized on behalf of one, and you believe that the copyrighted work has been copied in a way that constitutes copyright infringement, please submit your claim via email to dmca@fastvideosave.net, with the subject line: "Copyright Infringement" and include in your claim a detailed description of the alleged Infringement.
        </p>

        <h2 className="text-2xl font-semibold text-heading mt-8 mb-4">DMCA Notice</h2>
        <p className="mb-4">
           FastSave is an online service provider as defined in the Digital Millennium Copyright Act. We provide legal copyright owners with the ability to self-publish on the internet by uploading, storing and displaying various media utilizing our services. We do not monitor, screen or otherwise review the media which is uploaded to our servers by users of the service.
        </p>
      </div>
    </div>
  );
}
