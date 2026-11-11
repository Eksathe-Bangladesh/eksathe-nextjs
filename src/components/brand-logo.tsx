import { cn } from "cn";
import Image from "next/image";

export function BrandLogo({
  className,
  loading,
}: {
  className?: string;
  loading?: "eager" | "lazy";
}) {
  return (
    <Image
      src="/brand/eksathe-logo.png"
      alt="একসাথে বাংলাদেশ · EKsathe Bangladesh"
      width={1254}
      height={1254}
      loading={loading}
      sizes="(max-width: 640px) 56px, 96px"
      className={cn("size-14 shrink-0 rounded-lg object-contain", className)}
    />
  );
}
