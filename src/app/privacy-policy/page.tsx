import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for FastSave",
};

export default function PrivacyPolicy() {
  return (
    <div className="container-custom py-20 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose prose-blue max-w-none text-muted">
        <p className="mb-4">Effective Date: {new Date().toLocaleDateString()}</p>
        <p className="mb-4">
          At FastSave, accessible from https://fastvideosave.net, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by FastSave and how we use it.
        </p>

        <h2 className="text-2xl font-semibold text-heading mt-8 mb-4">Log Files</h2>
        <p className="mb-4">
          FastSave follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services' analytics. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable.
        </p>

        <h2 className="text-2xl font-semibold text-heading mt-8 mb-4">Cookies and Web Beacons</h2>
        <p className="mb-4">
          Like any other website, FastSave uses 'cookies'. These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.
        </p>
      </div>
    </div>
  );
}
