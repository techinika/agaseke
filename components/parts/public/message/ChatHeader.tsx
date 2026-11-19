export function ChatHeader({
  name,
  profilePicture,
}: {
  name: string;
  profilePicture?: string;
}) {
  return (
    <div className="p-4 border-b border-line bg-gradient-to-r from-muted to-brand-soft">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-brand-soft rounded-full flex items-center justify-center font-bold text-brand-strong text-lg overflow-hidden">
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
          <p className="text-caption text-brand-strong font-bold uppercase tracking-widest">
            Message Creator
          </p>
        </div>
      </div>
    </div>
  );
}
