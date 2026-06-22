import { z } from "zod";

export const bookingSchema = z.object({
  creatorHandle: z.string().min(1, "Creator handle is required"),
  bookerId: z.string().optional(),
  bookerName: z.string().min(1, "Name is required"),
  bookerEmail: z.string().email("Invalid email"),
  bookerPhone: z.string().optional(),
  reason: z.string().max(500, "Reason too long").optional(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  preferredTime: z.string().min(1, "Time is required"),
  preferredType: z.enum(["online", "physical", "both"]).optional(),
  tierId: z.string().optional(),
  tierName: z.string().optional(),
  paymentAmount: z.number().min(0).optional(),
});

export const supportSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  creatorId: z.string().min(1),
  creatorUid: z.string().min(1),
  supporterId: z.string().optional(),
  message: z.string().max(1000).optional(),
});

export const momoSchema = supportSchema.extend({
  phone: z.string().regex(/^(\+?25)?0?7[2-9]\d{7}$/, "Invalid Rwandan phone number"),
});

export const storeProductSchema = z.object({
  creatorId: z.string().min(1),
  name: z.string().min(1, "Product name required"),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  type: z.enum(["digital", "physical"]),
  stock: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export const gatheringSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  location: z.string().optional(),
  eventType: z.enum(["online", "physical", "hybrid"]),
  ticketPrice: z.number().min(0).default(0),
  capacity: z.number().int().positive().optional(),
});

export const messageSchema = z.object({
  chatroomId: z.string().min(1),
  content: z.string().min(1, "Message cannot be empty").max(5000),
  senderId: z.string().min(1),
  senderName: z.string().optional(),
});
