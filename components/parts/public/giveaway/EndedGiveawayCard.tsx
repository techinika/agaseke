/* eslint-disable @typescript-eslint/no-explicit-any */
import { Trophy, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export function EndedGiveawayCard({
  giveaway,
  won,
  reward,
  onViewWinners,
  creatorHandle,
}: {
  giveaway: any;
  won: boolean;
  reward?: string;
  onViewWinners: () => void;
  creatorHandle?: string;
}) {
  return (
    <div className="bg-surface border border-line rounded-card overflow-hidden shadow-sm">
      <div className="bg-surface-sunken border-b border-line p-6 text-fg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="bg-surface border border-line px-3 py-1 rounded-control text-xs font-bold text-fg">
              {giveaway.type === "random" ? "Lucky Draw" : "Challenge"}
            </span>
            <span className="bg-surface border border-line px-2.5 py-1 rounded-control text-xs font-bold text-muted-fg">
              Ended
            </span>
          </div>
          <button
            type="button"
            aria-label="View winners"
            onClick={onViewWinners}
            className="min-h-11 min-w-11 flex items-center justify-center bg-surface border border-line rounded-control hover:bg-surface-raised transition text-fg"
          >
            <Trophy size={18} />
          </button>
        </div>
        <h3 className="text-xl font-bold mb-2 text-fg">{giveaway.title}</h3>
        <p className="text-muted-fg text-sm">{giveaway.description}</p>
      </div>

      <div className="p-6">
        {won ? (
          <div className="bg-gradient-to-r from-success-bg to-success-bg border-2 border-success rounded-card p-6 text-center">
            <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} className="text-on-brand" />
            </div>
            <h4 className="text-xl font-bold text-success mb-2">
              Congratulations!
            </h4>
            <p className="text-success">
              You won <span className="font-bold">{reward}</span>!
            </p>
            <button
              onClick={onViewWinners}
              className="mt-4 bg-success text-on-success px-6 py-2 rounded-control font-bold hover:bg-success transition"
            >
              View All Winners
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-fg mb-4">
              <Trophy size={20} className="text-brand-strong" />
              <span className="font-bold">
                {giveaway.winners.length} Winner
                {giveaway.winners.length !== 1 ? "s" : ""} Announced
              </span>
            </div>
            <div className="space-y-2">
              {giveaway.winners
                .slice(0, 3)
                .map((winner: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-surface-sunken rounded-control p-3"
                  >
                    <div className="w-10 h-10 bg-surface-sunken rounded-full flex items-center justify-center text-muted-fg font-bold overflow-hidden">
                      {winner.winnerPhoto ? (
                        <img
                          src={winner.winnerPhoto}
                          alt={winner.winnerName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        winner.winnerName?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{winner.winnerName}</p>
                      <p className="text-xs text-muted-fg">
                        Won: {winner.rewardTitle}
                      </p>
                    </div>
                    {idx === 0 && (
                      <span className="bg-brand-soft text-brand-strong text-caption font-bold px-2 py-1 rounded-full">
                        1st
                      </span>
                    )}
                  </div>
                ))}
            </div>
            {giveaway.winners.length > 3 && (
              <button
                onClick={onViewWinners}
                className="w-full py-3 border border-line rounded-control font-bold text-sm text-muted-fg hover:bg-surface-sunken transition"
              >
                View All {giveaway.winners.length} Winners
              </button>
            )}
          </div>
        )}

        <Link
          href={`/${creatorHandle}/giveaways/${giveaway.id}`}
          className="flex items-center justify-center gap-1 text-sm font-medium text-brand-strong hover:text-brand-strong transition mt-4"
        >
          View Details <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
