/* eslint-disable @typescript-eslint/no-explicit-any */
import { Trophy, X } from "lucide-react";
import { Giveaway } from "./types";

export function WinnersModal({
  giveaway,
  onClose,
}: {
  giveaway: Giveaway;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-card w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-border bg-gradient-to-r from-orange-600 to-amber-600">
          <h2 className="text-xl font-bold text-white">{giveaway.title}</h2>
          <p className="text-white/80 text-sm mt-1">Winners Announced!</p>
          {giveaway.partners.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs text-white/60">Sponsored by:</span>
              {giveaway.partners.map((partner: any) => (
                <div
                  key={partner.id}
                  className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded-full"
                >
                  {partner.logo && (
                    <img
                      src={partner.logo}
                      alt={partner.name}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  )}
                  <span className="text-xs font-medium text-white">
                    {partner.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {giveaway.winners.length === 0 ? (
            <div className="text-center py-12">
              <Trophy size={40} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No winners yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {giveaway.winners.map((winner: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-center gap-4 p-4 rounded-xl ${
                    idx === 0
                      ? "bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-300"
                      : "bg-muted"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                      idx === 0
                        ? "bg-orange-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {winner.winnerPhoto ? (
                      <img
                        src={winner.winnerPhoto}
                        alt={winner.winnerName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      winner.winnerName?.[0] || "?"
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{winner.winnerName}</p>
                    <p className="text-xs text-muted-foreground">
                      Won: {winner.rewardTitle}
                    </p>
                  </div>
                  {idx === 0 && (
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      1st
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-3 bg-muted rounded-xl font-bold hover:bg-muted transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
