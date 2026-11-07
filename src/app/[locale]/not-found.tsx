import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("nav");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
        404
      </span>
      <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
        Page not found
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-6">
        <Link href="/" className={buttonVariants()}>
          {t("returnHome")}
        </Link>
      </div>
    </div>
  );
}
