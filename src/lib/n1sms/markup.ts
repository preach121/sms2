import { getSql } from "@/lib/db"; import { num, roundMoney } from "@/lib/utils";
const DEFAULT_MARKUP = 1.5;
export async function getMarkupMultiplier(): Promise<number> { const sql = await getSql(); const rows = await sql<{ value: string }>select value from settings where key = 'markup_multiplier' limit 1; const n = num(rows[0]?.value); return n > 0 ? n : DEFAULT_MARKUP; }
export async function getWhatsappMarkupMultiplier(): Promise<number | null> { const sql = await getSql(); const rows = await sql<{ value: string }>select value from settings where key = 'whatsapp_markup_multiplier' limit 1; const n = num(rows[0]?.value); return n > 0 ? n : null; }
export function isWhatsappService(serviceId?: string, serviceName?: string): boolean { const hay = ${serviceId ?? ""} ${serviceName ?? ""}.toLowerCase(); return hay.includes("whatsapp") || serviceId === "1012"; }
export async function markupForService(serviceId?: string, serviceName?: string): Promise<number> { const base = await getMarkupMultiplier(); if (!isWhatsappService(serviceId, serviceName)) return base; const wa = await getWhatsappMarkupMultiplier(); return wa && wa > 0 ? wa : base; }
export function applyMarkup(wholesale: number, multiplier: number): number { return roundMoney(wholesale * multiplier); }
