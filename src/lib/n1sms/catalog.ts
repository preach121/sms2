import type { CatalogueService, ServiceCategory } from "./types";

export const SERVICE_CATEGORIES: Array<{ id: ServiceCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "dating", label: "Dating" },
  { id: "messaging", label: "Messaging" },
  { id: "social", label: "Social" },
  { id: "finance", label: "Finance" },
  { id: "streaming", label: "Streaming" },
  { id: "tech", label: "Tech" },
  { id: "other", label: "Other" },
];

function svc(
  id: string,
  name: string,
  slug: string,
  category: ServiceCategory,
  aliases: string[] = [],
): CatalogueService {
  return { id, name, slug, category, aliases: aliases.length ? aliases : undefined };
}

/** Documented N1SMS IDs plus the dating / extra catalogue used when live inventory is thin. */
export const FALLBACK_SERVICES: CatalogueService[] = [
  svc("1688", "One-Time SMS", "one-time-sms", "other", ["otp", "any", "generic"]),
  svc("1012", "WhatsApp", "whatsapp", "messaging"),
  svc("329", "Facebook", "facebook", "social"),
  svc("457", "Instagram", "instagram", "social"),
  svc("907", "Telegram", "telegram", "messaging"),
  svc("924", "TikTok", "tiktok", "social"),
  svc("948", "Twitter / X", "twitter", "social", ["x", "twitter"]),
  svc("1227", "YouTube", "youtube", "social"),
  svc("395", "Google", "google", "tech", ["gmail"]),
  svc("880", "Microsoft", "microsoft", "tech", ["outlook", "hotmail", "xbox"]),
  svc("881", "Apple", "apple", "tech", ["icloud", "app store"]),
  svc("882", "Amazon", "amazon", "tech", ["aws", "prime"]),
  svc("883", "Discord", "discord", "messaging"),
  svc("884", "Snapchat", "snapchat", "messaging"),
  svc("885", "LinkedIn", "linkedin", "social"),
  svc("886", "Uber", "uber", "other"),
  svc("887", "Bolt", "bolt", "other"),
  svc("888", "Binance", "binance", "finance"),
  svc("889", "PayPal", "paypal", "finance"),
  svc("890", "Netflix", "netflix", "streaming"),
  svc("891", "Spotify", "spotify", "streaming"),
  svc("893", "Viber", "viber", "messaging"),
  svc("894", "WeChat", "wechat", "messaging"),

  svc("926", "Tinder", "tinder", "dating"),
  svc("559", "Match", "match", "dating", ["match.com", "match com", "meetic"]),
  svc("680", "OurTime", "ourtime", "dating", ["our time", "ourtime.com"]),
  svc("724", "Plenty of Fish", "plenty-of-fish", "dating", ["pof", "plentyoffish", "plenty of fishes"]),
  svc("142", "Bumble", "bumble", "dating"),
  svc("420", "Hinge", "hinge", "dating"),
  svc("658", "OkCupid", "okcupid", "dating", ["ok cupid", "okc"]),
  svc("65", "Badoo", "badoo", "dating"),
  svc("2108", "eHarmony", "eharmony", "dating", ["e harmony"]),
  svc("1070", "Zoosk", "zoosk", "dating"),
  svc("206", "Coffee Meets Bagel", "coffee-meets-bagel", "dating", ["cmb"]),
  svc("409", "Happn", "happn", "dating"),
  svc("403", "Grindr", "grindr", "dating"),
  svc("2113", "HER", "her", "dating", ["her app"]),
  svc("2114", "Facebook Dating", "facebook-dating", "dating"),
  svc("2115", "EliteSingles", "elitesingles", "dating", ["elite singles"]),
  svc("2116", "SilverSingles", "silversingles", "dating", ["silver singles"]),
  svc("2117", "Christian Mingle", "christian-mingle", "dating"),
  svc("2118", "Jdate", "jdate", "dating"),
  svc("2119", "Meetic", "meetic", "dating"),
  svc("2120", "The League", "the-league", "dating"),
  svc("2121", "BLK", "blk", "dating"),
  svc("2122", "Chispa", "chispa", "dating"),
  svc("961", "Upward", "upward", "dating"),
  svc("2124", "Dil Mil", "dil-mil", "dating", ["dilmil"]),
  svc("2125", "Lovoo", "lovoo", "dating"),
  svc("899", "Tantan", "tantan", "dating"),
  svc("555", "Mamba", "mamba", "dating"),
  svc("564", "MeetMe", "meetme", "dating", ["meet me"]),
  svc("896", "Tagged", "tagged", "dating"),
  svc("836", "Skout", "skout", "dating"),
  svc("2131", "Feeld", "feeld", "dating"),
  svc("2132", "Taimi", "taimi", "dating"),
  svc("2133", "Muzz", "muzz", "dating", ["muzmatch"]),
  svc("2134", "Salams", "salams", "dating"),
  svc("2135", "Shaadi", "shaadi", "dating", ["shaadi.com"]),
  svc("2136", "BharatMatrimony", "bharatmatrimony", "dating", ["bharat matrimony"]),
  svc("2137", "Afroromance", "afroromance", "dating", ["afro romance"]),
  svc("2138", "BlackPeopleMeet", "blackpeoplemeet", "dating", ["black people meet"]),
  svc("2139", "SeniorPeopleMeet", "seniorpeoplemeet", "dating", ["senior people meet"]),
  svc("2140", "FarmersOnly", "farmersonly", "dating", ["farmers only"]),
  svc("2141", "Cupid", "cupid", "dating", ["cupid.com"]),
  svc("2142", "DateMyAge", "datemyage", "dating", ["date my age"]),
  svc("2143", "Lumen", "lumen", "dating"),
  svc("2144", "Inner Circle", "inner-circle", "dating", ["the inner circle"]),
  svc("2145", "Seeking", "seeking", "dating", ["seeking.com"]),
  svc("2146", "WooPlus", "wooplus", "dating", ["woo plus"]),
  svc("2147", "Pairs", "pairs", "dating"),
  svc("2148", "Once", "once", "dating"),
  svc("2149", "Yubo", "yubo", "dating"),
  svc("2150", "Waplog", "waplog", "dating"),
  svc("2151", "Parship", "parship", "dating"),
  svc("2152", "Chemistry", "chemistry", "dating", ["chemistry.com"]),
  svc("2153", "HowAboutWe", "howaboutwe", "dating", ["how about we"]),
  svc("2154", "Hot or Not", "hot-or-not", "dating", ["hotornot"]),
  svc("2155", "Fruitz", "fruitz", "dating"),
  svc("2156", "Stir", "stir", "dating"),
  svc("2157", "JSwipe", "jswipe", "dating"),
  svc("2158", "LEX", "lex", "dating"),
  svc("2159", "Be2", "be2", "dating"),
  svc("2160", "LoveScout24", "lovescout24", "dating", ["love scout"]),
  svc("2161", "eDarling", "edarling", "dating", ["e darling"]),
  svc("2162", "ElitePartner", "elitepartner", "dating", ["elite partner"]),
  svc("2163", "Hily", "hily", "dating"),
  svc("2164", "Boo", "boo", "dating"),
  svc("2165", "Jaumo", "jaumo", "dating"),
  svc("2166", "Twoo", "twoo", "dating"),
  svc("2167", "MocoSpace", "mocospace", "dating", ["moco space"]),
  svc("2168", "Raya", "raya", "dating"),
];

const DATING_NEEDLES = [
  "tinder",
  "bumble",
  "hinge",
  "badoo",
  "okcupid",
  "ok cupid",
  "eharmony",
  "zoosk",
  "grindr",
  "happn",
  "lovoo",
  "tantan",
  "mamba",
  "feeld",
  "coffee meets",
  "ourtime",
  "our time",
  "plenty of fish",
  "plentyoffish",
  "pof",
  "match.com",
  "facebook dating",
  "elitesingles",
  "silversingles",
  "christian mingle",
  "jdate",
  "meetic",
  "the league",
  "chispa",
  "dil mil",
  "meetme",
  "skout",
  "taimi",
  "muzz",
  "shaadi",
  "matrimony",
  "afroromance",
  "farmersonly",
  "cupid",
  "datemyage",
  "inner circle",
  "wooplus",
  "parship",
  "hotornot",
  "hot or not",
  "fruitz",
  "jswipe",
  "lovescout",
  "edarling",
  "elitepartner",
  "hily",
  "jaumo",
  "mocospace",
  "dating",
];

export function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function categoryFor(service: { name: string; slug: string; category?: ServiceCategory }): ServiceCategory {
  if (service.category) return service.category;
  const hay = `${normalizeName(service.name)} ${normalizeName(service.slug)}`;
  const tokens = new Set(hay.split(" ").filter(Boolean));
  if (
    DATING_NEEDLES.some((n) => hay.includes(n)) ||
    tokens.has("match") ||
    tokens.has("her") ||
    tokens.has("blk") ||
    tokens.has("raya") ||
    tokens.has("boo") ||
    tokens.has("once") ||
    tokens.has("pairs") ||
    tokens.has("lumen") ||
    tokens.has("stir") ||
    tokens.has("upward") ||
    tokens.has("lex") ||
    tokens.has("yubo") ||
    tokens.has("twoo") ||
    tokens.has("waplog") ||
    tokens.has("tagged") ||
    tokens.has("seeking")
  ) {
    return "dating";
  }
  if (/\b(whatsapp|telegram|viber|wechat|discord|snapchat|signal|line|kik)\b/.test(hay)) return "messaging";
  if (/\b(facebook|instagram|tiktok|twitter|linkedin|youtube|threads|reddit)\b/.test(hay)) return "social";
  if (/\b(binance|paypal|wise|revolut|cash app|venmo|coinbase|kraken)\b/.test(hay)) return "finance";
  if (/\b(netflix|spotify|disney|hulu|prime video|apple tv|youtube premium)\b/.test(hay)) return "streaming";
  if (/\b(google|microsoft|apple|amazon|icloud|outlook|gmail)\b/.test(hay)) return "tech";
  return "other";
}

export function withCategory(service: CatalogueService | Omit<CatalogueService, "category">): CatalogueService {
  return { ...service, category: categoryFor(service), slug: service.slug };
}

export function serviceMatchesQuery(service: CatalogueService, query: string): boolean {
  const q = normalizeName(query);
  if (!q) return true;
  const hay = [service.name, service.slug, ...(service.aliases ?? [])].map(normalizeName).join(" ");
  return hay.includes(q) || q.split(" ").every((part) => hay.includes(part));
}

export function mergeServices(
  live: Array<Omit<CatalogueService, "category"> & { category?: ServiceCategory }>,
): CatalogueService[] {
  const tagged = live.map((s) => withCategory(s));
  const ids = new Set(tagged.map((s) => s.id));
  const slugs = new Set(tagged.map((s) => s.slug));
  const names = new Set(tagged.map((s) => normalizeName(s.name)));
  const extras = FALLBACK_SERVICES.filter(
    (s) => !ids.has(s.id) && !slugs.has(s.slug) && !names.has(normalizeName(s.name)),
  );
  return [...tagged, ...extras];
}

export function isFallbackOnlyService(id: string, liveIds: Set<string>): boolean {
  if (liveIds.has(id)) return false;
  return FALLBACK_SERVICES.some((s) => s.id === id);
}

export const DATING_SPOTLIGHT_IDS = ["559", "680", "724", "926", "142", "420", "658", "65"];

/** Old demo IDs → live supplier IDs. */
export const LEGACY_SERVICE_IDS: Record<string, string> = {
  "2101": "559",
  "2102": "680",
  "2103": "724",
  "2104": "142",
  "2105": "420",
  "2106": "658",
  "2107": "65",
  "2109": "1070",
  "2110": "206",
  "2111": "409",
  "2112": "403",
  "2123": "961",
  "2126": "899",
  "2127": "555",
  "2128": "564",
  "2129": "896",
  "2130": "836",
  "892": "926",
};

export function canonicalServiceId(id: string): string {
  return LEGACY_SERVICE_IDS[id] ?? id;
}

export function datingServices(services: CatalogueService[]): CatalogueService[] {
  return services.filter((s) => s.category === "dating");
}

export function groupServices(
  services: CatalogueService[],
): Array<{ category: ServiceCategory; label: string; items: CatalogueService[] }> {
  const labels = Object.fromEntries(
    SERVICE_CATEGORIES.filter((c) => c.id !== "all").map((c) => [c.id, c.label]),
  ) as Record<ServiceCategory, string>;
  const order: ServiceCategory[] = ["dating", "messaging", "social", "finance", "streaming", "tech", "other"];
  return order
    .map((category) => ({
      category,
      label: labels[category],
      items: services.filter((s) => s.category === category).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.items.length > 0);
}
