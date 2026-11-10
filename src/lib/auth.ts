import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { z } from "zod";

import { agricultureAccountTypes } from "@/lib/agriculture/account-types";
import { sendAuthEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { authSecondaryStorage } from "@/lib/rate-limit";

const authRateLimit = {
  enabled: true,
  window: 60,
  max: 100,
  storage: authSecondaryStorage ? ("secondary-storage" as const) : ("memory" as const),
  customRules: {
    "/sign-in/email": { window: 60, max: 5 },
    "/sign-up/email": { window: 60, max: 3 },
    "/forget-password": { window: 60, max: 3 },
    "/request-password-reset": { window: 60, max: 3 },
    "/reset-password": { window: 60, max: 5 },
    "/send-verification-email": { window: 60, max: 3 },
  },
};

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  rateLimit: authRateLimit,
  ...(authSecondaryStorage ? { secondaryStorage: authSecondaryStorage } : {}),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail(user.email, "Reset your EKsathe password", url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail(user.email, "Verify your EKsathe account", url);
    },
  },
  user: {
    additionalFields: {
      phone: {
        type: "string",
        required: true,
      },
      role: {
        type: "string",
        defaultValue: "customer",
        input: false,
      },
      status: {
        type: "string",
        defaultValue: "active",
        input: false,
      },
      accountType: {
        type: "string",
        defaultValue: "customer",
        input: true,
        validator: { input: z.enum(agricultureAccountTypes) },
      },
    },
  },
  plugins: [nextCookies()],
});
