import Link from "next/link";
import { FaInstagram, FaTwitter, FaLinkedin, FaYoutube } from "react-icons/fa";
import { RiMediumFill } from "react-icons/ri";

export default function Footer() {
  return (
    <footer className="bg-slate-950 pt-20 pb-10 px-6 text-slate-400 border-t border-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="w-full flex flex-wrap gap-12 mb-20 justify-between">
          <div className="max-w-xs">
            <div className="text-xl font-bold tracking-tight text-white mb-6 uppercase">
              agaseke<span className="text-orange-600">.me</span>
            </div>
            <p className="text-sm leading-relaxed mb-8">
              Supporting the next generation of Rwandan creators, artists, and
              educators.
            </p>

            {/* Social Media Icons */}
            <div className="flex items-center gap-5">
              <SocialIcon
                href="https://instagram.com/agaseke_support"
                icon={<FaInstagram size={20} />}
              />
              <SocialIcon
                href="https://twitter.com/agaseke_support"
                icon={<FaTwitter size={20} />}
              />
              <SocialIcon
                href="https://linkedin.com/company/agaseke"
                icon={<FaLinkedin size={20} />}
              />
              <SocialIcon
                href="https://www.youtube.com/channel/UCeLwxQrpnxYip5G-jXyTRBQ"
                icon={<FaYoutube size={20} />}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-12 md:gap-24">
            <FooterGroup
              title="Platform"
              links={[
                { label: "Explore", href: "/explore" },
                { label: "Help Center", href: "/help-center" },
                {
                  label: "Blog",
                  href: "https://medium.com/@agasekeforcreators",
                  isExternal: true,
                },
              ]}
            />

            <FooterGroup
              title="Legal"
              links={[
                { label: "Privacy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
                { label: "Payout Policy", href: "/payout-policy" },
              ]}
            />
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs">© 2026 Agaseke. Made with ❤️ in Kigali.</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-green-500">
              Powered by{" "}
              <Link href="https://techinika.co.rw" target="_blank">
                Techinika
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* Helper Components */

function SocialIcon({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-slate-500 hover:text-orange-500 transition-all transform hover:-translate-y-1"
    >
      {icon}
    </a>
  );
}

function FooterGroup({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; isExternal?: boolean }[];
}) {
  return (
    <div>
      <h4 className="font-bold text-white text-sm mb-6 uppercase tracking-widest">
        {title}
      </h4>
      <ul className="space-y-4 text-sm">
        {links.map((link) => (
          <li key={link.label}>
            {link.isExternal ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-orange-500 transition-colors flex items-center gap-2"
              >
                {link.label}
                <RiMediumFill className="text-orange-600/50" />
              </a>
            ) : (
              <Link
                href={link.href}
                className="hover:text-orange-500 transition-colors"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
