/* eslint-disable @typescript-eslint/no-explicit-any */
import { Timestamp } from "firebase/firestore";

export type ProductType = "digital" | "physical";

export interface Product {
  id: string;
  creatorId: string;
  name: string;
  description: string;
  price: number;
  type: ProductType;
  stock: number;
  imageUrl?: string;
  fileUrl?: string;
  fileType?: "pdf" | "video" | "audio" | "image";
  sizes?: string[];
  weight?: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  active: boolean;
  discount?: {
    enabled: boolean;
    percentage: number;
    code?: string;
  };
  bulkPricing?: {
    minQuantity: number;
    discountPercentage: number;
  }[];
  platformFeePayer?: "buyer" | "creator";
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
}

export interface Order {
  id: string;
  creatorId: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  couponCode?: string;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";
  shippingAddress?: ShippingAddress;
  trackingNumber?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  selectedSize?: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

export interface Coupon {
  id: string;
  creatorId: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minPurchase?: number;
  maxUses?: number;
  usedCount: number;
  active: boolean;
  createdAt: Timestamp | Date;
  productIds?: string[];
}
