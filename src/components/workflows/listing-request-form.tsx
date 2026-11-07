"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useSyncExternalStore } from "react";

import { createMarketplaceRequestAction } from "@/app/actions/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import type { PublicListing } from "@/lib/listings";
import { initialWorkflowState } from "@/lib/workflow-state";

// The min booking date depends on the current date, which only exists on the client.
// Reading it through an external store keeps render pure and avoids hydration mismatches.
const subscribeToDayChange = () => () => {};
const getClientToday = () => new Date().toISOString().slice(0, 10);
const getServerToday = () => "";

export function ListingRequestForm({
  listing,
  routeBase,
  projectId,
  packageId,
  packageLabel,
}: {
  listing: PublicListing;
  routeBase?: string;
  projectId?: string;
  packageId?: string;
  packageLabel?: string;
}) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(
    createMarketplaceRequestAction,
    initialWorkflowState,
  );
  const locale = useLocale();
  const today = useSyncExternalStore(subscribeToDayChange, getClientToday, getServerToday);
  const isScheduled =
    listing.kind === "WORKER" ||
    listing.kind === "MACHINERY" ||
    listing.kind === "CONSTRUCTION_SERVICE";
  const base = routeBase ?? `/dashboard/${listing.sectorSlug}`;
  const projectRequest = Boolean(projectId && packageId);
  const returnTo = `${base}/listings/${listing.id}${projectRequest ? `?${new URLSearchParams({ projectId: projectId!, packageId: packageId! }).toString()}` : ""}`;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="listingId" value={listing.id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {projectRequest && <input type="hidden" name="projectId" value={projectId} />}
      {projectRequest && <input type="hidden" name="packageId" value={packageId} />}
      {projectRequest && (
        <p className="bg-muted/60 rounded-lg px-3 py-2 text-sm">
          <span className="text-muted-foreground">{t("workflow.workPackage")}: </span>
          <strong>{packageLabel}</strong>
        </p>
      )}
      {isScheduled ? (
        <input type="hidden" name="quantity" value="1" />
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="request-quantity">
            {t("workflow.quantity")} ({listing.unit})
          </Label>
          <Input
            id="request-quantity"
            name="quantity"
            type="number"
            min="0.001"
            step="0.001"
            max={listing.stock}
            defaultValue="1"
            required
          />
          <p className="text-muted-foreground text-xs">
            {locale === "bn"
              ? `উপলভ্য: ${listing.stock} ${listing.unit}`
              : `Available: ${listing.stock} ${listing.unit}`}
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="request-district">{t("workflow.district")}</Label>
          <Input
            id="request-district"
            name="district"
            maxLength={80}
            defaultValue={listing.district}
            required
          />
        </div>
        {isScheduled && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="request-start">{t("workflow.startDate")}</Label>
              <Input
                id="request-start"
                name="requestedStart"
                type="date"
                min={today || undefined}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="request-end">{t("workflow.endDate")}</Label>
              <Input
                id="request-end"
                name="requestedEnd"
                type="date"
                min={today || undefined}
                required
              />
            </div>
          </>
        )}
      </div>
      {isScheduled && (
        <p className="text-muted-foreground -mt-2 text-xs">
          {t("inline.daily_rates_are_calculated_for_the_selecte_1ulrn0s")}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="request-details">{t("workflow.details")}</Label>
        <textarea
          id="request-details"
          name="details"
          maxLength={2000}
          rows={4}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-24 resize-y rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-3"
          placeholder={t("inline.add_requirements_collection_or_transport_d_1cb1842")}
        />
      </div>
      <ActionFeedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? t("common.loading") : t("workflow.requestService")}
      </Button>
    </form>
  );
}
