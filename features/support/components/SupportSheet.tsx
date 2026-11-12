"use client";

import type { User } from "firebase/auth";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { formatMoney } from "@/lib/format/money";
import { t } from "@/lib/i18n";
import { useSupportFlow } from "../hooks/useSupportFlow";
import type { SupportCreator } from "../types";
import { AmountStep } from "./AmountStep";
import { PayStep } from "./PayStep";
import { StatusStep } from "./StatusStep";
import { StepProgress } from "./StepProgress";

export interface SupportSheetProps {
  open: boolean;
  onClose: () => void;
  creator: SupportCreator;
  isLoggedIn: boolean;
  user: User | null;
  resumeReference?: string | null;
  onSuccess?: () => void;
}

export function SupportSheet({
  open,
  onClose,
  creator,
  isLoggedIn,
  user,
  resumeReference,
  onSuccess,
}: SupportSheetProps) {
  const flow = useSupportFlow({
    open,
    creator,
    isLoggedIn,
    user,
    resumeReference,
    onSuccess,
    onClose,
  });

  const firstName = creator.name.split(" ")[0] || creator.name;
  const totalLabel = formatMoney(flow.breakdown.total, flow.config.currency);

  const footer = (() => {
    if (flow.step === "amount") {
      return (
        <Button fullWidth size="lg" onClick={flow.goToPay} disabled={!flow.amountValid}>
          {t("support.amount.continue")}
        </Button>
      );
    }

    if (flow.step === "pay") {
      if (!isLoggedIn) {
        return (
          <Button
            fullWidth
            size="lg"
            loading={flow.signingIn}
            onClick={() => void flow.signIn()}
          >
            {t("support.guest.signIn")}
          </Button>
        );
      }
      return (
        <Button
          fullWidth
          size="lg"
          loading={flow.submitting}
          disabled={!flow.canPay}
          onClick={() => void flow.pay()}
        >
          {t("support.review.pay", { amount: totalLabel })}
        </Button>
      );
    }

    return null;
  })();

  return (
    <Sheet
      open={open}
      onClose={flow.close}
      title={t("support.sheetTitle", { name: firstName })}
      description={t("support.sheetHint")}
      footer={footer}
      contentClassName="pb-4"
    >
      <StepProgress step={flow.step} />

      {flow.step === "amount" && (
        <AmountStep
          creatorName={creator.name}
          creatorPhotoURL={creator.photoURL}
          verified={creator.verified}
          currency={flow.config.currency}
          minAmount={flow.minAmount}
          presets={flow.presets}
          amount={flow.amount}
          message={flow.message}
          error={flow.error}
          breakdown={flow.breakdown}
          perks={flow.perks}
          onChangeAmount={flow.chooseAmount}
          onChangeMessage={flow.setMessage}
        />
      )}

      {flow.step === "pay" && (
        <PayStep
          creatorName={creator.name}
          creatorPhotoURL={creator.photoURL}
          creatorVerified={creator.verified}
          currency={flow.config.currency}
          breakdown={flow.breakdown}
          method={flow.method}
          network={flow.network}
          phone={flow.phone}
          error={flow.error}
          isLoggedIn={isLoggedIn}
          userName={user?.displayName}
          userPhotoURL={user?.photoURL}
          perks={flow.perks}
          onMethod={flow.chooseMethod}
          onPhone={flow.setPhone}
          onBack={flow.backToAmount}
        />
      )}

      {flow.step === "status" && (
        <StatusStep
          status={flow.status}
          creatorName={creator.name}
          handle={creator.handle}
          amount={flow.breakdown.total}
          currency={flow.config.currency}
          reference={flow.reference}
          method={flow.method}
          waitingLong={flow.waitingLong}
          error={flow.error}
          cardRedirectUrl={flow.cardRedirectUrl}
          checking={flow.checking}
          checkHint={flow.checkHint}
          onCheck={() => void flow.checkNow()}
          onRetry={flow.retry}
          onClose={flow.close}
        />
      )}
    </Sheet>
  );
}
