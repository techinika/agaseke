import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { VerificationFlow } from "@/features/verification/VerificationFlow";
import type { OnboardingFlowProps } from "@/features/onboarding/types";
import type { VerificationFlowProps } from "@/features/verification/types";

const onboardingProps: OnboardingFlowProps = {
  step: 1,
  formData: {
    username: "aline",
    fullName: "Aline Uwase",
    bio: "Stories and music.",
    momoNumber: "+250 780 000 000",
    momoNetwork: "MTN",
    country: "RW",
    currency: "RWF",
    socials: {
      instagram: "",
      linkedin: "",
      twitter: "",
      youtube: "",
      tiktok: "",
      web: "",
    },
  },
  usernameStatus: "available",
  countries: [{ id: "rw", code: "RW", name: "Rwanda", flag: "🇷🇼" }],
  currencies: [{ code: "RWF", name: "Rwandan Franc", symbol: "FRw" }],
  availableCurrencies: [{ code: "RWF", name: "Rwandan Franc", symbol: "FRw" }],
  locationDataError: false,
  locationLoading: false,
  loading: false,
  onFieldChange: vi.fn(),
  onSocialChange: vi.fn(),
  onNext: vi.fn(),
  onBack: vi.fn(),
  onFinish: vi.fn(),
  onSkip: vi.fn(),
  onRetryLocation: vi.fn(),
};

const verificationProps: VerificationFlowProps = {
  status: null,
  isEditing: true,
  onStartEditing: vi.fn(),
  values: {
    payoutPreference: "momo",
    country: "RW",
    bankName: "MTN Mobile Money",
    accountName: "Aline Uwase",
    accountNumber: "780000000",
    swiftCode: "",
  },
  onValueChange: vi.fn(),
  idFile: null,
  onFileChange: vi.fn(),
  loading: false,
  onSubmit: vi.fn(),
  phoneNumber: "+250 780 000 000",
  onPhoneChange: vi.fn(),
  phoneVerified: false,
  otpSent: false,
  otpCode: "",
  onOtpChange: vi.fn(),
  otpBusy: null,
  onSendOtp: vi.fn(),
  onVerifyOtp: vi.fn(),
};

describe("onboarding flow", () => {
  it("labels the username field and reports progress", () => {
    render(<OnboardingFlow {...onboardingProps} />);

    expect(
      screen.getByRole("textbox", { name: /your agaseke address/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
  });

  it("blocks continue and explains a taken username", () => {
    render(<OnboardingFlow {...onboardingProps} usernameStatus="taken" />);

    expect(screen.getByRole("alert")).toHaveTextContent(/already taken/i);
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  it("shows a retry state when location settings fail", () => {
    render(<OnboardingFlow {...onboardingProps} step={2} locationDataError />);

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onboardingProps.onRetryLocation).toHaveBeenCalledTimes(1);
  });

  it("renders the review summary and launch action", () => {
    render(<OnboardingFlow {...onboardingProps} step={6} />);

    expect(screen.getByText("agaseke.me/aline")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /launch my agaseke/i }));
    expect(onboardingProps.onFinish).toHaveBeenCalledTimes(1);
  });
});

describe("verification flow", () => {
  it("labels every payout field and the document upload", () => {
    render(<VerificationFlow {...verificationProps} />);

    expect(screen.getByLabelText(/country/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/account name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/identity document/i)).toBeInTheDocument();
  });

  it("reveals the code field after requesting a code", () => {
    render(<VerificationFlow {...verificationProps} otpSent />);

    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /verify number/i }));
    expect(verificationProps.onVerifyOtp).toHaveBeenCalledTimes(1);
  });

  it("shows a labelled status banner with an update action", () => {
    render(
      <VerificationFlow {...verificationProps} status="pending" isEditing={false} />,
    );

    expect(screen.getAllByText(/verification pending/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /update details/i }));
    expect(verificationProps.onStartEditing).toHaveBeenCalledTimes(1);
  });
});
