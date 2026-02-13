import Link from "next/link";

const links = {
  features: [
    { name: "Reels Downloader", href: "/reels" },
    { name: "Photo Downloader", href: "/photos" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Terms of Service", href: "/terms-of-service" },
    { name: "DMCA", href: "/dmca" },
    { name: "Contact", href: "/contact" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t pt-16 pb-8 bg-background-alt border-border">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xl bg-primary">
                V
              </div>
              <span className="text-xl font-bold text-heading">
                FastSave
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-muted">
              The fastest way to download Instagram content. Secure, free, and
              compatible with all devices.
            </p>
          </div>

          {/* Spacer */}
          <div className="hidden md:block"></div>

          {/* Links */}
          <div>
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-heading">
              Tools
            </h3>
            <ul className="space-y-3">
              {links.features.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="hover:text-primary transition-colors text-sm text-muted"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-heading">
              Legal
            </h3>
            <ul className="space-y-3">
              {links.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="hover:text-pink-500 transition-colors text-sm"
                    style={{ color: 'var(--foreground-muted)' }}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t text-center md:text-left flex flex-col md:flex-row justify-between items-center text-sm border-border text-muted">
          <p>© {new Date().getFullYear()} FastSave. All rights reserved.</p>
          <p className="mt-2 md:mt-0 text-xs">
            We are not affiliated with Instagram or Meta.
          </p>
        </div>
      </div>
    </footer>
  );
}
