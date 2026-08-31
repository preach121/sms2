import { getSql } from "@/lib/db";
import { num, roundMoney } from "@/lib/utils";

const DEFAULT_MARKUP = 1.5;

export async function getMarkupMultiplier(): Promise<number> {
  const sql = await getSql();
  const rows = await sql<{ value: string }>`
    select value from settings where key = 'markup_multiplier' limit 1
  `;
  const n = num(rows[0]?.value);
  return n > 0 ? n : DEFAULT_MARKUP;
}

export function applyMarkup(wholesale: number, multiplier: number): number {
  return roundMoney(wholesale * multiplier);
}
