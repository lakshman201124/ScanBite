import { CMD, buildBuffer, boldLine, centeredLine, dashes, line, twoColLine } from "./escpos";

export interface KOTInput {
  restaurant_name: string;
  table_number: string;
  order_number: string;
  created_at: string;
  items: Array<{
    item_name: string;
    quantity: number;
    customizations?: Record<string, string> | null;
    note?: string | null;
  }>;
}

export function buildKOTBuffer(input: KOTInput): Uint8Array {
  const time = new Date(input.created_at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const segments: number[][] = [
    CMD.INIT,
    ...centeredLine(input.restaurant_name).map(n => [n]),
    ...boldLine("KITCHEN ORDER TICKET").map(n => [n]),
    dashes(),
    twoColLine("Table:", `T${input.table_number}`),
    twoColLine("KOT # :", input.order_number),
    twoColLine("Time  :", time),
    dashes(),
    boldLine("QTY  ITEM"),
    dashes(),
  ];

  for (const item of input.items) {
    const qty = String(item.quantity).padStart(2, " ");
    const name = item.item_name.slice(0, 26);
    segments.push(line(`${qty}   ${name}`));

    if (item.customizations) {
      for (const [k, v] of Object.entries(item.customizations)) {
        const note = `     > ${k}: ${v}`.slice(0, 32);
        segments.push(line(note));
      }
    }
    if (item.note) {
      segments.push(line(`     * ${item.note}`.slice(0, 32)));
    }
  }

  segments.push(
    dashes(),
    centeredLine("*** CUT ***"),
    CMD.LF,
    CMD.CUT,
  );

  return buildBuffer(segments);
}
