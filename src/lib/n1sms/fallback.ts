import { FALLBACK_SERVICES } from "./catalog";
import type { CatalogueCountry, CatalogueOffer, CatalogueService, StockCheck } from "./types";

export { FALLBACK_SERVICES };

/**
 * N1SMS documents country id `1` in the order example. Ghana is listed first
 * as the home market; remaining ISO countries are numbered so the marketplace
 * can render before the first successful upstream sync.
 */
export const FALLBACK_COUNTRIES: CatalogueCountry[] = [
  { id: "1", name: "Ghana", iso2: "GH", dial: "+233" },
  { id: "2", name: "Nigeria", iso2: "NG", dial: "+234" },
  { id: "3", name: "Kenya", iso2: "KE", dial: "+254" },
  { id: "4", name: "South Africa", iso2: "ZA", dial: "+27" },
  { id: "5", name: "United Kingdom", iso2: "GB", dial: "+44" },
  { id: "6", name: "United States", iso2: "US", dial: "+1" },
  { id: "7", name: "Canada", iso2: "CA", dial: "+1" },
  { id: "8", name: "Germany", iso2: "DE", dial: "+49" },
  { id: "9", name: "France", iso2: "FR", dial: "+33" },
  { id: "10", name: "Netherlands", iso2: "NL", dial: "+31" },
  { id: "11", name: "Spain", iso2: "ES", dial: "+34" },
  { id: "12", name: "Italy", iso2: "IT", dial: "+39" },
  { id: "13", name: "Portugal", iso2: "PT", dial: "+351" },
  { id: "14", name: "Poland", iso2: "PL", dial: "+48" },
  { id: "15", name: "Ukraine", iso2: "UA", dial: "+380" },
  { id: "16", name: "India", iso2: "IN", dial: "+91" },
  { id: "17", name: "Indonesia", iso2: "ID", dial: "+62" },
  { id: "18", name: "Philippines", iso2: "PH", dial: "+63" },
  { id: "19", name: "Vietnam", iso2: "VN", dial: "+84" },
  { id: "20", name: "Thailand", iso2: "TH", dial: "+66" },
  { id: "21", name: "Malaysia", iso2: "MY", dial: "+60" },
  { id: "22", name: "Singapore", iso2: "SG", dial: "+65" },
  { id: "23", name: "Australia", iso2: "AU", dial: "+61" },
  { id: "24", name: "Brazil", iso2: "BR", dial: "+55" },
  { id: "25", name: "Mexico", iso2: "MX", dial: "+52" },
  { id: "26", name: "Argentina", iso2: "AR", dial: "+54" },
  { id: "27", name: "Colombia", iso2: "CO", dial: "+57" },
  { id: "28", name: "Chile", iso2: "CL", dial: "+56" },
  { id: "29", name: "Turkey", iso2: "TR", dial: "+90" },
  { id: "30", name: "Egypt", iso2: "EG", dial: "+20" },
  { id: "31", name: "Morocco", iso2: "MA", dial: "+212" },
  { id: "32", name: "Ivory Coast", iso2: "CI", dial: "+225" },
  { id: "33", name: "Cameroon", iso2: "CM", dial: "+237" },
  { id: "34", name: "Togo", iso2: "TG", dial: "+228" },
  { id: "35", name: "Benin", iso2: "BJ", dial: "+229" },
  { id: "36", name: "Senegal", iso2: "SN", dial: "+221" },
  { id: "37", name: "Tanzania", iso2: "TZ", dial: "+255" },
  { id: "38", name: "Uganda", iso2: "UG", dial: "+256" },
  { id: "39", name: "Ethiopia", iso2: "ET", dial: "+251" },
  { id: "40", name: "Rwanda", iso2: "RW", dial: "+250" },
  { id: "41", name: "China", iso2: "CN", dial: "+86" },
  { id: "42", name: "Japan", iso2: "JP", dial: "+81" },
  { id: "43", name: "South Korea", iso2: "KR", dial: "+82" },
  { id: "44", name: "Pakistan", iso2: "PK", dial: "+92" },
  { id: "45", name: "Bangladesh", iso2: "BD", dial: "+880" },
  { id: "46", name: "Nepal", iso2: "NP", dial: "+977" },
  { id: "47", name: "Sri Lanka", iso2: "LK", dial: "+94" },
  { id: "48", name: "UAE", iso2: "AE", dial: "+971" },
  { id: "49", name: "Saudi Arabia", iso2: "SA", dial: "+966" },
  { id: "50", name: "Israel", iso2: "IL", dial: "+972" },
  { id: "51", name: "Sweden", iso2: "SE", dial: "+46" },
  { id: "52", name: "Norway", iso2: "NO", dial: "+47" },
  { id: "53", name: "Denmark", iso2: "DK", dial: "+45" },
  { id: "54", name: "Finland", iso2: "FI", dial: "+358" },
  { id: "55", name: "Ireland", iso2: "IE", dial: "+353" },
  { id: "56", name: "Belgium", iso2: "BE", dial: "+32" },
  { id: "57", name: "Switzerland", iso2: "CH", dial: "+41" },
  { id: "58", name: "Austria", iso2: "AT", dial: "+43" },
  { id: "59", name: "Czechia", iso2: "CZ", dial: "+420" },
  { id: "60", name: "Romania", iso2: "RO", dial: "+40" },
  { id: "61", name: "Hungary", iso2: "HU", dial: "+36" },
  { id: "62", name: "Greece", iso2: "GR", dial: "+30" },
  { id: "63", name: "Serbia", iso2: "RS", dial: "+381" },
  { id: "64", name: "Croatia", iso2: "HR", dial: "+385" },
  { id: "65", name: "Bulgaria", iso2: "BG", dial: "+359" },
  { id: "66", name: "Lithuania", iso2: "LT", dial: "+370" },
  { id: "67", name: "Latvia", iso2: "LV", dial: "+371" },
  { id: "68", name: "Estonia", iso2: "EE", dial: "+372" },
  { id: "69", name: "Russia", iso2: "RU", dial: "+7" },
  { id: "70", name: "Kazakhstan", iso2: "KZ", dial: "+7" },
  { id: "71", name: "Hong Kong", iso2: "HK", dial: "+852" },
  { id: "72", name: "Taiwan", iso2: "TW", dial: "+886" },
  { id: "73", name: "New Zealand", iso2: "NZ", dial: "+64" },
  { id: "74", name: "Peru", iso2: "PE", dial: "+51" },
  { id: "75", name: "Ecuador", iso2: "EC", dial: "+593" },
  { id: "76", name: "Venezuela", iso2: "VE", dial: "+58" },
  { id: "77", name: "Dominican Republic", iso2: "DO", dial: "+1" },
  { id: "78", name: "Jamaica", iso2: "JM", dial: "+1" },
  { id: "79", name: "Trinidad and Tobago", iso2: "TT", dial: "+1" },
  { id: "80", name: "Haiti", iso2: "HT", dial: "+509" },
  { id: "81", name: "Algeria", iso2: "DZ", dial: "+213" },
  { id: "82", name: "Tunisia", iso2: "TN", dial: "+216" },
  { id: "83", name: "Libya", iso2: "LY", dial: "+218" },
  { id: "84", name: "Sudan", iso2: "SD", dial: "+249" },
  { id: "85", name: "Zambia", iso2: "ZM", dial: "+260" },
  { id: "86", name: "Zimbabwe", iso2: "ZW", dial: "+263" },
  { id: "87", name: "Botswana", iso2: "BW", dial: "+267" },
  { id: "88", name: "Namibia", iso2: "NA", dial: "+264" },
  { id: "89", name: "Mozambique", iso2: "MZ", dial: "+258" },
  { id: "90", name: "Angola", iso2: "AO", dial: "+244" },
  { id: "91", name: "DR Congo", iso2: "CD", dial: "+243" },
  { id: "92", name: "Mali", iso2: "ML", dial: "+223" },
  { id: "93", name: "Burkina Faso", iso2: "BF", dial: "+226" },
  { id: "94", name: "Guinea", iso2: "GN", dial: "+224" },
  { id: "95", name: "Sierra Leone", iso2: "SL", dial: "+232" },
  { id: "96", name: "Liberia", iso2: "LR", dial: "+231" },
  { id: "97", name: "Gambia", iso2: "GM", dial: "+220" },
  { id: "98", name: "Mauritius", iso2: "MU", dial: "+230" },
  { id: "99", name: "Madagascar", iso2: "MG", dial: "+261" },
  { id: "100", name: "Cambodia", iso2: "KH", dial: "+855" },
  { id: "101", name: "Laos", iso2: "LA", dial: "+856" },
  { id: "102", name: "Myanmar", iso2: "MM", dial: "+95" },
  { id: "103", name: "Mongolia", iso2: "MN", dial: "+976" },
  { id: "104", name: "Georgia", iso2: "GE", dial: "+995" },
  { id: "105", name: "Armenia", iso2: "AM", dial: "+374" },
  { id: "106", name: "Azerbaijan", iso2: "AZ", dial: "+994" },
  { id: "107", name: "Uzbekistan", iso2: "UZ", dial: "+998" },
  { id: "108", name: "Kyrgyzstan", iso2: "KG", dial: "+996" },
];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function fallbackOffers(markup: number, serviceId?: string): CatalogueOffer[] {
  const services = serviceId
    ? FALLBACK_SERVICES.filter((s) => s.id === serviceId)
    : FALLBACK_SERVICES;
  const offers: CatalogueOffer[] = [];
  for (const service of services) {
    for (const country of FALLBACK_COUNTRIES) {
      const seed = hash(`${service.id}:${country.id}`);
      const base = 3 + (seed % 1800) / 100;
      const wholesale = Math.round(base * 100) / 100;
      const stock = seed % 17 === 0 ? 0 : 4 + (seed % 80);
      offers.push({
        serviceId: service.id,
        serviceName: service.name,
        countryId: country.id,
        countryName: country.name,
        countryIso2: country.iso2,
        wholesalePrice: wholesale,
        customerPrice: Math.round(wholesale * markup * 100) / 100,
        stock,
        available: stock > 0,
      });
    }
  }
  return offers;
}

export function fallbackStock(
  input: { countryId: string; serviceId: string },
  markup: number,
): StockCheck {
  const offer = fallbackOffers(markup, input.serviceId).find(
    (row) => row.countryId === input.countryId,
  );
  if (!offer) {
    return {
      countryId: input.countryId,
      serviceId: input.serviceId,
      stock: 0,
      wholesalePrice: 0,
      available: false,
    };
  }
  return {
    countryId: input.countryId,
    serviceId: input.serviceId,
    stock: offer.stock,
    wholesalePrice: offer.wholesalePrice,
    available: offer.available,
  };
}

const fallbackOrders = ((globalThis as typeof globalThis & {
  __sms2FallbackOrders?: Map<
    string,
    {
      phone: string;
      createdAt: number;
      expiresAt: number;
      codeAt: number;
      cancelled: boolean;
      serviceName: string;
      country: CatalogueCountry;
    }
  >;
}).__sms2FallbackOrders ??= new Map());

function randomDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i += 1) s += String(Math.floor(Math.random() * 10));
  return s;
}

export function fallbackPurchase(input: {
  countryId: string;
  serviceId: string;
}): {
  providerOrderId: string;
  phoneNumber: string;
  status: string;
  expiresAt: string;
  smsCode: null;
  messages: [];
} {
  const country =
    FALLBACK_COUNTRIES.find((c) => c.id === input.countryId) ?? FALLBACK_COUNTRIES[0]!;
  const service =
    FALLBACK_SERVICES.find((s) => s.id === input.serviceId) ?? FALLBACK_SERVICES[0]!;
  const localLen = country.iso2 === "GH" ? 9 : 8 + (hash(country.id) % 3);
  const phone = `${country.dial}${randomDigits(localLen)}`;
  const id = `fb_${crypto.randomUUID()}`;
  const now = Date.now();
  fallbackOrders.set(id, {
    phone,
    createdAt: now,
    expiresAt: now + 20 * 60 * 1000,
    codeAt: now + 8_000 + Math.floor(Math.random() * 7_000),
    cancelled: false,
    serviceName: service.name,
    country,
  });
  return {
    providerOrderId: id,
    phoneNumber: phone,
    status: "active",
    expiresAt: new Date(now + 20 * 60 * 1000).toISOString(),
    smsCode: null,
    messages: [],
  };
}

export function fallbackGetOrder(id: string): {
  providerOrderId: string;
  phoneNumber: string;
  status: string;
  expiresAt: string | null;
  smsCode: string | null;
  messages: Array<{ sender?: string; body: string; code?: string }>;
} {
  const row = fallbackOrders.get(id);
  if (!row) {
    throw new Error("Upstream order was not found.");
  }
  if (row.cancelled) {
    return {
      providerOrderId: id,
      phoneNumber: row.phone,
      status: "cancelled",
      expiresAt: new Date(row.expiresAt).toISOString(),
      smsCode: null,
      messages: [],
    };
  }
  const now = Date.now();
  if (now >= row.expiresAt) {
    return {
      providerOrderId: id,
      phoneNumber: row.phone,
      status: "expired",
      expiresAt: new Date(row.expiresAt).toISOString(),
      smsCode: null,
      messages: [],
    };
  }
  if (now >= row.codeAt) {
    const code = String((hash(id) % 900000) + 100000);
    const body = `Your ${row.serviceName} verification code is ${code}. Do not share it.`;
    return {
      providerOrderId: id,
      phoneNumber: row.phone,
      status: "received",
      expiresAt: new Date(row.expiresAt).toISOString(),
      smsCode: code,
      messages: [{ sender: row.serviceName, body, code }],
    };
  }
  return {
    providerOrderId: id,
    phoneNumber: row.phone,
    status: "active",
    expiresAt: new Date(row.expiresAt).toISOString(),
    smsCode: null,
    messages: [],
  };
}

export function fallbackCancel(id: string): { refunded: boolean } {
  const row = fallbackOrders.get(id);
  if (!row) return { refunded: false };
  if (Date.now() >= row.codeAt) return { refunded: false };
  row.cancelled = true;
  return { refunded: true };
}

export function knownFallbackService(id: string): CatalogueService | undefined {
  return FALLBACK_SERVICES.find((s) => s.id === id);
}
