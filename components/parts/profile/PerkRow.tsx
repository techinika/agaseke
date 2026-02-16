export function PerkRow({
  icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-1 w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-slate-900">{title}</h4>
        <p className="text-sm text-slate-500 leading-relaxed font-medium">
          {desc}
        </p>
      </div>
    </div>
  );
}
