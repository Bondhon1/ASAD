import { z } from "zod";

export const SignUpSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z
      .string()
      .regex(
        /^(?:\+88)?01[3-9]\d{8}$/,
        "Invalid Bangladesh phone number (format: +880154xxxxxxxx or 01554xxxxxxxx)"
      ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    instituteId: z.string().min(1, "Institute is required"),
    joiningSemester: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const LogInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const EmailVerificationSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const InitialPaymentSchema = z.object({
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

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type LogInInput = z.infer<typeof LogInSchema>;
export type EmailVerificationInput = z.infer<typeof EmailVerificationSchema>;
export type InitialPaymentInput = z.infer<typeof InitialPaymentSchema>;
