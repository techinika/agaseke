export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface OnboardingSocials {
  instagram: string;
  linkedin: string;
  twitter: string;
  youtube: string;
  tiktok: string;
  web: string;
}

export interface OnboardingFormData {
  username: string;
  fullName: string;
  bio: string;
  momoNumber: string;
  momoNetwork: string;
  country: string;
  currency: string;
  socials: OnboardingSocials;
}

export interface CountryOption {
  id: string;
  code: string;
  name: string;
  flag?: string | null;
}

export interface CurrencyOption {
  code: string;
  name: string;
  symbol?: string | null;
}

export interface OnboardingFlowProps {
  step: OnboardingStep;
  formData: OnboardingFormData;
  usernameStatus: UsernameStatus;
  countries: CountryOption[];
  currencies: CurrencyOption[];
  availableCurrencies: CurrencyOption[];
  locationDataError: boolean;
  locationLoading: boolean;
  loading: boolean;
  onFieldChange: (field: keyof OnboardingFormData, value: string) => void;
  onSocialChange: (field: keyof OnboardingSocials, value: string) => void;
  onNext: () => void;
  onBack: () => void;
  onFinish: () => void;
  onSkip: () => void;
  onRetryLocation: () => void;
}
