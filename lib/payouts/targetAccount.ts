export interface ResolvedTargetPayoutAccount {
  accountNumber: string;
  accountName: string;
  bankName: string;
  payoutPreference: "bank" | "momo";
  providerLabel: string;
  swiftCode: string;
  isFromVerification: boolean;
}

function cleanStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Resolves the creator's payout destination for withdrawals.
 * When a creator is verified, the account details submitted during KYC
 * verification always take precedence over the initial onboarding payout info.
 */
export function resolveTargetPayoutAccount(
  creator: Record<string, unknown> | null | undefined,
  verificationRequest?: Record<string, unknown> | null,
): ResolvedTargetPayoutAccount {
  const isVerified = creator?.verified === true;
  const reqStatus = cleanStr(verificationRequest?.status).toLowerCase();
  const canUseRequest =
    Boolean(verificationRequest) &&
    (reqStatus === "approved" || (isVerified && reqStatus !== "rejected"));

  const reqAccount = canUseRequest ? cleanStr(verificationRequest?.accountNumber) : "";
  const reqName = canUseRequest ? cleanStr(verificationRequest?.accountName) : "";
  const reqBank = canUseRequest ? cleanStr(verificationRequest?.bankName) : "";
  const reqPref = canUseRequest
    ? cleanStr(verificationRequest?.payoutPreference).toLowerCase()
    : "";
  const reqSwift = canUseRequest ? cleanStr(verificationRequest?.swiftCode) : "";

  const verifiedCreatorAccount = isVerified
    ? cleanStr(creator?.verifiedAccountNumber)
    : "";
  const verifiedCreatorName = isVerified
    ? cleanStr(creator?.verifiedAccountName)
    : "";
  const verifiedCreatorBank = isVerified
    ? cleanStr(creator?.verifiedBankName)
    : "";
  const verifiedCreatorPref = isVerified
    ? cleanStr(creator?.verifiedPayoutPreference).toLowerCase()
    : "";
  const verifiedCreatorSwift = isVerified
    ? cleanStr(creator?.verifiedSwiftCode)
    : "";

  const rawPref =
    reqPref ||
    verifiedCreatorPref ||
    cleanStr(creator?.payoutPreference).toLowerCase();
  const payoutPreference: "bank" | "momo" = rawPref === "bank" ? "bank" : "momo";

  const accountNumber =
    reqAccount || verifiedCreatorAccount || cleanStr(creator?.payoutNumber);
  const accountName = reqName || verifiedCreatorName || "";
  const bankName = reqBank || verifiedCreatorBank || "";
  const swiftCode = reqSwift || verifiedCreatorSwift || "";

  const fallbackNetwork = cleanStr(creator?.network);
  const providerLabel =
    bankName ||
    fallbackNetwork ||
    (payoutPreference === "bank" ? "Bank Account" : "Mobile Money");

  const isFromVerification = Boolean(reqAccount || verifiedCreatorAccount);

  return {
    accountNumber,
    accountName,
    bankName,
    payoutPreference,
    providerLabel,
    swiftCode,
    isFromVerification,
  };
}
