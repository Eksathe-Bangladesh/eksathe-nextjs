"use client";

import { cn } from "cn";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MapPinIcon,
  PackageIcon,
  StarIcon,
  UserRoundIcon,
} from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";

import { ListingImage } from "@/components/dashboard/listing-image";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListingRequestForm } from "@/components/workflows/listing-request-form";
import { Link } from "@/i18n/navigation";
import type { PublicListing, PublicProvider } from "@/lib/listings";
import type { SectorDefinition } from "@/lib/sectors";

export function ListingDetail({
  sector,
  listing,
  provider,
  unavailable,
  signedIn,
  projectId,
  packageId,
  packageLabel,
  routeBase,
}: {
  sector: SectorDefinition;
  listing: PublicListing | null;
  provider?: PublicProvider | null;
  unavailable: boolean;
  signedIn: boolean;
  projectId?: string;
  packageId?: string;
  packageLabel?: string;
  routeBase?: string;
}) {
  const formatter = useFormatter();
  const t = useTranslations();
  const price = (value: string) =>
    formatter.number(Number(value), {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    });
  const base = routeBase ?? `/dashboard/${sector.slug}`;
  const scheduled = listing
    ? ["WORKER", "MACHINERY", "CONSTRUCTION_SERVICE"].includes(listing.kind)
    : false;
  const projectRequest = Boolean(projectId && packageId);
  const returnTo = `${base}/listings/${listing?.id ?? ""}${projectRequest ? `?${new URLSearchParams({ projectId: projectId!, packageId: packageId! }).toString()}` : ""}`;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
      <div className="flex flex-col gap-6">
        <Link
          href={base}
          className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {t("inline.all_services_1pdbxg7")}
        </Link>
        {unavailable ? (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive rounded-2xl border p-6 text-sm"
          >
            {t("workflow.dataUnavailable")}
          </p>
        ) : listing ? (
          <Card>
            <ListingImage
              listing={listing}
              alt={listing.title}
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
            <CardHeader>
              <p className="text-primary text-sm font-medium">
                {listing.category}
              </p>
              <CardTitle className="text-3xl">
                {listing.title}
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <UserRoundIcon className="size-4" aria-hidden="true" />
                  {listing.providerName}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="size-4" aria-hidden="true" />
                  {listing.district}
                </span>
              </CardDescription>
              {listing.averageRating !== null && (
                <p className="inline-flex items-center gap-1 text-sm font-medium">
                  <StarIcon aria-hidden="true" className="size-4 fill-current text-amber-500" />
                  {listing.averageRating.toFixed(1)} · {listing.reviewCount}{" "}
                  {t("inline.reviews_19obigh")}
                </p>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <p className="text-muted-foreground text-sm leading-7 whitespace-pre-line">
                {listing.description}
              </p>
              <div className="bg-muted/60 grid gap-3 rounded-xl p-4 sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground text-xs">{t("workflow.price")}</p>
                  <p className="mt-1 font-semibold">
                    {price(listing.unitPrice)} / {listing.unit}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {scheduled ? t("inline.booking_availability_1hl9oqa") : t("workflow.stock")}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 font-semibold">
                    <PackageIcon aria-hidden="true" className="size-4" />
                    {scheduled
                      ? listing.availableFrom
                        ? `${t("inline.from_1vw3av5")} ${formatter.dateTime(new Date(listing.availableFrom), { dateStyle: "medium", timeZone: "Asia/Dhaka" })}`
                        : t("inline.checked_for_requested_dates_1b2yoj9")
                      : `${listing.stock} ${listing.unit}`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">{t("workflow.district")}</p>
                  <p className="mt-1 font-semibold">{listing.district}</p>
                </div>
              </div>
              <Link
                href={`${base}/providers/${listing.providerId}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit gap-2")}
              >
                {t("inline.provider_profile_8eqhmv")}
                <ArrowRightIcon aria-hidden="true" className="size-4" />
              </Link>
              {sector.slug === "construction" && (
                <Link
                  href={`/account/projects/new?listing=${encodeURIComponent(listing.id)}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit gap-2")}
                >
                  {t("inline.create_a_project_with_this_listing_t0qko3")}
                  <ArrowRightIcon aria-hidden="true" className="size-4" />
                </Link>
              )}
            </CardContent>
          </Card>
        ) : null}
        {listing && !unavailable && provider && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">{t("inline.seller_qlcxju")}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2">
                  {provider.name} · {provider.district}
                  {provider.averageRating !== null && (
                    <span className="inline-flex items-center gap-1">
                      <StarIcon aria-hidden="true" className="size-4 fill-current text-amber-500" />
                      {provider.averageRating.toFixed(1)} ({provider.reviewCount})
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <p className="text-muted-foreground max-w-2xl text-sm">
                  {provider.bio}
                </p>
                <Link
                  href={`${base}/providers/${provider.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
                >
                  {t("inline.visit_storefront_1vy0izi")}
                  <ArrowRightIcon aria-hidden="true" className="size-4" />
                </Link>
              </CardContent>
            </Card>
            {provider.listings.filter((item) => item.id !== listing.id).length > 0 && (
              <section className="flex flex-col gap-4">
                <h2 className="text-xl font-bold">{t("inline.more_from_this_seller_b6lkj7")}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {provider.listings
                    .filter((item) => item.id !== listing.id)
                    .slice(0, 4)
                    .map((item) => (
                      <Link
                        key={item.id}
                        href={`${base}/listings/${item.id}`}
                        className="border-border/70 hover:border-primary/40 rounded-xl border p-4"
                      >
                        <p className="font-semibold">
                          {item.title}
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {item.category} · {item.unitPrice} BDT / {item.unit}
                        </p>
                      </Link>
                    ))}
                </div>
              </section>
            )}
          </>
        )}
        {listing && !unavailable && listing.reviews && listing.reviews.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold">{t("inline.customer_reviews_yvgqrk")}</h2>
            {listing.reviews.map((review, index) => (
              <Card key={`${review.createdAt}-${index}`}>
                <CardContent className="flex flex-col gap-2 p-4">
                  <p className="inline-flex items-center gap-1 text-sm font-semibold">
                    <StarIcon aria-hidden="true" className="size-4 fill-current text-amber-500" />
                    {review.rating} / 5
                  </p>
                  <p className="text-muted-foreground text-sm whitespace-pre-line">
                    {review.comment}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatter.dateTime(new Date(review.createdAt), {
                      dateStyle: "medium",
                      timeZone: "Asia/Dhaka",
                    })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
        <div className="flex gap-3">
          <Link href={base} className={buttonVariants({ variant: "outline" })}>
            {t("nav.browse")}
          </Link>
          <Link href="/dashboard" className={buttonVariants({ variant: "ghost" })}>
            {t("inline.all_sectors_14ogqu")}
          </Link>
        </div>
      </div>
      {listing && !unavailable && (
        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="text-xl">{t("inline.send_a_request_ijms93")}</CardTitle>
            <CardDescription>
              {t("inline.the_provider_will_send_terms_for_you_to_re_oagz0m")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signedIn ? (
              <ListingRequestForm
                listing={listing}
                routeBase={base}
                projectId={projectRequest ? projectId : undefined}
                packageId={projectRequest ? packageId : undefined}
                packageLabel={projectRequest ? packageLabel : undefined}
              />
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-muted-foreground text-sm">{t("workflow.signInToRequest")}</p>
                <Link
                  href={`/login?next=${encodeURIComponent(returnTo)}`}
                  className={cn(buttonVariants(), "w-full")}
                >
                  {t("auth.signIn")}
                </Link>
                <Link
                  href={`/register?next=${encodeURIComponent(returnTo)}`}
                  className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                >
                  {t("auth.createAccount")}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {unavailable && (
        <Button
          type="button"
          variant="outline"
          onClick={() => window.location.reload()}
          className="h-fit"
        >
          {t("inline.try_again_o85pno")}
        </Button>
      )}
    </div>
  );
}
