import { z } from "zod";

export const SignUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const LogInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const EmailVerificationSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const InitialPaymentSchema = z.object({
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().regex(/^01[0-9]{9}$/, "Invalid phone number (must be 11 digits starting with 01)"),
  instituteName: z.string().min(1, "Please select your institution"),
  educationLevel: z.enum(["7", "8", "9", "10", "11", "12", "university"], {
    message: "Please select your class/level",
  }),
  paymentMethod: z
    .enum(["bkash", "nagad", "visa", "mastercard"])
    .refine((val) => val, { message: "Invalid payment method" }),
  senderNumber: z
    .string()
    .min(1, "Sender number is required")
    .regex(/^\d+$/, "Sender number must contain only digits"),
  trxId: z.string().min(1, "Transaction ID is required"),
  paymentDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    "Invalid payment date"
  ),
  paymentTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
});

export const FinalPaymentSchema = z.object({
  email: z.string().email("Invalid email address"),
  paymentMethod: z
    .enum(["bkash", "nagad", "visa", "mastercard"])
    .refine((val) => val, { message: "Invalid payment method" }),
  senderNumber: z.string().min(1, "Sender number is required").regex(/^[0-9]+$/, "Sender number must contain only digits"),
  trxId: z.string().min(1, "Transaction ID is required"),
  paymentDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid payment date"),
  paymentTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type LogInInput = z.infer<typeof LogInSchema>;
export type EmailVerificationInput = z.infer<typeof EmailVerificationSchema>;
export type InitialPaymentInput = z.infer<typeof InitialPaymentSchema>;
