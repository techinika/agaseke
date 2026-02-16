export function SocialPill({
  icon,
  label,
  link,
}: {
  icon: any;
  label: string;
  link: string;
}) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-500 hover:border-orange-500 hover:text-orange-600 hover:shadow-md transition-all capitalize"
    >
      {icon} <span>{label}</span>
    </a>
  );
}
