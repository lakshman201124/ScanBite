export interface BillLineItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface BillInput {
  items: Array<{ item_name: string; item_price: number | string; quantity: number }>;
  cgst_rate?: number;
  sgst_rate?: number;
  discount_percent?: number;
  tip_amount?: number;
}

export interface BillResult {
  items: BillLineItem[];
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  discounted_subtotal: number;
  cgst_rate: number;
  sgst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  tax_total: number;
  tip_amount: number;
  final_amount: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateBill(input: BillInput): BillResult {
  const cgst_rate = input.cgst_rate ?? 2.5;
  const sgst_rate = input.sgst_rate ?? 2.5;
  const discount_percent = input.discount_percent ?? 0;
  const tip_amount = round2(input.tip_amount ?? 0);

  const items: BillLineItem[] = input.items.map((i) => {
    const unit_price = round2(Number(i.item_price));
    const total = round2(unit_price * i.quantity);
    return { name: i.item_name, quantity: i.quantity, unit_price, total };
  });

  const subtotal = round2(items.reduce((s, i) => s + i.total, 0));
  const discount_amount = round2(subtotal * (discount_percent / 100));
  const discounted_subtotal = round2(subtotal - discount_amount);

  // GST applied after discount
  const cgst_amount = round2(discounted_subtotal * (cgst_rate / 100));
  const sgst_amount = round2(discounted_subtotal * (sgst_rate / 100));
  const tax_total = round2(cgst_amount + sgst_amount);

  // Tip added after tax
  const final_amount = round2(discounted_subtotal + tax_total + tip_amount);

  return {
    items,
    subtotal,
    discount_percent,
    discount_amount,
    discounted_subtotal,
    cgst_rate,
    sgst_rate,
    cgst_amount,
    sgst_amount,
    tax_total,
    tip_amount,
    final_amount,
  };
}

import { prisma } from "@/lib/db";

export async function generateBillNumber(restaurantId: string): Promise<string> {
  const prefix = "BILL-";

  // Use raw query to avoid TypeScript issues when Prisma client hasn't been regenerated yet
  const last = await prisma.$queryRaw<Array<{ bill_number: string | null }>>`
    SELECT bill_number FROM bills
    WHERE restaurant_id = ${restaurantId}
      AND bill_number LIKE ${prefix + "%"}
    ORDER BY bill_number DESC
    LIMIT 1
  `;

  let nextNum = 1;
  const lastBillNumber = last[0]?.bill_number;
  if (lastBillNumber) {
    const parts = lastBillNumber.split("-");
    const numPart = parts[1];
    if (numPart) {
      const num = parseInt(numPart, 10);
      if (!isNaN(num)) {
        nextNum = num + 1;
      }
    }
  }

  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}
