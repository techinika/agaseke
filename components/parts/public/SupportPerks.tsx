import { Calendar, Lock, MessageCircle, Star, Zap } from "lucide-react";
import { PerkRow } from "../profile/PerkRow";

export const SupportPerks = ({ name }: { name: string }) => {
  return (
    <div className="max-w-2xl mx-auto px-6 mt-16 space-y-12">
      {/* SUPPORT PERKS SECTION */}
      <section className="bg-surface border border-line p-8 rounded-control shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-strong mb-8 flex items-center gap-2">
          <Star size={14} fill="currentColor" /> Why Send a Gift to{" "}
          {name.split(" ")[0]}?
        </h3>
        <div className="space-y-6">
          <PerkRow
            icon={<Lock className="text-brand-strong" />}
            title="Private Contents"
            desc="Access daily life updates and exclusive behind-the-scenes footage."
          />
          <PerkRow
            icon={<Zap className="text-brand-strong" />}
            title="Early Access"
            desc="Be the first to see new content before it hits the public feed."
          />
          <PerkRow
            icon={<Calendar className="text-brand-strong" />}
            title="Private Gatherings"
            desc="Get exclusive invites to intimate meetups and private events."
          />
          <PerkRow
            icon={<MessageCircle className="text-brand-strong" />}
            title="Direct Connection"
            desc="Top gifters get direct messaging access to the creator."
          />
        </div>
      </section>

      {/* {creator.events.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-fg">
              Next Gathering
            </h3>
            <div className="h-px bg-surface-sunken flex-1 ml-6" />
          </div>
          {creator.events.map((event: any, i: number) => (
            <div
              key={i}
              className="bg-surface border border-line p-6 rounded-control flex items-center justify-between group hover:border-brand-strong transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="bg-surface-sunken p-4 rounded-control group-hover:bg-brand-soft group-hover:text-brand-strong transition-colors">
                  <Calendar size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{event.title}</h4>
                  <p className="text-sm text-muted-fg font-bold uppercase tracking-widest flex items-center gap-2">
                    {event.date}{" "}
                    <span className="w-1 h-1 bg-surface-sunken-foreground rounded-full" />{" "}
                    {event.type}
                  </p>
                </div>
              </div>
              <button className="bg-foreground text-background px-4 py-2 rounded-control text-xs font-bold uppercase group-hover:bg-brand-strong group-hover:text-on-brand transition-colors">
                Join
              </button>
            </div>
          ))}
        </section>
      )} */}
    </div>
  );
};
