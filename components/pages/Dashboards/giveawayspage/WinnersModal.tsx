import React from "react";
import { X, Trophy } from "lucide-react";
import { Giveaway } from "@/types/giveaway";

export default function WinnersModal({
  giveaway,
  onClose,
}: {
  giveaway: Giveaway;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-card w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold">Winners</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-card-hover rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {giveaway.winners.length === 0 ? (
            <div className="text-center py-12">
              <Trophy size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-muted-foreground">No winners selected yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {giveaway.winners.map((winner, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100"
                >
                  <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center text-orange-700 font-bold">
                    {winner.winnerPhoto ? (
                      <img
                        src={winner.winnerPhoto}
                        alt={winner.winnerName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <Trophy size={20} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{winner.winnerName}</p>
                    <p className="text-xs text-muted-foreground">
                      Won: {winner.rewardTitle}
                    </p>
                  </div>
                  <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
