"use client";

import { Loader, Check, CreditCard, AlertCircle, Smartphone } from "lucide-react";

interface CommercePaymentSectionProps {
  amount: number;
  currency?: string;
  paid: boolean;
  paying: boolean;
  paymentMethod: "momo" | "card";
  onPaymentMethodChange: (method: "momo" | "card") => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  onPay: () => void;
  disabled?: boolean;
  waitingForConfirmation?: boolean;
  confirmationMessage?: string;
  paymentInitiated?: boolean;
  initiatedMessage?: string;
  payButtonLabel?: string;
}

export function CommercePaymentSection({
  amount,
  currency = "RWF",
  paid,
  paying,
  paymentMethod,
  onPaymentMethodChange,
  phone,
  onPhoneChange,
  onPay,
  disabled = false,
  waitingForConfirmation,
  confirmationMessage,
  paymentInitiated,
  initiatedMessage,
  payButtonLabel,
}: CommercePaymentSectionProps) {
  if (paid) {
    return (
      <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
        <Check size={20} className="text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-green-800">Payment Completed</p>
          <p className="text-xs text-green-600 mt-1">
            Your payment has been processed successfully.
          </p>
        </div>
      </div>
    );
  }

  if (waitingForConfirmation) {
    return (
      <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3">
        <Loader size={20} className="animate-spin text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-800">
            Waiting for Payment Confirmation
          </p>
          <p className="text-xs text-amber-600 mt-1">
            {confirmationMessage || "Waiting for payment confirmation..."}
          </p>
        </div>
      </div>
    );
  }

  if (paymentInitiated) {
    return (
      <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
        <Check size={20} className="text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-green-800">Payment Initiated</p>
          <p className="text-xs text-green-600 mt-1">
            {initiatedMessage || "Check your phone to complete the payment."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <p className="font-bold text-sm">Payment Method</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onPaymentMethodChange("momo")}
            className={`py-3 px-4 rounded-lg border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              paymentMethod === "momo"
                ? "border-orange-600 bg-orange-50 text-orange-600"
                : "border-border text-muted-foreground"
            }`}
          >
            <Smartphone size={16} />
            Mobile Money
          </button>
          <button
            onClick={() => onPaymentMethodChange("card")}
            className={`py-3 px-4 rounded-lg border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              paymentMethod === "card"
                ? "border-orange-600 bg-orange-50 text-orange-600"
                : "border-border text-muted-foreground"
            }`}
          >
            <CreditCard size={16} />
            Card Payment
          </button>
        </div>
      </div>

      {paymentMethod === "momo" && (
        <>
          <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              Payment will be processed via Mobile Money. You will receive a
              prompt on your phone to complete the payment.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">
              MTN Mobile Money Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="07X XXX XXXX"
              className="w-full bg-muted p-4 rounded-lg text-sm font-medium outline-none"
            />
          </div>
        </>
      )}

      {paymentMethod === "card" && (
        <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
          <CreditCard size={20} className="text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800">
            You will be redirected to a secure payment page to complete your
            card payment.
          </p>
        </div>
      )}

      <button
        onClick={onPay}
        disabled={
          paying || (paymentMethod === "momo" && !phone.trim()) || disabled
        }
        className="w-full bg-green-600 text-white py-4 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {paying ? (
          <>
            <Loader className="animate-spin" size={20} />
            Processing...
          </>
        ) : (
          <>
            <Check size={20} />
            {payButtonLabel ||
              `Pay ${amount.toLocaleString()} ${currency}`}
          </>
        )}
      </button>
    </>
  );
}
