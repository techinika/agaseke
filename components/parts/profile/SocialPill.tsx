/* eslint-disable @typescript-eslint/no-explicit-any */
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
      className="flex items-center gap-2 px-4 py-2 bg-card border border-border-strong rounded-full text-xs font-bold text-muted-foreground hover:border-orange-500 hover:text-orange-600 hover:shadow-md transition-all capitalize"
    >
      {icon} <span>{label}</span>
    </a>
  );
}
