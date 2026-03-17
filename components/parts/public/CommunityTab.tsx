import { FileText } from "lucide-react";

export const CommunityTab = ({
  publicPosts,
  name,
}: {
  publicPosts: any[];
  name: string;
}) => {
  return (
    <div className="animate-in fade-in duration-500">
      {publicPosts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {publicPosts.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded uppercase tracking-widest text-slate-500">
                  {"Post"}
                </span>
              </div>
              <h4 className="font-bold text-lg mb-2">{item.title}</h4>
              <p className="text-slate-500 text-sm line-clamp-3">
                {item.description || item.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <FileText className="text-slate-300" size={24} />
          </div>
          <h3 className="font-bold text-slate-900">No public posts yet</h3>
          <p className="text-slate-500 text-sm">
            When {name} shares updates, they will appear here.
          </p>
        </div>
      )}
    </div>
  );
};
