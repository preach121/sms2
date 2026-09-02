import { getSql } from "@/lib/db";
import { num, roundMoney } from "@/lib/utils";

const DEFAULT_MARKUP = 1.5;
const CHAT_MARKUP = 2.5;

function isChatApp(serviceId, serviceName) {
  const t = (String(serviceId  "") + " " + String(serviceName  "")).toLowerCase();
  return t.indexOf("whatsapp") >= 0  t.indexOf("telegram") >= 0  serviceId === "1012" || serviceId === "907";
}

export async function getMarkupMultiplier() {
  const sql = await getSql();
  const rows = await sql.query("select value from settings where key = 'markup_multiplier' limit 1");
  const row = rows[0];
  const n = num(row ? row.value : 0);
  return n > 0 ? n : DEFAULT_MARKUP;
}

export async function markupForService(serviceId, serviceName) {
  const base = await getMarkupMultiplier();
  if (isChatApp(serviceId, serviceName)) return CHAT_MARKUP;
  return base;
}

export function applyMarkup(wholesale, multiplier) {
  return roundMoney(wholesale * multiplier);
}
