"use client";

import Image from "next/image";
import { useState } from "react";

import type { PublicListing } from "@/lib/listings";

type ListingVisual = Pick<PublicListing, "id" | "kind" | "category" | "hasImage">;

function listingEmoji(listing: ListingVisual) {
  const category = listing.category.toLowerCase();
  if (listing.kind === "WORKER") return "👨‍🌾";
  if (listing.kind === "MACHINERY") return "🚜";
  if (listing.kind === "CONSTRUCTION_SERVICE") return "👷";
  if (listing.kind === "CONSTRUCTION_MATERIAL") {
    return /brick|ইট/.test(category) ? "🧱" : "🏗️";
  }
  if (/rice|ধান|চাল/.test(category)) return "🌾";
  if (/vegetable|সবজি/.test(category)) return "🥬";
  if (/fruit|ফল/.test(category)) return "🍎";
  if (/milk|dairy|দুধ/.test(category)) return "🥛";
  if (/fish|মাছ/.test(category)) return "🐟";
  if (/spice|মসলা|মশলা/.test(category)) return "🌶️";
  return "🌱";
}

export function ListingImage({
  listing,
  alt,
  sizes,
}: {
  listing: ListingVisual;
  alt: string;
  sizes: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = `/api/listings/${encodeURIComponent(listing.id)}/image`;
  const showPhoto = listing.hasImage && failedSource !== source;

  return (
    <div
      data-slot="listing-image"
      className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-t-xl bg-secondary/50"
    >
      {showPhoto ? (
        <Image
          src={source}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
          unoptimized
          onError={() => setFailedSource(source)}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="flex size-full items-center justify-center bg-linear-to-br from-primary/5 to-primary/15"
        >
          <span aria-hidden="true" className="text-7xl select-none">
            {listingEmoji(listing)}
          </span>
        </div>
      )}
    </div>
  );
}
