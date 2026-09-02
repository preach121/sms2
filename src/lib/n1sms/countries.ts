import type { CatalogueCountry, CatalogueOffer } from "./types";

function key(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export const SUPPLIER_ISO_IDS: Record<string, string> = {
  AF: "69", AI: "148", AL: "123", AM: "118", AO: "71", AR: "43", AT: "50", AW: "138", AX: "156", AZ: "154",
  BA: "162", BB: "143", BD: "58", BE: "75", BG: "76", BI: "96", BJ: "97", BN: "98", BO: "84", BR: "68",
  BS: "144", BT: "126", BW: "99", BY: "51", BZ: "100", CH: "134", CL: "120", CM: "45", CO: "39", CY: "72",
  CZ: "149", DE: "24", DJ: "132", DK: "19", DM: "145", DZ: "56", EC: "89", EE: "10", EG: "31", ER: "137",
  ES: "55", ET: "66", FI: "130", FJ: "140", FR: "23", GA: "122", GB: "2", GD: "146", GE: "101", GH: "42",
  GI: "158", GM: "36", GN: "63", GP: "128", GR: "102", GT: "85", GY: "103", HK: "151", HN: "81", HR: "48",
  HT: "35", HU: "77", ID: "9", IE: "32", IL: "29", IN: "15", IQ: "49", IS: "104", IT: "79", JM: "142",
  JO: "95", JP: "157", KE: "16", KG: "18", KH: "33", KM: "105", KW: "88", KZ: "7", LA: "34", LB: "121",
  LR: "106", LS: "107", LT: "47", LU: "131", LV: "5", MA: "41", MC: "115", MD: "78", ME: "133", MG: "30",
  ML: "64", MN: "67", MO: "163", MR: "94", MS: "147", MT: "164", MU: "125", MV: "127", MW: "108", MX: "53",
  MY: "20", MZ: "73", NA: "109", NE: "110", NG: "14", NI: "83", NL: "3", NO: "135", NP: "74", OM: "91",
  PE: "61", PH: "12", PK: "62", PL: "21", PT: "8", PY: "80", QA: "92", RO: "13", RS: "37", RW: "111",
  SC: "139", SE: "6", SG: "141", SI: "57", SK: "112", SN: "59", SO: "119", SR: "113", SZ: "90", TD: "46",
  TG: "87", TH: "52", TJ: "114", TM: "129", TN: "82", TR: "60", TW: "54", TZ: "27", UA: "25", UG: "70",
  US: "1", UY: "124", UZ: "44", VE: "65", VN: "11", YE: "38", ZA: "153", ZM: "117", ZW: "86",
};

const NAME_ISO: Record<string, string> = {
  unitedstates: "US", usa: "US", america: "US",
  unitedkingdom: "GB", uk: "GB", greatbritain: "GB", england: "GB",
  sweden: "SE", ghana: "GH", nigeria: "NG", kenya: "KE",
  canada: "CA", germany: "DE", france: "FR", netherlands: "NL",
  indonesia: "ID", india: "IN", poland: "PL", latvia: "LV",
};

export function isoForCountry(input: { countryName?: string; countryIso2?: string }): string | null {
  const iso = input.countryIso2?.trim().toUpperCase();
  if (iso && iso.length === 2) return iso;
  const nameIso = NAME_ISO[key(input.countryName ?? "")];
  return nameIso ?? null;
}

export function matchCountry(
  countries: CatalogueCountry[],
  input: { countryId?: string; countryName?: string; countryIso2?: string },
): CatalogueCountry | null {
  const iso = isoForCountry(input);
  const supplierId = iso ? SUPPLIER_ISO_IDS[iso] : undefined;
  if (iso && supplierId) {
    const listed = countries.find((c) => c.iso2.toUpperCase() === iso && c.id === supplierId)
      ?? countries.find((c) => c.id === supplierId)
      ?? countries.find((c) => c.iso2.toUpperCase() === iso);
    return {
      id: supplierId,
      name: input.countryName?.trim() || listed?.name || iso,
      iso2: iso,
      dial: listed?.dial ?? "",
    };
  }
  const name = key(input.countryName ?? "");
  if (name) {
    const hit = countries.find((c) => key(c.name) === name);
    if (hit) return hit;
  }
  return null;
}

export function findOfferForBuy(
  offers: CatalogueOffer[],
  input: { serviceId: string; countryId: string; countryName?: string; countryIso2?: string },
): CatalogueOffer | undefined {
  const iso = isoForCountry(input);
  const name = key(input.countryName ?? "");
  return (
    offers.find(
      (row) =>
        row.serviceId === input.serviceId &&
        iso &&
        (row.countryIso2.toUpperCase() === iso || isoForCountry(row) === iso),
    ) ||
    offers.find(
      (row) =>
        row.serviceId === input.serviceId &&
        name &&
        key(row.countryName) === name,
    ) ||
    offers.find(
      (row) =>
        row.serviceId === input.serviceId &&
        row.countryId === input.countryId &&
        (!name || key(row.countryName) === name),
    )
  );
}export function phoneMatchesDial(phone: string | null | undefined, dial: string | null | undefined): boolean {
  if (!phone || !dial) return true;
  const p = phone.replace(/\D/g, "");
  const d = dial.replace(/\D/g, "");
  if (!p || !d) return true;
  return p.startsWith(d);
}
