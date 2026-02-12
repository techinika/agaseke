export function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div
        className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mb-4`}
      >
        {icon}
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
        {label}
      </p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    </div>
  );
}
