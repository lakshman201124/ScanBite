import { z } from "zod";

const phoneSchema = z
  .string()
  .regex(/^\+?[0-9]{10,15}$/, "Invalid phone number");

const otpCodeSchema = z
  .string()
  .length(6, "OTP must be exactly 6 digits")
  .regex(/^\d{6}$/, "OTP must contain only digits");

// Admin signup — email + password (no SMS in v1). Phone is optional contact info.
export const signupSchema = z.object({
  restaurantName: z
    .string()
    .min(2, "Restaurant name must be at least 2 characters")
    .max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
  phone: phoneSchema.optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const restaurantSetupSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  address: z.string().max(500).optional(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
      message: "Invalid GSTIN format",
    })
    .optional()
    .or(z.literal("")),
  phone: phoneSchema.optional().or(z.literal("")),
  logo_url: z.url().optional().or(z.literal("")),
});

// OTP send request (kept for admin/customer flows)
export const otpSendSchema = z.object({
  phone: phoneSchema,
  type: z.enum(["admin_signup", "chef", "customer", "staff_signup"]),
});

// Customer identity
export const customerIdentitySchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
  name: z.string().min(1, "Name is required").max(100),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RestaurantSetupInput = z.infer<typeof restaurantSetupSchema>;
export type OtpSendInput = z.infer<typeof otpSendSchema>;
export type CustomerIdentityInput = z.infer<typeof customerIdentitySchema>;
