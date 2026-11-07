"use client";

import { ArrowLeftIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cloneElement, useId, useState, type SubmitEvent, type ReactElement } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import { localizedPath } from "@/i18n/paths";
import { agricultureAccountTypes } from "@/lib/agriculture/account-types";
import { authClient } from "@/lib/auth-client";

export type AuthMode = "login" | "register" | "forgot" | "reset" | "verify";

export function AuthPanel({
  mode,
  next = "/account",
  token,
}: {
  mode: AuthMode;
  next?: string;
  token?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const callbackURL = localizedPath(locale, next);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [accountType, setAccountType] =
    useState<(typeof agricultureAccountTypes)[number]>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const title =
    mode === "login"
      ? t("auth.signIn")
      : mode === "register"
        ? t("auth.signUp")
        : mode === "forgot"
          ? t("auth.forgotPassword")
          : mode === "reset"
            ? t("auth.resetPassword")
            : t("auth.verifyTitle");

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (mode === "register") {
        if (name.trim().length < 2) throw new Error(t("auth.nameError"));
        if (!/^[0-9+ ()-]{7,30}$/.test(phone.trim())) throw new Error(t("auth.phoneError"));
        if (password.length < 10) throw new Error(t("auth.passwordMin"));
        const { error: authError } = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim(),
          accountType,
          callbackURL,
        });
        if (authError) throw new Error(authError.message);
        setNotice(t("auth.checkEmail"));
      } else if (mode === "login") {
        const { error: authError } = await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
          callbackURL,
        });
        if (authError) throw new Error(authError.message);
        router.replace(next);
        router.refresh();
      } else if (mode === "forgot") {
        const { error: authError } = await authClient.requestPasswordReset({
          email: email.trim().toLowerCase(),
          redirectTo: localizedPath(locale, "/reset-password"),
        });
        if (authError) throw new Error(authError.message);
        setNotice(t("auth.checkEmail"));
      } else if (mode === "reset") {
        if (!token) throw new Error(t("auth.genericError"));
        if (password.length < 10) throw new Error(t("auth.passwordMin"));
        const { error: authError } = await authClient.resetPassword({
          newPassword: password,
          token,
        });
        if (authError) throw new Error(authError.message);
        router.replace("/login");
        router.refresh();
      } else {
        const { error: authError } = await authClient.sendVerificationEmail({
          email: email.trim().toLowerCase(),
          callbackURL,
        });
        if (authError) throw new Error(authError.message);
        setNotice(t("auth.checkEmail"));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("auth.genericError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="flex flex-col items-center">
        <BrandLogo className="mb-2 size-24" />
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>
          {mode === "verify"
            ? t("auth.verifyDescription")
            : mode === "register"
              ? t("auth.termsNote")
              : t("common.brandName")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode === "register" && (
            <Field label={t("auth.name")}>
              <Input
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
          )}
          {(mode === "register" || mode === "login" || mode === "forgot" || mode === "verify") && (
            <Field label={t("auth.email")}>
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
          )}
          {mode === "register" && (
            <Field label={t("auth.phone")}>
              <Input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                minLength={7}
                maxLength={30}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </Field>
          )}
          {mode === "register" && (
            <Field label={t("workflow.accountType")}>
              <select
                autoComplete="off"
                required
                value={accountType}
                onChange={(event) =>
                  setAccountType(
                    agricultureAccountTypes.find((value) => value === event.target.value) ??
                      "customer",
                  )
                }
                className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
              >
                <option value="customer">{t("workflow.customerAccount")}</option>
                <option value="farmer">{t("workflow.farmerAccount")}</option>
                <option value="agro_laborer">{t("workflow.agroLaborerAccount")}</option>
                <option value="agronomist">{t("workflow.agronomistAccount")}</option>
                <option value="veterinarian">{t("workflow.veterinarianAccount")}</option>
                <option value="agro_seller">{t("workflow.agroSellerAccount")}</option>
                <option value="agriculture_professional">
                  {t("workflow.agricultureProfessionalAccount")}
                </option>
              </select>
            </Field>
          )}
          {(mode === "register" || mode === "login" || mode === "reset") && (
            <Field label={mode === "reset" ? t("auth.newPassword") : t("auth.password")}>
              <Input
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={10}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
          )}
          {error && (
            <p
              role="alert"
              className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="bg-secondary text-secondary-foreground rounded-lg px-3 py-2 text-sm"
            >
              {notice}
            </p>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy
              ? t("common.loading")
              : mode === "login"
                ? t("auth.signIn")
                : mode === "register"
                  ? t("auth.signUp")
                  : mode === "forgot"
                    ? t("auth.submit")
                    : mode === "reset"
                      ? t("auth.resetPassword")
                      : t("auth.sendVerification")}
          </Button>
        </form>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          {mode === "login" && (
            <Link className="text-primary hover:underline" href="/forgot-password">
              {t("auth.forgotPassword")}
            </Link>
          )}
          {(mode === "login" || mode === "register") && (
            <Link
              className="text-primary hover:underline"
              prefetch={true}
              href={
                mode === "login"
                  ? next && next !== "/account"
                    ? `/register?next=${encodeURIComponent(next)}`
                    : "/register"
                  : next && next !== "/account"
                    ? `/login?next=${encodeURIComponent(next)}`
                    : "/login"
              }
            >
              {mode === "login" ? t("auth.createAccount") : t("auth.existingAccount")}
            </Link>
          )}
          {mode === "reset" && (
            <Link className="text-primary hover:underline" href="/login">
              {t("auth.signIn")}
            </Link>
          )}
        </div>
      </CardContent>
      <div className="px-6 pb-5">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {t("nav.returnHome")}
        </Link>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children, { id })}
    </div>
  );
}
