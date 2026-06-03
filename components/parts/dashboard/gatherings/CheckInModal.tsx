"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  QrCode,
  Search,
  Users,
  Check,
  Loader,
  User,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";

interface CheckInModalProps {
  isOpen: boolean;
  activeEvent: any;
  attendees: any[];
  checkingIn: string | null;
  searchQuery: string;
  onClose: () => void;
  onSearchChange: (query: string) => void;
  onCheckIn: (attendee: any) => void;
  onDeclineCheckIn: (attendee: any) => void;
  onUndoCheckIn: (attendee: any) => void;
}

export default function CheckInModal({
  isOpen,
  activeEvent,
  attendees,
  checkingIn,
  searchQuery,
  onClose,
  onSearchChange,
  onCheckIn,
  onDeclineCheckIn,
  onUndoCheckIn,
}: CheckInModalProps) {
  const [scanMode, setScanMode] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const activeEventRef = useRef<any>(null);
  activeEventRef.current = activeEvent;

  const checkedInCount = attendees.filter((a) => a.checkedIn).length;
  const declinedCount = attendees.filter((a) => a.checkInDeclined).length;

  const filteredAttendees = attendees.filter(
    (a) =>
      a.supporterName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.supporterEmail?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleScanResult = useRef<((id: string, data: any) => Promise<void>) | undefined>(undefined);
  handleScanResult.current = async (decodedText: string, data: any) => {
    const ev = activeEventRef.current;
    if (!ev) return;

    try {
      const docRef = doc(db, "gatheringsAttendance", decodedText);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        toast.error("Invalid ticket: not found");
        return;
      }

      const ticketData = docSnap.data();
      if (ticketData.gatheringId !== ev.id) {
        toast.error("This ticket is for a different event");
        return;
      }

      if (ticketData.checkedIn) {
        toast.info(`${ticketData.supporterName || "Someone"} is already checked in`);
        return;
      }

      await onCheckIn({ id: decodedText, ...ticketData });
      toast.success(`${ticketData.supporterName || "Attendee"} checked in via QR!`);
    } catch (e) {
      console.error("QR scan error:", e);
      toast.error("Failed to process ticket");
    }
  };

  useEffect(() => {
    if (!isOpen || !scanMode) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await scanner.stop().catch(() => {});
          scannerRef.current = null;
          await handleScanResult.current?.(decodedText, {});
          setScanMode(false);
        },
        () => {},
      )
      .catch((err) => {
        console.error("QR scanner start failed:", err);
        toast.error("Camera access failed. Check permissions.");
        setScanMode(false);
      });

    return () => {
      scanner.stop().catch(() => {});
      scannerRef.current = null;
    };
  }, [isOpen, scanMode]);

  if (!isOpen || !activeEvent) return null;

  return (
    <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6">
      <div className="bg-card w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[85vh] flex flex-col">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Check-in Guests</h2>
            <p className="text-sm text-muted-foreground">
              {checkedInCount}/{attendees.length} checked in
              {declinedCount > 0 && (
                <span className="text-red-500">
                  {" "}
                  · {declinedCount} declined
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => {
              onClose();
              setScanMode(false);
            }}
            className="p-2 hover:bg-muted rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pt-2 pb-0">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setScanMode(false)}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
                !scanMode
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-card"
              }`}
            >
              Manual
            </button>
            <button
              onClick={() => setScanMode(true)}
              className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
                scanMode
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-card"
              }`}
            >
              <QrCode size={14} className="inline mr-1" /> Scan QR
            </button>
          </div>
        </div>

        {scanMode ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-6">
            <div id="qr-reader" className="w-full max-w-xs" />
            <p className="text-xs text-muted-foreground text-center mt-4">
              Point the camera at an attendee&apos;s QR ticket
            </p>
          </div>
        ) : (
          <>
            <div className="p-6">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
              {filteredAttendees.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={40} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground font-medium">
                    {searchQuery ? "No matching attendees" : "No RSVPs yet"}
                  </p>
                </div>
              ) : (
                filteredAttendees.map((attendee) => (
                  <div
                    key={attendee.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      attendee.checkedIn
                        ? "bg-green-50 border-green-200"
                        : "bg-card border-border hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold overflow-hidden">
                        {attendee.supporterPhoto ? (
                          <img
                            src={attendee.supporterPhoto}
                            alt={attendee.supporterName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          attendee.supporterName?.[0] || <User size={16} />
                        )}
                      </div>
                      <div>
                        <p className="font-bold">{attendee.supporterName}</p>
                        <p className="text-xs text-muted-foreground">
                          {attendee.supporterEmail}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {attendee.checkedIn ? (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-green-600 text-sm font-bold">
                            <Check size={16} /> Checked In
                          </span>
                          <button
                            onClick={() => onUndoCheckIn(attendee)}
                            disabled={checkingIn === attendee.id}
                            className="text-xs text-muted-foreground hover:text-muted-foreground underline"
                          >
                            Undo
                          </button>
                        </div>
                      ) : attendee.checkInDeclined ? (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-red-500 text-sm font-bold">
                            <X size={16} /> Declined
                          </span>
                          <button
                            onClick={() => onUndoCheckIn(attendee)}
                            disabled={checkingIn === attendee.id}
                            className="text-xs text-muted-foreground hover:text-muted-foreground underline"
                          >
                            Undo
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => onCheckIn(attendee)}
                            disabled={checkingIn === attendee.id}
                            className="flex items-center gap-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-green-600 transition disabled:opacity-50"
                          >
                            {checkingIn === attendee.id ? (
                              <Loader size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                            Check In
                          </button>
                          <button
                            onClick={() => onDeclineCheckIn(attendee)}
                            disabled={checkingIn === attendee.id}
                            className="flex items-center gap-1 bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-bold hover:bg-red-200 transition disabled:opacity-50"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
