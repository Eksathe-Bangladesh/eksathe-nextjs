export const instant = false;

import { getLocale } from "next-intl/server";

import {
  checkoutCommerceCartAction,
  removeCommerceCartItemAction,
  saveCommerceAddressAction,
} from "@/app/actions/commerce";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export default async function CommerceCartPage() {
  const [user, locale] = await Promise.all([
    requireUser("/dashboard/ecommerce-b2b/cart"),
    getLocale(),
  ]);
  const [cart, addresses] = await Promise.all([
    prisma.commerceCartItem.findMany({
      where: { userId: user.id },
      include: { product: { include: { seller: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.commerceAddress.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  const bn = locale === "bn";
  const total = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{bn ? "আপনার কার্ট" : "Your cart"}</h1>
        <Link className="text-primary text-sm" href="/dashboard/ecommerce-b2b">
          {bn ? "বাজারে ফিরুন" : "Continue shopping"}
        </Link>
      </header>
      {cart.length ? (
        <section className="bg-card rounded-2xl border p-5">
          <ul className="divide-y">
            {cart.map(({ product, quantity }) => (
              <li
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <Link
                    className="font-semibold hover:underline"
                    href={`/dashboard/ecommerce-b2b/products/${product.id}`}
                  >
                    {bn ? product.titleBn : product.titleEn}
                  </Link>
                  <p className="text-muted-foreground text-sm">
                    {product.seller.displayName} · {quantity} × ৳ {product.price.toFixed(2)} /{" "}
                    {product.unit}
                  </p>
                </div>
                <form action={removeCommerceCartItemAction}>
                  <input type="hidden" name="productId" value={product.id} />
                  <button className="text-destructive rounded-md border px-3 py-2 text-sm">
                    {bn ? "বাদ দিন" : "Remove"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-right text-lg font-bold">
            {bn ? "পণ্যের মোট" : "Items subtotal"}: ৳ {total.toFixed(2)}
          </p>
        </section>
      ) : (
        <p className="rounded-xl border border-dashed p-8 text-center">
          {bn ? "কার্টে কোনো পণ্য নেই।" : "Your cart is empty."}
        </p>
      )}

      <section className="grid gap-6 md:grid-cols-2">
        <div className="bg-card rounded-2xl border p-5">
          <h2 className="text-xl font-semibold">
            {bn ? "ডেলিভারি ঠিকানা যোগ করুন" : "Add a delivery address"}
          </h2>
          <form action={saveCommerceAddressAction} className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              {bn ? "নাম" : "Full name"}
              <input
                name="fullName"
                maxLength={120}
                required
                className="bg-background rounded-md border px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              {bn ? "ফোন" : "Phone"}
              <input
                name="phone"
                type="tel"
                maxLength={24}
                required
                className="bg-background rounded-md border px-3 py-2"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm">
                {bn ? "জেলা" : "District"}
                <input
                  name="district"
                  maxLength={80}
                  required
                  className="bg-background rounded-md border px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm">
                {bn ? "শহর/উপজেলা" : "City / upazila"}
                <input
                  name="city"
                  maxLength={80}
                  required
                  className="bg-background rounded-md border px-3 py-2"
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              {bn ? "সম্পূর্ণ ঠিকানা" : "Address"}
              <textarea
                name="addressLine"
                maxLength={240}
                required
                rows={2}
                className="bg-background rounded-md border px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm">
              {bn ? "পোস্ট কোড (ঐচ্ছিক)" : "Postal code (optional)"}
              <input
                name="postalCode"
                maxLength={16}
                className="bg-background rounded-md border px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="isDefault" type="checkbox" />
              {bn ? "ডিফল্ট ঠিকানা" : "Make default"}
            </label>
            <button className="rounded-md border px-4 py-2">
              {bn ? "ঠিকানা সংরক্ষণ" : "Save address"}
            </button>
          </form>
        </div>

        <div className="bg-card rounded-2xl border p-5">
          <h2 className="text-xl font-semibold">{bn ? "অর্ডার নিশ্চিত করুন" : "Place your order"}</h2>
          {cart.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-sm">
              {bn ? "চেকআউট করতে কার্টে পণ্য যোগ করুন।" : "Add products to your cart before checkout."}
            </p>
          ) : addresses.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-sm">
              {bn ? "প্রথমে ডেলিভারি ঠিকানা যোগ করুন।" : "Add a delivery address first."}
            </p>
          ) : (
            <form action={checkoutCommerceCartAction} className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm">
                {bn ? "ডেলিভারি ঠিকানা" : "Delivery address"}
                <select
                  name="addressId"
                  required
                  className="bg-background rounded-md border px-3 py-2"
                >
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.fullName} · {address.addressLine}, {address.district}
                      {address.isDefault ? ` (${bn ? "ডিফল্ট" : "default"})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                {bn ? "পেমেন্ট পদ্ধতি" : "Payment method"}
                <select name="paymentMethod" className="bg-background rounded-md border px-3 py-2">
                  <option value="CASH_ON_DELIVERY">
                    {bn ? "ক্যাশ অন ডেলিভারি" : "Cash on delivery"}
                  </option>
                  <option value="MOBILE_WALLET">
                    {bn
                      ? "মোবাইল ওয়ালেট (বিক্রেতার সঙ্গে নিশ্চিত করুন)"
                      : "Mobile wallet (confirm with seller)"}
                  </option>
                  <option value="BANK_TRANSFER">
                    {bn
                      ? "ব্যাংক ট্রান্সফার (বিক্রেতার সঙ্গে নিশ্চিত করুন)"
                      : "Bank transfer (confirm with seller)"}
                  </option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                {bn ? "কুপন কোড (ঐচ্ছিক)" : "Coupon code (optional)"}
                <input
                  name="couponCode"
                  maxLength={32}
                  className="bg-background rounded-md border px-3 py-2"
                />
              </label>
              <p className="text-muted-foreground text-xs">
                {bn
                  ? "স্টক নিশ্চিত করে একাধিক বিক্রেতার অর্ডার আলাদাভাবে তৈরি হবে।"
                  : "Stock is rechecked and each seller receives a separate order."}
              </p>
              <button className="bg-primary text-primary-foreground rounded-md px-4 py-2">
                {bn ? `৳ ${total.toFixed(2)} দিয়ে অর্ডার` : `Place order · ৳ ${total.toFixed(2)}`}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
