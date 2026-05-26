/* eslint-disable @typescript-eslint/no-explicit-any */
import { Trophy, Star, Sparkles, ArrowRight } from "lucide-react";
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
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
              {giveaway.type === "random" ? "Lucky Draw" : "Challenge"}
            </span>
            <span className="bg-slate-500/80 px-2 py-1 rounded-full text-xs font-bold">
              Ended
            </span>
          </div>
          <button
            onClick={onViewWinners}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
          >
            <Trophy size={18} />
          </button>
        </div>
        <h3 className="text-xl font-bold mb-2">{giveaway.title}</h3>
        <p className="text-white/80 text-sm">{giveaway.description}</p>
      </div>

      <div className="p-6">
        {won ? (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} className="text-white" />
            </div>
            <h4 className="text-xl font-bold text-green-800 mb-2">
              Congratulations!
            </h4>
            <p className="text-green-700">
              You won <span className="font-bold">{reward}</span>!
            </p>
            <button
              onClick={onViewWinners}
              className="mt-4 bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition"
            >
              View All Winners
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Trophy size={20} className="text-orange-500" />
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
                    className="flex items-center gap-3 bg-muted rounded-xl p-3"
                  >
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-muted-foreground font-bold overflow-hidden">
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
                      <p className="text-xs text-muted-foreground">
                        Won: {winner.rewardTitle}
                      </p>
                    </div>
                    {idx === 0 && (
                      <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-full">
                        1st
                      </span>
                    )}
                  </div>
                ))}
            </div>
            {giveaway.winners.length > 3 && (
              <button
                onClick={onViewWinners}
                className="w-full py-3 border border-border rounded-xl font-bold text-sm text-muted-foreground hover:bg-muted transition"
              >
                View All {giveaway.winners.length} Winners
              </button>
            )}
          </div>
        )}

        <Link
          href={`/${creatorHandle}/giveaways/${giveaway.id}`}
          className="flex items-center justify-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 transition mt-4"
        >
          View Details <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
