import { getSql } from "@/lib/db";
import { num, roundMoney } from "@/lib/utils";

const DEFAULT_MARKUP = 1.5;

export async function getMarkupMultiplier() {
  const sql = await getSql();
  const rows = await sql.query("select value from settings where key = 'markup_multiplier' limit 1");
  const row = rows[0];
  const n = num(row ? row.value : 0);
  return n > 0 ? n : DEFAULT_MARKUP;
}

export function applyMarkup(wholesale, multiplier) {
  return roundMoney(wholesale * multiplier);
}
