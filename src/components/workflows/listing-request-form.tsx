"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useActionState, useState, useSyncExternalStore } from "react";

import { createMarketplaceRequestAction } from "@/app/actions/marketplace";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ActionFeedback } from "@/components/workflows/action-feedback";
import { Link } from "@/i18n/navigation";
import { getListingFulfillment } from "@/lib/domain/marketplace-rules";
import type { PublicListing } from "@/lib/listings";
import { deliveryMobilityListingKinds } from "@/lib/sector-listing-kinds";
import { initialWorkflowState } from "@/lib/workflow-state";

// The min booking date depends on the current date, which only exists on the client.
// Reading it through an external store keeps render pure and avoids hydration mismatches.
const subscribeToDayChange = () => () => {};
const getClientToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
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
  const today = useSyncExternalStore(subscribeToDayChange, getClientToday, getServerToday);
  const formatter = useFormatter();
  const [quantity, setQuantity] = useState(1);
  const fulfillment = getListingFulfillment(listing.kind);
  const isScheduled = fulfillment === "scheduled";
  const isFiniteStock = fulfillment === "finite-stock";
  const isLogistics =
    listing.kind === deliveryMobilityListingKinds.DELIVERY_SERVICE ||
    listing.kind === deliveryMobilityListingKinds.FREIGHT_TRANSPORT;
  const isVehicle =
    listing.kind === deliveryMobilityListingKinds.VEHICLE_RENTAL ||
    listing.kind === deliveryMobilityListingKinds.PRIVATE_VEHICLE_CHARTER;
  const isCharter = listing.kind === deliveryMobilityListingKinds.PRIVATE_VEHICLE_CHARTER;
  const isMobility = isLogistics || isVehicle;
  const base = routeBase ?? `/dashboard/${listing.sectorSlug}`;
  const projectRequest = Boolean(projectId && packageId);
  const isConstructionMaterial =
    listing.sectorSlug === "construction" && listing.kind === "CONSTRUCTION_MATERIAL";
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
            max={isFiniteStock ? listing.stock : undefined}
            defaultValue="1"
            onChange={(event) => setQuantity(Number(event.target.value) || 0)}
            required
          />
          {isFiniteStock && (
            <p className="text-muted-foreground text-xs">
              {t("workflow.availableQuantity", { quantity: listing.stock, unit: listing.unit })}
            </p>
          )}
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
              <DatePicker
                id="request-start"
                name="requestedStart"
                min={today || undefined}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="request-end">{t("workflow.endDate")}</Label>
              <DatePicker id="request-end" name="requestedEnd" min={today || undefined} required />
            </div>
          </>
        )}
      </div>
      {isConstructionMaterial && (
        <section className="border-border/70 flex flex-col gap-4 rounded-xl border p-4">
          <h3 className="font-semibold">{t("constructionMaterials.deliveryDetails")}</h3>
          <div className="flex flex-col gap-2">
            <Label htmlFor="delivery-address">{t("constructionMaterials.address")}</Label>
            <Textarea
              id="delivery-address"
              name="deliveryAddress"
              maxLength={500}
              rows={2}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="delivery-date">{t("constructionMaterials.preferredDate")}</Label>
              <DatePicker
                id="delivery-date"
                name="requestedDeliveryDate"
                min={today || undefined}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="unloading-arrangement">{t("constructionMaterials.unloading")}</Label>
              <NativeSelect
                id="unloading-arrangement"
                name="unloadingArrangement"
                required
                defaultValue="AGREE"
              >
                <NativeSelectOption value="AGREE">
                  {t("constructionMaterials.unloadingAgree")}
                </NativeSelectOption>
                <NativeSelectOption value="CUSTOMER">
                  {t("constructionMaterials.unloadingCustomer")}
                </NativeSelectOption>
                <NativeSelectOption value="SUPPLIER">
                  {t("constructionMaterials.unloadingSupplier")}
                </NativeSelectOption>
              </NativeSelect>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="delivery-instructions">
              {t("constructionMaterials.accessInstructions")}
            </Label>
            <Textarea
              id="delivery-instructions"
              name="deliveryInstructions"
              maxLength={1200}
              rows={2}
              placeholder={t("constructionMaterials.accessPlaceholder")}
            />
          </div>
          {!isScheduled && (
            <p aria-live="polite" className="bg-muted/50 rounded-lg px-3 py-2 text-sm">
              {t("constructionMaterials.estimatedSubtotal")}:{" "}
              {formatter.number(Number(listing.unitPrice) * quantity, {
                style: "currency",
                currency: "BDT",
                maximumFractionDigits: 2,
              })}
              <span className="text-muted-foreground">
                {" "}
                · {t("constructionMaterials.subtotalNotice")}
              </span>
            </p>
          )}
        </section>
      )}
      {isMobility && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="request-pickup-district">
              {t("marketplace.requestForm.pickupDistrict")}
            </Label>
            <Input id="request-pickup-district" name="pickupDistrict" maxLength={80} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="request-destination-district">
              {t("marketplace.requestForm.destinationDistrict")}
            </Label>
            <Input
              id="request-destination-district"
              name="destinationDistrict"
              maxLength={80}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="request-pickup-address">
              {t("marketplace.requestForm.pickupAddress")}
            </Label>
            <Input id="request-pickup-address" name="pickupAddress" maxLength={240} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="request-destination-address">
              {t("marketplace.requestForm.destinationAddress")}
            </Label>
            <Input id="request-destination-address" name="destinationAddress" maxLength={240} />
          </div>
          {isVehicle && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="request-passenger-count">
                {t("marketplace.requestForm.passengerCount")}
                {isCharter ? " *" : ""}
              </Label>
              <Input
                id="request-passenger-count"
                name="passengerCount"
                type="number"
                min="1"
                max="2147483647"
                step="1"
                required={isCharter}
              />
            </div>
          )}
          {isLogistics && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="request-cargo-description">
                  {t("marketplace.requestForm.cargoDescription")}
                </Label>
                <Textarea
                  id="request-cargo-description"
                  name="cargoDescription"
                  maxLength={1200}
                  rows={3}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="request-parcel-count">
                  {t("marketplace.requestForm.parcelCount")}
                </Label>
                <Input
                  id="request-parcel-count"
                  name="parcelCount"
                  type="number"
                  min="1"
                  max="2147483647"
                  step="1"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="request-weight-kg">{t("marketplace.requestForm.weightKg")}</Label>
                <Input
                  id="request-weight-kg"
                  name="weightKg"
                  type="number"
                  min="0.001"
                  step="0.001"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="request-volume-m3">{t("marketplace.requestForm.volumeM3")}</Label>
                <Input
                  id="request-volume-m3"
                  name="volumeM3"
                  type="number"
                  min="0.001"
                  step="0.001"
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="request-handling-notes">
                  {t("marketplace.requestForm.handlingNotes")}
                </Label>
                <Textarea
                  id="request-handling-notes"
                  name="handlingNotes"
                  maxLength={1200}
                  rows={3}
                />
              </div>
            </>
          )}
        </div>
      )}
      {isScheduled && (
        <p className="text-muted-foreground -mt-2 text-xs">
          {t("marketplace.requestForm.dailyRateNotice")}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="request-details">{t("workflow.details")}</Label>
        <Textarea
          id="request-details"
          name="details"
          maxLength={2000}
          rows={4}
          className="min-h-24 resize-y"
          placeholder={t("marketplace.requestForm.requirementsPlaceholder")}
        />
      </div>
      <ActionFeedback state={state} />
      {state.status === "success" && state.entityId && (
        <Link
          className="text-primary text-sm font-medium underline underline-offset-4"
          href={`/account/construction#request-${state.entityId}`}
        >
          {t("constructionMaterials.viewRequest")}
        </Link>
      )}
      <Button type="submit" disabled={pending}>
        {pending
          ? t("common.loading")
          : isConstructionMaterial
            ? t("constructionMaterials.requestQuote")
            : t("workflow.requestService")}
      </Button>
    </form>
  );
}
