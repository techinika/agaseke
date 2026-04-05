/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";

interface SpinningWheelProps {
  participants: Array<{
    id: string;
    name: string;
    photo?: string;
  }>;
  numberOfWinners: number;
  onComplete: (winners: Array<{ id: string; name: string; photo?: string }>) => void;
  onClose: () => void;
}

export default function SpinningWheel({
  participants,
  numberOfWinners,
  onComplete,
  onClose,
}: SpinningWheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [currentWinner, setCurrentWinner] = useState<{ id: string; name: string; photo?: string } | null>(null);
  const [winners, setWinners] = useState<Array<{ id: string; name: string; photo?: string }>>([]);
  const [rotation, setRotation] = useState(0);
  const [spinNumber, setSpinNumber] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const wheelColors = [
    "#ea580c", // orange-600
    "#f97316", // orange-500
    "#fb923c", // orange-400
    "#fdba74", // orange-300
    "#fed7aa", // orange-200
    "#ffedd5", // orange-100
    "#1e293b", // slate-800
    "#334155", // slate-700
  ];

  useEffect(() => {
    if (participants.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawWheel = (currentRotation: number) => {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 10;
      const sliceAngle = (2 * Math.PI) / participants.length;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw outer ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 8;
      ctx.stroke();

      // Draw slices
      participants.forEach((participant, index) => {
        const startAngle = currentRotation + index * sliceAngle;
        const endAngle = startAngle + sliceAngle;

        // Draw slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = wheelColors[index % wheelColors.length];
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px sans-serif";
        
        const maxLength = 15;
        let displayName = participant.name;
        if (displayName.length > maxLength) {
          displayName = displayName.substring(0, maxLength - 3) + "...";
        }
        
        ctx.fillText(displayName, radius - 20, 4);
        
        // Draw participant number
        ctx.textAlign = "left";
        ctx.font = "bold 10px sans-serif";
        ctx.fillText(`#${index + 1}`, radius - 10, 4);
        ctx.restore();
      });

      // Draw center circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.strokeStyle = "#ea580c";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw pointer (fixed at top)
      ctx.beginPath();
      ctx.moveTo(centerX, 5);
      ctx.lineTo(centerX - 15, 35);
      ctx.lineTo(centerX + 15, 35);
      ctx.closePath();
      ctx.fillStyle = "#1e293b";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawWheel(rotation);
  }, [participants, rotation]);

  const spinWheel = async () => {
    if (spinning) return;
    setSpinning(true);

    const selectedParticipant = participants[Math.floor(Math.random() * participants.length)];
    
    // Calculate target rotation
    const sliceAngle = (2 * Math.PI) / participants.length;
    const participantIndex = participants.findIndex(p => p.id === selectedParticipant.id);
    const targetAngle = (participantIndex * sliceAngle) + (sliceAngle / 2);
    
    // Add multiple full rotations for effect + target
    const fullRotations = 5 + Math.random() * 3;
    const targetRotation = rotation + (fullRotations * 2 * Math.PI) + (2 * Math.PI - targetAngle) + (Math.PI / 2);

    // Animate
    const duration = 4000;
    const startTime = Date.now();
    const startRotation = rotation;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const newRotation = startRotation + (targetRotation - startRotation) * eased;
      setRotation(newRotation);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Spin complete
        setSpinning(false);
        setCurrentWinner(selectedParticipant);
        setWinners(prev => [...prev, selectedParticipant]);
        setSpinNumber(prev => prev + 1);
        
        // Show winner for 2 seconds before allowing next spin
        setTimeout(() => {
          setCurrentWinner(null);
        }, 2000);
      }
    };

    animate();
  };

  const handleNextSpin = async () => {
    if (winners.length >= numberOfWinners) {
      onComplete(winners);
      return;
    }
    
    await spinWheel();
  };

  const startSpinning = async () => {
    await spinWheel();
  };

  useEffect(() => {
    // Auto-start first spin after mount
    const timer = setTimeout(() => {
      if (!spinning && winners.length === 0) {
        startSpinning();
      }
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Lucky Draw</h2>
              <p className="text-white/80 text-sm mt-1">
                {winners.length}/{numberOfWinners} winner(s) selected
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Wheel */}
        <div className="p-6 bg-slate-50">
          <div className="relative flex justify-center">
            <canvas
              ref={canvasRef}
              width={320}
              height={320}
              className="drop-shadow-xl"
            />
            
            {spinning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={40} className="animate-spin text-orange-500" />
              </div>
            )}
          </div>

          {/* Current Winner Display */}
          {currentWinner && (
            <div className="mt-6 bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl p-4 text-center animate-in zoom-in-95">
              <p className="text-orange-600 text-sm font-bold uppercase tracking-wider">
                Winner #{winners.length}
              </p>
              <div className="flex items-center justify-center gap-3 mt-2">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                  {currentWinner.photo ? (
                    <img src={currentWinner.photo} alt={currentWinner.name} className="w-full h-full object-cover" />
                  ) : (
                    currentWinner.name[0].toUpperCase()
                  )}
                </div>
                <div className="text-left">
                  <p className="font-bold text-lg text-slate-900">{currentWinner.name}</p>
                  <p className="text-sm text-orange-600">Congratulations!</p>
                </div>
              </div>
            </div>
          )}

          {/* All Winners */}
          {winners.length > 0 && !currentWinner && (
            <div className="mt-6">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                Selected Winners
              </p>
              <div className="space-y-2">
                {winners.map((winner, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-slate-100">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold overflow-hidden">
                      {winner.photo ? (
                        <img src={winner.photo} alt={winner.name} className="w-full h-full object-cover" />
                      ) : (
                        winner.name[0].toUpperCase()
                      )}
                    </div>
                    <p className="font-medium text-slate-900">{winner.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                style={{ width: `${(winners.length / numberOfWinners) * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold text-slate-500">
              {winners.length}/{numberOfWinners}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100">
          {winners.length < numberOfWinners ? (
            <button
              onClick={handleNextSpin}
              disabled={spinning}
              className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {spinning ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Spinning...
                </>
              ) : currentWinner ? (
                winners.length < numberOfWinners - 1 ? "Spin for Next Winner" : "Spin for Final Winner"
              ) : (
                "Start Spin"
              )}
            </button>
          ) : (
            <button
              onClick={() => onComplete(winners)}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition"
            >
              Confirm Winners & Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
