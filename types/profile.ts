/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Profile {
  id: string;
  uid: string;
  createdAt: any;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  type: "supporter" | "creator" | "admin";
  username?: string;
  bio?: string;
  website?: string;
  location?: string;
  onboarded: boolean;
  lastLogin: any;
  totalSupport: number;
  totalSupportedCreators: number;
  isAdmin: boolean;
  phoneNumber: string;
}
