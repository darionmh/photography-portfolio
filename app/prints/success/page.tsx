import { redirect } from "next/navigation";
import Link from "next/link";
import { getStripe } from "@/app/lib/stripe";
import ClearCart from "./ClearCart";

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) redirect("/");

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") redirect("/cart");
  } catch {
    redirect("/");
  }

  return (
    <div className="max-w-md py-8">
      <ClearCart />
      <div className="mb-6">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground mb-4"
          aria-hidden
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
        <h1 className="text-xl font-medium text-foreground lowercase">
          order confirmed
        </h1>
      </div>

      <p className="text-muted text-sm leading-relaxed mb-2">
        Thanks for your order. Your print is being prepared for production and
        will ship within 3–5 business days.
      </p>
      <p className="text-muted text-sm leading-relaxed mb-8">
        You'll receive a confirmation email with tracking info once it's on its
        way.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium lowercase hover:opacity-80 transition-opacity"
      >
        back to gallery
      </Link>
    </div>
  );
}
