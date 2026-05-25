import { CheckoutClient } from "@/components/customer/CheckoutClient";

export default function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  return <CheckoutClientWrapper paramsPromise={params} />;
}

async function CheckoutClientWrapper({ paramsPromise }: { paramsPromise: Promise<{ slug: string }> }) {
  const { slug } = await paramsPromise;
  return <CheckoutClient restaurantSlug={slug} />;
}
