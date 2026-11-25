"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader,
  Phone,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/db/firebase";
import { sendCommsEmail } from "@/lib/commsService";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type {
  DocumentKind,
  NormalizedVerificationRequest,
} from "@/lib/verificationSchema";

interface ResolvedDocumentState {
  loading: boolean;
  error: string | null;
  hasDocument: boolean;
  url: string | null;
  kind: DocumentKind;
  fileName: string;
}

interface VerificationReviewDialogProps {
  request: NormalizedVerificationRequest | null;
  onClose: () => void;
  onReviewed?: (result: {
    action: "approve" | "reject";
    requestId: string | null;
    uid: string;
    handle: string;
    verified: boolean;
  }) => void;
}

const INITIAL_DOC_STATE: ResolvedDocumentState = {
  loading: false,
  error: null,
  hasDocument: false,
  url: null,
  kind: "none",
  fileName: "",
};

function formatPayoutPreference(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower === "momo") return "MTN Mobile Money";
  if (lower === "airtel") return "Airtel Money";
  if (lower === "bank") return "Bank Transfer";
  return raw || "—";
}

export function VerificationReviewDialog({
  request,
  onClose,
  onReviewed,
}: VerificationReviewDialogProps) {
  const [docState, setDocState] = useState<ResolvedDocumentState>(INITIAL_DOC_STATE);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingAction, setProcessingAction] = useState<"approve" | "reject" | null>(
    null,
  );
  const [imageFailed, setImageFailed] = useState(false);

  const loadDocument = useCallback(async (target: NormalizedVerificationRequest) => {
    setDocState({ ...INITIAL_DOC_STATE, loading: true });
    setImageFailed(false);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("Admin authentication required to view identity documents");
      }

      const res = await fetch("/api/admin/verification/document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...(target.requestId ? { requestId: target.requestId } : {}),
          ...(target.uid ? { uid: target.uid } : {}),
        }),
      });

      const payload = (await res.json().catch(() => null)) as {
        hasDocument?: boolean;
        url?: string | null;
        kind?: DocumentKind;
        fileName?: string;
        error?: string;
      } | null;

      if (!res.ok) {
        throw new Error(payload?.error || "Unable to load verification document");
      }

      setDocState({
        loading: false,
        error: null,
        hasDocument: Boolean(payload?.hasDocument && payload?.url),
        url: payload?.url || null,
        kind: payload?.kind || target.idDocumentKind || "none",
        fileName: payload?.fileName || target.idDocumentName || "",
      });
    } catch (error) {
      setDocState({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load verification document",
        hasDocument: false,
        url: null,
        kind: "none",
        fileName: "",
      });
    }
  }, []);

  useEffect(() => {
    if (!request) {
      queueMicrotask(() => {
        setDocState(INITIAL_DOC_STATE);
        setRejectionReason("");
        setImageFailed(false);
      });
      return;
    }

    queueMicrotask(() => {
      setRejectionReason(request.rejectionReason || "");
      void loadDocument(request);
    });
  }, [request, loadDocument]);

  const handleDecision = async (action: "approve" | "reject") => {
    if (!request) return;
    setProcessingAction(action);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("Admin authentication required");
      }

      const cleanReason = action === "reject" ? rejectionReason.trim() : "";

      const res = await fetch("/api/admin/verification/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...(request.requestId ? { requestId: request.requestId } : {}),
          uid: request.uid,
          handle: request.creatorHandle,
          action,
          reason: cleanReason,
        }),
      });

      const payload = (await res.json().catch(() => null)) as {
        error?: string;
        email?: string;
        creatorName?: string;
        handle?: string;
        uid?: string;
        requestId?: string | null;
        verified?: boolean;
      } | null;

      if (!res.ok) {
        throw new Error(payload?.error || `Failed to ${action} verification`);
      }

      const recipientEmail = payload?.email || request.email;
      if (recipientEmail) {
        try {
          await sendCommsEmail("verification_feedback", {
            email: recipientEmail,
            name: payload?.creatorName || request.creatorName,
            approved: action === "approve",
            reason: cleanReason,
            creatorUid: payload?.uid || request.uid,
            handle: payload?.handle || request.creatorHandle,
          });
        } catch (emailErr) {
          console.warn("Verification reviewed but creator email failed:", emailErr);
        }
      }

      toast.success(
        action === "approve"
          ? "Verification approved"
          : "Verification rejected",
      );

      onReviewed?.({
        action,
        requestId: payload?.requestId ?? request.requestId ?? null,
        uid: payload?.uid || request.uid,
        handle: payload?.handle || request.creatorHandle,
        verified: action === "approve",
      });

      onClose();
    } catch (error) {
      console.error("Verification review failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to review verification",
      );
    } finally {
      setProcessingAction(null);
    }
  };

  const isAlreadyVerified = Boolean(request?.creatorVerified);
  const busy = processingAction !== null;

  return (
    <Dialog
      open={Boolean(request)}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Review KYC Verification"
      description={
        request
          ? `${request.creatorName}${request.creatorHandle ? ` (@${request.creatorHandle})` : ""}`
          : undefined
      }
      size="lg"
      footer={
        request ? (
          <>
            <Button variant="secondary" disabled={busy} onClick={onClose}>
              Close
            </Button>
            {!isAlreadyVerified && (
              <>
                <Button
                  variant="danger"
                  loading={processingAction === "reject"}
                  disabled={busy}
                  onClick={() => void handleDecision("reject")}
                >
                  Reject Request
                </Button>
                <Button
                  variant="primary"
                  loading={processingAction === "approve"}
                  disabled={busy}
                  onClick={() => void handleDecision("approve")}
                  leadingIcon={<ShieldCheck className="size-4" />}
                >
                  Approve Verification
                </Button>
              </>
            )}
          </>
        ) : undefined
      }
    >
      {request && (
        <div className="space-y-5">
          {/* Creator Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-surface-raised p-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                src={request.creatorProfilePicture}
                name={request.creatorName}
                size="md"
              />
              <div className="min-w-0">
                <p className="truncate text-body font-bold text-fg">
                  {request.creatorName}
                </p>
                <p className="truncate text-caption text-muted-fg">
                  {request.creatorHandle ? `@${request.creatorHandle}` : request.uid}
                  {request.email ? ` · ${request.email}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {request.creatorVerified ? (
                <Badge tone="success">
                  <CheckCircle2 className="mr-1 size-3.5" />
                  Already Verified
                </Badge>
              ) : request.status === "pending" ? (
                <Badge tone="warning">
                  <ShieldAlert className="mr-1 size-3.5" />
                  Pending Review
                </Badge>
              ) : request.status === "rejected" ? (
                <Badge tone="danger">Rejected</Badge>
              ) : (
                <Badge tone="neutral">{request.status}</Badge>
              )}
              <Badge tone={request.phoneVerified ? "success" : "neutral"}>
                <Phone className="mr-1 size-3" />
                {request.phoneVerified ? "Phone Verified" : "Phone Unverified"}
              </Badge>
            </div>
          </div>

          {/* Submitted Data Grid */}
          <div className="rounded-control border border-line bg-surface p-4">
            <h3 className="mb-3 text-caption font-bold uppercase tracking-wider text-muted-fg">
              Submitted Verification &amp; Payout Details
            </h3>
            <dl className="grid grid-cols-1 gap-3 text-label sm:grid-cols-2">
              <div>
                <dt className="text-caption text-muted-fg">Payout Mode</dt>
                <dd className="font-semibold text-fg">
                  {formatPayoutPreference(request.payoutPreference)}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted-fg">Country</dt>
                <dd className="font-semibold text-fg">{request.country || "—"}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-fg">Bank / Telecom Provider</dt>
                <dd className="font-semibold text-fg">{request.bankName || "—"}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-fg">Account / Recipient Name</dt>
                <dd className="font-semibold text-fg">{request.accountName || "—"}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-fg">Account / Phone Number</dt>
                <dd className="font-mono font-semibold text-fg">
                  {request.accountNumber || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted-fg">SWIFT / BIC</dt>
                <dd className="font-mono text-fg">{request.swiftCode || "N/A"}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-fg">Verified Phone</dt>
                <dd className="font-mono text-fg">{request.phoneNumber || "—"}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-fg">Submitted</dt>
                <dd className="tabular-nums text-fg">
                  {request.submittedAtIso
                    ? new Date(request.submittedAtIso).toLocaleString()
                    : "Legacy submission"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Identity Document Preview */}
          <div className="rounded-control border border-line bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-caption font-bold uppercase tracking-wider text-muted-fg">
                <FileText className="size-3.5" />
                Identity Document
                {docState.fileName ? ` · ${docState.fileName}` : ""}
              </h3>
              {docState.url && (
                <a
                  href={docState.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-caption font-semibold text-brand-strong hover:underline"
                >
                  Open Full Document
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>

            {docState.loading ? (
              <div className="flex items-center justify-center gap-2 rounded-control border border-line bg-surface-raised py-12 text-label text-muted-fg">
                <Loader className="size-4 animate-spin" />
                Loading submitted identity document…
              </div>
            ) : docState.error ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-warning bg-surface-raised p-4 text-label">
                <span className="text-fg">{docState.error}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void loadDocument(request)}
                  leadingIcon={<RefreshCw className="size-3.5" />}
                >
                  Retry
                </Button>
              </div>
            ) : !docState.hasDocument || !docState.url ? (
              <p className="rounded-control border border-line bg-surface-raised p-4 text-label text-muted-fg">
                No identity document was attached to this record.
              </p>
            ) : docState.kind === "pdf" ? (
              <iframe
                src={docState.url}
                title="Submitted identity document PDF"
                className="h-72 w-full rounded-control border border-line bg-surface-raised"
              />
            ) : docState.kind === "image" && !imageFailed ? (
              <div className="overflow-hidden rounded-control border border-line bg-surface-raised">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={docState.url}
                  alt={`Identity document for ${request.creatorName}`}
                  onError={() => setImageFailed(true)}
                  className="max-h-80 w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-control border border-line bg-surface-raised p-4">
                <span className="text-label text-muted-fg">
                  Preview unavailable in browser. Use the link to inspect the uploaded file.
                </span>
                <a
                  href={docState.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-control border border-line bg-surface px-3 py-1.5 text-caption font-semibold text-fg hover:bg-surface-raised"
                >
                  Open File
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Rejection Reason Input */}
          {!isAlreadyVerified && (
            <div>
              <label
                htmlFor="verification-rejection-reason"
                className="mb-1.5 block text-caption font-semibold text-fg"
              >
                Rejection Reason (required if rejecting, sent to creator)
              </label>
              <textarea
                id="verification-rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Identity document image is blurry or account name does not match ID."
                rows={3}
                disabled={busy}
                className="w-full rounded-control border border-line bg-surface p-3 text-label text-fg outline-none focus:border-focus"
              />
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
