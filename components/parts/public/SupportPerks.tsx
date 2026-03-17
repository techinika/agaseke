import { Calendar, Lock, MessageCircle, Star, Zap } from "lucide-react";
import { PerkRow } from "../profile/PerkRow";

export const SupportPerks = ({ name }: { name: string }) => {
  return (
    <div className="max-w-2xl mx-auto px-6 mt-16 space-y-12">
      {/* SUPPORT PERKS SECTION */}
      <section className="bg-white border border-slate-100 p-8 rounded-lg shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600 mb-8 flex items-center gap-2">
          <Star size={14} fill="currentColor" /> Why Send a Gift to{" "}
          {name.split(" ")[0]}?
        </h3>
        <div className="space-y-6">
          <PerkRow
            icon={<Lock className="text-orange-500" />}
            title="Private Contents"
            desc="Access daily life updates and exclusive behind-the-scenes footage."
          />
          <PerkRow
            icon={<Zap className="text-orange-500" />}
            title="Early Access"
            desc="Be the first to see new content before it hits the public feed."
          />
          <PerkRow
            icon={<Calendar className="text-orange-500" />}
            title="Private Gatherings"
            desc="Get exclusive invites to intimate meetups and private events."
          />
          <PerkRow
            icon={<MessageCircle className="text-orange-500" />}
            title="Direct Connection"
            desc="Top gifters get direct messaging access to the creator."
          />
        </div>
      </section>

      {/* {creator.events.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Next Gathering
            </h3>
            <div className="h-px bg-slate-100 flex-1 ml-6" />
          </div>
          {creator.events.map((event: any, i: number) => (
            <div
              key={i}
              className="bg-white border border-slate-100 p-6 rounded-lg flex items-center justify-between group hover:border-orange-500 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="bg-slate-50 p-4 rounded-lg group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                  <Calendar size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{event.title}</h4>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                    {event.date}{" "}
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />{" "}
                    {event.type}
                  </p>
                </div>
              </div>
              <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase group-hover:bg-orange-600 transition-colors">
                Join
              </button>
            </div>
          ))}
        </section>
      )} */}
    </div>
  );
};
