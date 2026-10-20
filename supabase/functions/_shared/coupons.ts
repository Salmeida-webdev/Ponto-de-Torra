export function calculateCouponDiscountCents(
  discountType: string,
  discountValue: number,
  subtotalCents: number,
): number | null {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 1
    || !Number.isSafeInteger(discountValue) || discountValue < 1) return null;

  if (discountType === "percent") {
    if (discountValue > 90) return null;
    const discount = Math.floor(subtotalCents * discountValue / 100);
    return discount > 0 && discount <= subtotalCents ? discount : null;
  }

  if (discountType === "fixed") {
    const discount = Math.min(discountValue, subtotalCents);
    return discount > 0 ? discount : null;
  }

  return null;
}
