"use client";

import { cn } from "cn";
import { ArrowLeftIcon, BadgeCheckIcon, MapPinIcon, StarIcon } from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";
import Image from "next/image";
import { useState } from "react";

import { ListingImage } from "@/components/dashboard/listing-image";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceError } from "@/components/workflows/workspace-error";
import { Link } from "@/i18n/navigation";
import { verificationMessageKey } from "@/lib/construction/verification-labels";
import type { PublicProvider } from "@/lib/listings";
import type { SectorDefinition } from "@/lib/sectors";

export function ProviderProfile({
  provider,
  sector,
  unavailable,
  routeBase,
}: {
  provider: PublicProvider | null;
  sector: SectorDefinition;
  unavailable: boolean;
  routeBase?: string;
}) {
  const formatter = useFormatter();
  const t = useTranslations();
  if (unavailable)
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <WorkspaceError />
      </div>
    );
  if (!provider) return null;
  const formatMoney = (value: string) =>
    formatter.number(Number(value), {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 2,
    });
  const base = routeBase ?? `/dashboard/${sector.slug}`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-8 sm:px-6">
      <Link
        href={base}
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t("nav.browse")}
      </Link>
      <Card>
        <div className="from-primary/10 via-secondary to-primary/20 relative h-40 overflow-hidden rounded-t-xl bg-linear-to-br sm:h-56">
          {provider.hasCoverImage && (
            <StorefrontPhoto
              providerId={provider.id}
              imageType="cover"
              fallback="🌾"
              className="size-full"
            />
          )}
          {!provider.hasCoverImage && (
            <span
              aria-hidden="true"
              className="flex size-full items-center justify-center text-6xl"
            >
              🌾
            </span>
          )}
        </div>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="border-background bg-secondary relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 text-3xl shadow-sm sm:size-20">
              {provider.hasProfileImage ? (
                <StorefrontPhoto
                  providerId={provider.id}
                  imageType="profile"
                  fallback="👩‍🌾"
                  className="size-full"
                />
              ) : (
                <span aria-hidden="true">👩‍🌾</span>
              )}
            </div>
            <CardTitle className="text-3xl">{provider.name}</CardTitle>
          </div>
          <CardDescription className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <MapPinIcon aria-hidden="true" className="size-4" />
              {provider.district}
              {provider.upazila ? `, ${provider.upazila}` : ""}
            </span>
            {provider.averageRating !== null && (
              <span className="inline-flex items-center gap-1">
                <StarIcon aria-hidden="true" className="size-4 fill-current text-amber-500" />
                {provider.averageRating.toFixed(1)} ·{" "}
                {t("marketplace.labels.reviews", { count: provider.reviewCount })}
              </span>
            )}
            {provider.verifications.map((verification) => (
              <Badge key={verification.type} variant="secondary" className="gap-1">
                <BadgeCheckIcon aria-hidden="true" className="size-3.5" />
                {verification.reviewedAt
                  ? t("verification.public.verifiedOn", {
                      type: t(`verification.types.${verificationMessageKey(verification.type)}`),
                      date: formatter.dateTime(new Date(verification.reviewedAt), {
                        dateStyle: "medium",
                        timeZone: "Asia/Dhaka",
                      }),
                    })
                  : t("verification.public.verified", {
                      type: t(`verification.types.${verificationMessageKey(verification.type)}`),
                    })}
              </Badge>
            ))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm leading-7 whitespace-pre-line">
            {provider.bio}
          </p>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">
          {t("marketplace.providerProfile.servicesAndListings")}
        </h2>
        {provider.listings.length === 0 ? (
          <p className="border-border text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
            {t("workflow.noRecords")}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {provider.listings.map((listing) => (
              <Card key={listing.id}>
                <ListingImage
                  listing={listing}
                  alt={listing.title}
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
                <CardHeader>
                  <CardTitle>{listing.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    {listing.district} · {listing.category}
                    {listing.averageRating !== null && (
                      <span className="inline-flex items-center gap-1">
                        <StarIcon className="size-3 fill-current text-amber-500" />
                        {listing.averageRating.toFixed(1)} ({listing.reviewCount})
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3 text-sm">
                    {listing.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="text-primary text-sm font-semibold">
                      {formatMoney(listing.unitPrice)} / {listing.unit}
                    </span>
                    <Link
                      href={`${base}/listings/${listing.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      {t("workflow.details")}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">{t("marketplace.labels.customerReviews")}</h2>
        {provider.reviews.length === 0 ? (
          <p className="border-border text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
            {t("marketplace.providerProfile.emptyReviews")}
          </p>
        ) : (
          provider.reviews.map((review, index) => (
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
          ))
        )}
      </section>
    </div>
  );
}

function StorefrontPhoto({
  providerId,
  imageType,
  fallback,
  className,
}: {
  providerId: string;
  imageType: "profile" | "cover";
  fallback: string;
  className: string;
}) {
  const source = `/api/providers/${encodeURIComponent(providerId)}/image?type=${imageType}`;
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span
      className={`bg-secondary flex size-full items-center justify-center text-4xl ${className}`}
      aria-hidden="true"
    >
      {fallback}
    </span>
  ) : (
    <Image
      src={source}
      alt=""
      fill
      unoptimized
      className={`object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
