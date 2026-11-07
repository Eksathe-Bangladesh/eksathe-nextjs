import { describe, expect, it } from "bun:test";

import { sendAuthEmail } from "@/lib/email";

describe("authentication email delivery", () => {
  it("prints a usable local preview when Resend is not configured", async () => {
    const previousApiKey = process.env.RESEND_API_KEY;
    const previousFrom = process.env.RESEND_FROM;
    const previousWarn = console.warn;
    const output: string[] = [];

    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    console.warn = (...values: unknown[]) => output.push(values.join(" "));

    try {
      expect(
        sendAuthEmail(
          "customer@example.com",
          "Verify your account",
          "http://localhost/verify?token=sample",
        ),
      ).resolves.toBeUndefined();
      expect(output.join(" ")).toContain("http://localhost/verify?token=sample");
    } finally {
      console.warn = previousWarn;
      if (previousApiKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = previousApiKey;
      if (previousFrom === undefined) delete process.env.RESEND_FROM;
      else process.env.RESEND_FROM = previousFrom;
    }
  });
});
