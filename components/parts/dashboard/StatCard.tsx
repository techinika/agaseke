/* eslint-disable @typescript-eslint/no-explicit-any */
export function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bg-card p-6 rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
      <div
        className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mb-4`}
      >
        {icon}
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </p>
      <h3 className="text-2xl font-bold text-foreground">{value}</h3>
    </div>
  );
}
