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
      <div className="bg-surface w-full max-w-lg rounded-card overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-line bg-gradient-to-r from-brand-strong to-warning">
          <h2 className="text-xl font-bold text-on-brand">{giveaway.title}</h2>
          <p className="text-on-brand/80 text-sm mt-1">Winners Announced!</p>
          {giveaway.partners.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs text-on-brand/60">Sponsored by:</span>
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
                  <span className="text-xs font-medium text-on-brand">
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
              <Trophy size={40} className="mx-auto text-muted-fg mb-4" />
              <p className="text-muted-fg">No winners yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {giveaway.winners.map((winner: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-center gap-4 p-4 rounded-control ${
                    idx === 0
                      ? "bg-gradient-to-r from-brand-soft to-warning-bg border-2 border-brand-strong"
                      : "bg-surface-sunken"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                      idx === 0
                        ? "bg-brand-strong text-on-brand"
                        : "bg-surface-sunken text-muted-fg"
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
                    <p className="text-xs text-muted-fg">
                      Won: {winner.rewardTitle}
                    </p>
                  </div>
                  {idx === 0 && (
                    <span className="bg-brand-strong text-on-brand text-xs font-bold px-2 py-1 rounded-full">
                      1st
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-line">
          <button
            onClick={onClose}
            className="w-full py-3 bg-surface-sunken rounded-control font-bold hover:bg-surface-sunken transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
