export function ChatHeader({
  name,
  profilePicture,
}: {
  name: string;
  profilePicture?: string;
}) {
  return (
    <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-orange-50">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600 text-lg overflow-hidden">
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            name[0]
          )}
        </div>
        <div>
          <p className="text-sm font-bold">{name}</p>
          <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">
            Message Creator
          </p>
        </div>
      </div>
    </div>
  );
}
