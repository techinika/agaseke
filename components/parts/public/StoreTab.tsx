import { Store } from "lucide-react";

export const StoreTab = () => {
  return (
    <div className="text-center py-20 animate-in fade-in">
      <Store className="mx-auto text-orange-600 mb-4" size={48} />
      <h3 className="text-2xl font-bold">Coming Soon!</h3>
      <p className="text-slate-500">
        We are building a marketplace for digital assets and merchs.
      </p>
    </div>
  );
};
