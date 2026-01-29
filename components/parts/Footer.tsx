import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-950 pt-20 pb-10 px-6 text-slate-400 border-t border-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-2 md:col-span-1">
            <div className="text-xl font-black tracking-tight text-white mb-6 uppercase">
              agaseke<span className="text-orange-600">.me</span>
            </div>
            <p className="text-sm leading-relaxed pr-8">
              Supporting the next generation of Rwandan creators, artists, and
              educators.
            </p>
          </div>

          <FooterGroup
            title="Platform"
            links={["Explore", "Pricing", "Gatherings", "Short-links"]}
          />
          <FooterGroup
            title="Resources"
            links={["Help Center", "MoMo Guide", "Rules"]}
          />
          <FooterGroup
            title="Legal"
            links={["Privacy", "Terms", "Payout Policy"]}
          />
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs">© 2026 Agaseke. Made with ❤️ in Kigali.</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-green-500">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>{" "}
              Systems Live
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="font-bold text-white text-sm mb-6 uppercase tracking-widest">
        {title}
      </h4>
      <ul className="space-y-4 text-sm">
        {links.map((link) => (
          <li key={link}>
            <Link href="#" className="hover:text-orange-500 transition-colors">
              {link}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
