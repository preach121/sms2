import { categoryFor } from "./catalog";
import { num } from "@/lib/utils";
import type {
  CatalogueCountry,
  CatalogueOffer,
  CatalogueService,
  ProviderOrder,
  SmsProvider,
  StockCheck,
} from "./types";

const BASE_URL = "https://n1sms.com/api/mobile";
const REQUEST_TIMEOUT_MS = 15_000;

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unwrap(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  if ("data" in payload) return payload.data;
  return payload;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) {
    for (const key of ["data", "items", "results", "services", "countries", "orders", "prices"]) {
      const inner = value[key];
      if (Array.isArray(inner)) return inner;
      if (isRecord(inner) && Array.isArray(inner.data)) return inner.data;
    }
  }
  return [];
}

function pickString(row: Json, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

function pickNumber(row: Json, ...keys: string[]): number | null {
  for (const key of keys) {
    if (!(key in row) || row[key] === null || row[key] === undefined || row[key] === "") continue;
    const n = num(row[key]);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function priceQueryKeys(named: CatalogueService, serviceId: string): string[] {
  const name = named.name || "";
  const first = name.split(/[\s/|,._-]+/).find((part) => part.replace(/[^a-z0-9]/gi, "").length > 2) ?? "";
  const compact = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const keys = [serviceId, named.slug, compact, name.toLowerCase(), serviceId]
    .map((k) => k.trim())
    .filter((k) => k.length > 1);
  return Array.from(new Set(keys));
}

export function stripSupplierName(message: string): string {
  return message
    .replace(/n1sms\.com/gi, "the supplier")
    .replace(/N1SMS_API_KEY/g, "supplier key")
    .replace(/\bN1SMS\b/gi, "the supplier")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export class N1SmsClient implements SmsProvider {
  readonly name = "n1sms";
  private token: string;
  private tokenExpiresAt = 0;

  constructor(
    private readonly apiKey: string | undefined,
    private readonly email: string | undefined,
    private readonly password: string | undefined,
  ) {
    this.token = apiKey?.trim() ?? "";
  }

  get configured(): boolean {
    return Boolean(this.apiKey || (this.email && this.password));
  }

  private async ensureToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token;
    if (this.apiKey?.trim()) {
      this.token = this.apiKey.trim();
      this.tokenExpiresAt = Date.now() + 6 * 60 * 60 * 1000;
      return this.token;
    }
    if (!this.email || !this.password) {
      throw new Error("Supplier credentials are not configured.");
    }
    const res = await this.request("/auth/login", {
      method: "POST",
      auth: false,
      body: { email: this.email, password: this.password },
    });
    const data = unwrap(res);
    const token = isRecord(data) ? pickString(data, "token", "access_token", "api_key") : null;
    if (!token) throw new Error("Could not connect to the number supplier.");
    this.token = token;
    this.tokenExpiresAt = Date.now() + 6 * 60 * 60 * 1000;
    return this.token;
  }

  private async request(
    path: string,
    opts: {
      method?: string;
      query?: Record<string, string | number | undefined>;
      body?: unknown;
      auth?: boolean;
    } = {},
  ): Promise<unknown> {
    const url = new URL(`${BASE_URL}${path}`);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
      }
    }
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (opts.auth !== false) {
      const token = await this.ensureToken();
      headers.Authorization = `Bearer ${token}`;
    }
    let res: Response;
    try {
      res = await fetch(url, {
        method: opts.method ?? "GET",
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
        throw new Error("The number supplier is taking too long to respond. Please try again in a moment.");
      }
      throw err;
    }
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    if (!res.ok) {
      const raw =
        (isRecord(json) && (pickString(json, "message", "error", "detail") || JSON.stringify(json))) ||
        `Number supplier HTTP ${res.status}`;
      throw new Error(stripSupplierName(raw));
    }
    if (isRecord(json) && json.success === false) {
      throw new Error(stripSupplierName(pickString(json, "message", "error") || "Number request failed."));
    }
    return json;
  }

  async getStatus() {
    try {
      const balance = await this.getBalance();
      return {
        connected: true,
        mode: "live" as const,
        lastOkAt: new Date().toISOString(),
        lastError: null,
        lastCheckAt: new Date().toISOString(),
        balance,
        configured: this.configured,
      };
    } catch (err) {
      return {
        connected: false,
        mode: "fallback" as const,
        lastOkAt: null,
        lastError: err instanceof Error ? stripSupplierName(err.message) : "Number supplier unreachable",
        lastCheckAt: new Date().toISOString(),
        balance: null,
        configured: this.configured,
      };
    }
  }

  async getBalance(): Promise<number | null> {
    try {
      const payload = await this.request("/balance");
      const data = unwrap(payload);
      if (isRecord(data)) {
        const direct = pickNumber(data, "balance", "wallet", "available_balance", "credit");
        if (direct !== null) return direct;
      }
    } catch {
      /* dashboard is the documented fallback */
    }
    const payload = await this.request("/dashboard");
    const data = unwrap(payload);
    if (!isRecord(data)) return null;
    const direct = pickNumber(data, "balance", "wallet", "available_balance", "credit");
    if (direct !== null) return direct;
    if (isRecord(data.user)) {
      const fromUser = pickNumber(data.user, "balance", "wallet");
      if (fromUser !== null) return fromUser;
    }
    if (isRecord(data.stats)) {
      const fromStats = pickNumber(data.stats, "balance", "wallet");
      if (fromStats !== null) return fromStats;
    }
    return null;
  }

  async getServices(): Promise<CatalogueService[]> {
    let rows: unknown[] = [];
    try {
      rows = asArray(unwrap(await this.request("/dashboard/services")));
    } catch {
      rows = [];
    }
    if (rows.length === 0) {
      try {
        rows = asArray(unwrap(await this.request("/services")));
      } catch {
        rows = [];
      }
    }
    const services: CatalogueService[] = [];
    for (const item of rows) {
      if (!isRecord(item)) continue;
      const id = pickString(item, "id", "service_id", "service", "code");
      const name = pickString(item, "name", "service_name", "title", "label") ?? id;
      if (!id || !name) continue;
      const slug = slugify(name);
      services.push({ id, name, slug, category: categoryFor({ name, slug }) });
    }
    return services;
  }

  async getCountries(): Promise<CatalogueCountry[]> {
    const rows = asArray(unwrap(await this.request("/countries")));
    const countries: CatalogueCountry[] = [];
    for (const item of rows) {
      if (!isRecord(item)) continue;
      const id = pickString(item, "id", "country_id", "code");
      const name = pickString(item, "name", "country_name", "title") ?? id;
      if (!id || !name) continue;
      const iso2 = (pickString(item, "short_name", "iso", "iso2", "country_code") ?? "").toUpperCase();
      const cc = pickString(item, "cc", "dial", "dial_code") ?? "";
      countries.push({
        id,
        name,
        iso2,
        dial: cc ? (cc.startsWith("+") ? cc : `+${cc}`) : "",
      });
    }
    return countries;
  }

  async getOffers(serviceId?: string): Promise<CatalogueOffer[]> {
    const services = serviceId
      ? [{ id: serviceId, name: serviceId, slug: serviceId, category: categoryFor({ name: serviceId, slug: serviceId }) }]
      : (await this.getServices()).slice(0, 6);
    const names = new Map((await this.namedServices(services)).map((s) => [s.id, s]));
    const offers: CatalogueOffer[] = [];
    for (const service of services) {
      const named = names.get(service.id) ?? service;
      const keys = priceQueryKeys(named, service.id);
      let best: CatalogueOffer[] = [];
      let bestStock = -1;
      for (const key of keys) {
       let rows = [];
    try {
      rows = await this.priceRows(key, named);
    } catch (fail) {
      rows = [];
    }
        const stocked = rows.filter((row) => row.available && row.stock > 0).length;
        if (rows.length > best.length || stocked > bestStock) {
          best = rows;
          bestStock = stocked;
        }
        if (rows.length>0) break;
      }
     
      try {
    const liveUs = await this.getStock({ countryId: "1", serviceId: service.id });
    const usRow = best.find(function (row) {
      return row.countryName === "United States" || row.countryId === "1";
    });
    if (usRow && liveUs.stock > 0) {
      usRow.stock = liveUs.stock;
      usRow.available = true;
      if (liveUs.wholesalePrice > 0) usRow.wholesalePrice = liveUs.wholesalePrice;
    }
        else if (liveUs.stock > 0) {
  best.push({
    serviceId: service.id,
    serviceName: named.name,
    countryId: "1",
    countryName: "United States",
    countryIso2: "US",
    wholesalePrice: liveUs.wholesalePrice,
    customerPrice: liveUs.wholesalePrice,
    stock: liveUs.stock,
    available: true,
  });
}
  } catch (err) {}
      offers.push(...best);
    }
    return offers.sort((a, b) => Number(b.available) - Number(a.available) || a.countryName.localeCompare(b.countryName));
  }

  private async priceRows(serviceKey: string, named: CatalogueService): Promise<CatalogueOffer[]> {
    const offers: CatalogueOffer[] = [];
    let page = 1;
    let guard = 0;
    while (guard < 8) {
      guard += 1;
      const payload = await this.request("/dashboard/prices", {
        query: { service: serviceKey, page, per_page: 50 },
      });
      const data = unwrap(payload);
      const rows = asArray(data);
      if (rows.length === 0) break;
      for (const item of rows) {
        const offer = this.parseOffer(item, named);
        if (offer) offers.push(offer);
      }
      const meta = isRecord(data) && isRecord(data.meta) ? data.meta : isRecord(data) ? data : {};
      const hasMore = Boolean(meta.has_more ?? meta.hasMore);
      const lastPage = num(meta.last_page ?? meta.lastPage);
      const current = num(meta.current_page ?? meta.currentPage) || page;
      if (hasMore || (lastPage && current < lastPage)) {
        page += 1;
        continue;
      }
      break;
    }
    return offers;
  }

  private async namedServices(services: CatalogueService[]): Promise<CatalogueService[]> {
    try {
      const all = await this.getServices();
      return services.map((s) => all.find((a) => a.id === s.id || a.slug === s.slug) ?? s);
    } catch {
      return services;
    }
  }

  private parseOffer(item: unknown, service: CatalogueService): CatalogueOffer | null {
    if (!isRecord(item)) return null;
    const countryId = pickString(item, "country_id", "country", "id", "code");
    const countryName =
      pickString(item, "country_name", "name", "countryName", "title") ?? countryId;
    if (!countryId || !countryName) return null;
    const wholesale =
      pickNumber(
        item,
        "price_ghs",
        "cost_ghs",
        "price",
        "cost",
        "amount",
        "rate",
        "wholesale_price",
        "price_usd",
      ) ?? 0;
    const stockRaw = pickNumber(item, "stock", "count", "qty", "quantity");
    const availableFlag = item.available ?? item.in_stock ?? item.status;
    const flagUnavailable =
      availableFlag === false ||
      String(availableFlag ?? "").toLowerCase() === "unavailable" ||
      String(availableFlag ?? "").toLowerCase() === "out_of_stock";
    const available =
      wholesale > 0 && !flagUnavailable && (stockRaw === null || stockRaw > 0);
    const iso2 = (pickString(item, "short_name", "iso", "iso2", "country_code") ?? "").toUpperCase();
    return {
      serviceId: service.id,
      serviceName:
        service.name && service.name !== service.id
          ? service.name
          : (pickString(item, "service_name") ?? service.name),
      countryId,
      countryName,
      countryIso2: iso2,
      wholesalePrice: wholesale,
      customerPrice: wholesale,
      stock: stockRaw ?? (available ? 1 : 0),
      available,
    };
  }

  async getStock(input: { countryId: string; serviceId: string }): Promise<StockCheck> {
    const payload = await this.request("/stock", {
      query: { country: input.countryId, service: input.serviceId },
    });
    const data = unwrap(payload);
    const row = isRecord(data) ? data : {};
    const stock = pickNumber(row, "amount", "stock", "count", "qty") ?? 0;
    const wholesale =
      pickNumber(row, "price_ghs", "cost_ghs", "price", "cost") ?? 0;
    return {
      countryId: input.countryId,
      serviceId: input.serviceId,
      stock,
      wholesalePrice: wholesale,
      available: stock > 0,
    };
  }

  async purchase(input: { countryId: string; serviceId: string }): Promise<ProviderOrder> {
    const payload = await this.request("/orders", {
      method: "POST",
      body: {
        country: input.countryId,
        service: input.serviceId,
        pricing_option: "0",
      },
    });
    const order = this.parseOrder(unwrap(payload));
    if (!order.phoneNumber) {
      throw new Error("No phone number was assigned. The number is unavailable.");
    }
    return order;
  }

  async getOrder(providerOrderId: string): Promise<ProviderOrder> {
    const encoded = encodeURIComponent(providerOrderId);
    const attempts: Array<() => Promise<unknown>> = [
      () => this.request(`/purchases/${encoded}/refresh`, { method: "POST" }),
      () => this.request(`/orders/${encoded}`),
      () => this.request(`/purchases/${encoded}`),
    ];
    let lastError: Error | null = null;
    for (const attempt of attempts) {
      try {
        const payload = await attempt();
        return this.parseOrder(unwrap(payload));
      } catch (err) {
        lastError = err instanceof Error ? err : new Error("Upstream order was not found.");
      }
    }
    throw lastError ?? new Error("Upstream order was not found.");
  }

  async cancelOrder(providerOrderId: string): Promise<{ refunded: boolean }> {
    const encoded = encodeURIComponent(providerOrderId);
    const attempts = [
      { path: `/purchases/${encoded}/refund`, method: "POST" },
      { path: `/orders/${encoded}/cancel`, method: "POST" },
      { path: `/orders/${encoded}`, method: "DELETE" },
    ];
    let lastError: Error | null = null;
    for (const attempt of attempts) {
      try {
        await this.request(attempt.path, { method: attempt.method });
        return { refunded: true };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error("Cancel failed");
      }
    }
    throw lastError ?? new Error("Unable to cancel the upstream order.");
  }

  private parseOrder(raw: unknown): ProviderOrder {
    const row = isRecord(raw) ? raw : {};
    const nested = isRecord(row.order) ? row.order : row;
    const id =
      pickString(nested, "order_code", "rental_code", "id", "order_id", "activation_id", "uuid", "purchase_id") ??
      crypto.randomUUID();
    const phone = pickString(nested, "phone_number", "phone", "number", "msisdn") ?? "";
    const status = (pickString(nested, "status", "state") ?? "active").toLowerCase();
    const expiresAt =
      pickString(nested, "expires_at", "expired_at", "expire_at") ??
      (typeof nested.time_left === "number" && nested.time_left > 0
        ? new Date(Date.now() + nested.time_left * 1000).toISOString()
        : null);
    const smsCode =
      pickString(nested, "sms_code", "code", "otp", "sms") ??
      (isRecord(nested.sms) ? pickString(nested.sms, "code", "text", "body") : null);
    const messages: ProviderOrder["messages"] = [];
    const msgSource = nested.messages ?? nested.sms_messages ?? nested.sms;
    for (const item of asArray(msgSource)) {
      if (typeof item === "string") {
        messages.push({ body: item, code: extractCode(item) ?? undefined });
        continue;
      }
      if (!isRecord(item)) continue;
      const body = pickString(item, "body", "text", "message", "sms") ?? "";
      if (!body) continue;
      messages.push({
        sender: pickString(item, "sender", "from") ?? undefined,
        body,
        code: pickString(item, "code", "otp") ?? extractCode(body) ?? undefined,
      });
    }
    if (smsCode && messages.length === 0) {
      messages.push({ body: smsCode, code: smsCode });
    }
    return {
      providerOrderId: id,
      phoneNumber: phone,
      status,
      expiresAt,
      smsCode: smsCode ?? messages.find((m) => m.code)?.code ?? null,
      messages,
    };
  }
}

export function extractCode(text: string): string | null {
  const match = text.match(/\b(\d{4,8})\b/);
  return match?.[1] ?? null;
}

export function countryFromOffers(offers: CatalogueOffer[]): CatalogueCountry[] {
  const map = new Map<string, CatalogueCountry>();
  for (const offer of offers) {
    if (!map.has(offer.countryId)) {
      map.set(offer.countryId, {
        id: offer.countryId,
        name: offer.countryName,
        iso2: offer.countryIso2,
        dial: "",
      });
    }
  }
  return [...map.values()];
}

export function servicesFromOffers(offers: CatalogueOffer[]): CatalogueService[] {
  const map = new Map<string, CatalogueService>();
  for (const offer of offers) {
    if (!map.has(offer.serviceId)) {
      const slug = slugify(offer.serviceName);
      map.set(offer.serviceId, {
        id: offer.serviceId,
        name: offer.serviceName,
        slug,
        category: categoryFor({ name: offer.serviceName, slug }),
      });
    }
  }
  return [...map.values()];
}
