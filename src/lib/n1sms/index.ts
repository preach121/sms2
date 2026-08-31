import { getSql } from "@/lib/db";
import { num, roundMoney } from "@/lib/utils";
import { N1SmsClient, countryFromOffers, servicesFromOffers, stripSupplierName } from "./client";
import {
  FALLBACK_COUNTRIES,
  FALLBACK_SERVICES,
  fallbackCancel,
  fallbackGetOrder,
  fallbackOffers,
  fallbackStock,
} from "./fallback";
import { categoryFor, isFallbackOnlyService, mergeServices, withCategory, canonicalServiceId } from "./catalog";
import { applyMarkup, getMarkupMultiplier } from "./markup";
import type {
  CatalogueCountry,
  CatalogueOffer,
  CatalogueService,
  ProviderMode,
  ProviderOrder,
  ProviderStatus,
  SmsProvider,
  StockCheck,
} from "./types";

export type { CatalogueCountry, CatalogueOffer, CatalogueService, ProviderStatus, StockCheck } from "./types";
export {
  DATING_SPOTLIGHT_IDS,
  SERVICE_CATEGORIES,
  datingServices,
  groupServices,
  serviceMatchesQuery,
} from "./catalog";

function env(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function liveClient(email?: string, password?: string, apiKey?: string): N1SmsClient {
  return new N1SmsClient(
    apiKey ?? env("N1SMS_API_KEY") ?? env("N1SMS_TOKEN"),
    email ?? env("N1SMS_EMAIL") ?? "pkeeara@gmail.com",
    password ?? env("N1SMS_PASSWORD") ?? "0268832336",
  );
}

async function storedSupplierLogin(): Promise<{ email?: string; password?: string; apiKey?: string }> {
  try {
    const sql = await getSql();
    const rows = await sql<{ key: string; value: string }>`
      select key, value from settings
      where key in ('supplier_email', 'supplier_password', 'supplier_api_key')
    `;
    const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    const email = map.supplier_email || "pkeeara@gmail.com";
    const password = map.supplier_password || "0268832336";
    if (!map.supplier_email || !map.supplier_password) {
      await sql`
        insert into settings (key, value, updated_at)
        values ('supplier_email', ${email}, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
      `;
      await sql`
        insert into settings (key, value, updated_at)
        values ('supplier_password', ${password}, now())
        on conflict (key) do update set value = excluded.value, updated_at = now()
      `;
    }
    return {
      email,
      password,
      apiKey: map.supplier_api_key || undefined,
    };
  } catch {
    return { email: "pkeeara@gmail.com", password: "0268832336" };
  }
}

async function persistStatus(status: ProviderStatus): Promise<void> {
  const sql = await getSql();
  const lastError = status.lastError ? stripSupplierName(status.lastError) : null;
  await sql`
    insert into provider_status (id, connected, mode, last_ok_at, last_error, last_check_at, balance)
    values (
      1,
      ${status.connected},
      ${status.mode},
      ${status.lastOkAt},
      ${lastError},
      ${status.lastCheckAt},
      ${status.balance}
    )
    on conflict (id) do update set
      connected = excluded.connected,
      mode = excluded.mode,
      last_ok_at = excluded.last_ok_at,
      last_error = excluded.last_error,
      last_check_at = excluded.last_check_at,
      balance = excluded.balance
  `;
}

async function persistCatalogue(offers: CatalogueOffer[]): Promise<void> {
  if (offers.length === 0) return;
  const sql = await getSql();
  const countries = countryFromOffers(offers);
  const services = servicesFromOffers(offers);
  for (const country of countries) {
    await sql`
      insert into countries (id, name, iso2, dial, updated_at)
      values (${country.id}, ${country.name}, ${country.iso2}, ${country.dial}, now())
      on conflict (id) do update set
        name = excluded.name,
        iso2 = excluded.iso2,
        dial = excluded.dial,
        updated_at = now()
    `;
  }
  for (const service of services) {
    await sql`
      insert into services (id, name, slug, updated_at)
      values (${service.id}, ${service.name}, ${service.slug}, now())
      on conflict (id) do update set
        name = excluded.name,
        slug = excluded.slug,
        updated_at = now()
    `;
  }
  for (const offer of offers) {
    await sql`
      insert into catalogue_offers (
        service_id, country_id, wholesale_price, stock, available, updated_at
      ) values (
        ${offer.serviceId}, ${offer.countryId}, ${offer.wholesalePrice},
        ${offer.stock}, ${offer.available}, now()
      )
      on conflict (service_id, country_id) do update set
        wholesale_price = excluded.wholesale_price,
        stock = excluded.stock,
        available = excluded.available,
        updated_at = now()
    `;
  }
}

async function persistServices(services: CatalogueService[]): Promise<void> {
  if (services.length === 0) return;
  const sql = await getSql();
  for (const service of services) {
    await sql`
      insert into services (id, name, slug, updated_at)
      values (${service.id}, ${service.name}, ${service.slug}, now())
      on conflict (id) do update set
        name = excluded.name,
        slug = excluded.slug,
        updated_at = now()
    `;
  }
}

async function persistCountries(countries: CatalogueCountry[]): Promise<void> {
  if (countries.length === 0) return;
  const sql = await getSql();
  for (const country of countries) {
    await sql`
      insert into countries (id, name, iso2, dial, updated_at)
      values (${country.id}, ${country.name}, ${country.iso2}, ${country.dial}, now())
      on conflict (id) do update set
        name = excluded.name,
        iso2 = excluded.iso2,
        dial = excluded.dial,
        updated_at = now()
    `;
  }
}

class Sms2Provider implements SmsProvider {
  readonly name = "sms2-n1sms";
  private mode: ProviderMode = "fallback";
  private live = liveClient();
  private liveServiceIds = new Set<string>();
  private hydrated = false;

  private async ensureLive(): Promise<void> {
    if (this.hydrated && this.live.configured) return;
    const stored = await storedSupplierLogin();
    this.live = liveClient(stored.email, stored.password, stored.apiKey);
    this.hydrated = true;
  }

  private async refreshLiveIds(): Promise<void> {
    await this.ensureLive();
    if (!this.live.configured || this.liveServiceIds.size > 0) return;
    try {
      const rows = await this.live.getServices();
      this.liveServiceIds = new Set(rows.map((s) => s.id));
    } catch {
      /* stay empty — treat as fallback-only */
    }
  }

  async getStatus(): Promise<ProviderStatus> {
    await this.ensureLive();
    const configured = this.live.configured;
    if (!configured) {
      const status: ProviderStatus = {
        connected: false,
        mode: "fallback",
        lastOkAt: null,
        lastError: "Supplier key is not set. Catalogue is served from last-known inventory.",
        lastCheckAt: new Date().toISOString(),
        balance: null,
        configured: false,
      };
      this.mode = "fallback";
      await persistStatus(status);
      return status;
    }
    const status = await this.live.getStatus();
    this.mode = status.connected ? "live" : "fallback";
    await persistStatus(status);
    return status;
  }

  async getBalance(): Promise<number | null> {
    await this.ensureLive();
    if (!this.live.configured) return null;
    try {
      return await this.live.getBalance();
    } catch {
      return null;
    }
  }

  async getServices(): Promise<CatalogueService[]> {
    await this.ensureLive();
    let live: CatalogueService[] = [];
    if (this.live.configured) {
      try {
        const rows = await this.live.getServices();
        if (rows.length > 0) {
          this.mode = "live";
          this.liveServiceIds = new Set(rows.map((s) => s.id));
          await persistServices(rows);
          live = rows;
        }
      } catch {
        /* cached / fallback */
      }
    }
    if (live.length === 0) {
      live = await readCachedServices();
    }
    const merged = mergeServices(live);
    await persistServices(merged);
    return merged;
  }

  async getCountries(): Promise<CatalogueCountry[]> {
    await this.ensureLive();
    if (this.live.configured) {
      try {
        const live = await this.live.getCountries();
        if (live.length > 0) {
          this.mode = "live";
          await persistCountries(live);
          return live;
        }
      } catch {
        /* cached / fallback */
      }
    }
    const cached = await readCachedCountries();
    if (cached.length > 0) return cached;
    return FALLBACK_COUNTRIES;
  }

  async getOffers(serviceId?: string): Promise<CatalogueOffer[]> {
    const markup = await getMarkupMultiplier();
    const sid = canonicalServiceId(serviceId?.trim() || "") || undefined;
    await this.refreshLiveIds();

    if (sid && isFallbackOnlyService(sid, this.liveServiceIds)) {
      return fallbackOffers(markup, sid);
    }

    if (this.live.configured) {
      try {
        const live = await this.live.getOffers(sid);
        if (live.length > 0) {
          const marked = live.map((offer) => ({
            ...offer,
            customerPrice: applyMarkup(offer.wholesalePrice, markup),
          }));
          this.mode = "live";
          await persistCatalogue(marked);
          return marked;
        }
      } catch (err) {
        await persistStatus({
          connected: false,
          mode: "fallback",
          lastOkAt: null,
          lastError: err instanceof Error ? err.message : "Catalogue fetch failed",
          lastCheckAt: new Date().toISOString(),
          balance: null,
          configured: true,
        });
      }
    }

    const cached = await readCachedOffers(markup, sid);
    if (cached.length > 0) return cached;
    if (this.live.configured) return [];

    this.mode = "fallback";
    return fallbackOffers(markup, sid);
  }

  async getStock(input: { countryId: string; serviceId: string }): Promise<StockCheck> {
    const markup = await getMarkupMultiplier();
    input = { ...input, serviceId: canonicalServiceId(input.serviceId) };
    await this.refreshLiveIds();
    if (this.live.configured) {
      try {
        return await this.live.getStock(input);
      } catch {
        /* use live offers snapshot */
      }
      const offers = await this.getOffers(input.serviceId);
      const offer = offers.find(
        (row) => row.countryId === input.countryId && row.serviceId === input.serviceId,
      );
      if (offer) {
        return {
          countryId: input.countryId,
          serviceId: input.serviceId,
          stock: offer.stock,
          wholesalePrice: offer.wholesalePrice,
          available: offer.available && offer.stock > 0,
        };
      }
      return { countryId: input.countryId, serviceId: input.serviceId, stock: 0, wholesalePrice: 0, available: false };
    }
    const offers = await this.getOffers(input.serviceId);
    const offer = offers.find(
      (row) => row.countryId === input.countryId && row.serviceId === input.serviceId,
    );
    if (offer) {
      return {
        countryId: input.countryId,
        serviceId: input.serviceId,
        stock: offer.stock,
        wholesalePrice: offer.wholesalePrice,
        available: offer.available && offer.stock > 0,
      };
    }
    if (this.live.configured && this.liveServiceIds.has(input.serviceId)) {
      return { countryId: input.countryId, serviceId: input.serviceId, stock: 0, wholesalePrice: 0, available: false };
    }
    return fallbackStock(input, markup);
  }

  async purchase(input: { countryId: string; serviceId: string }): Promise<ProviderOrder> {
    await this.ensureLive();
    await this.refreshLiveIds();
    input = { ...input, serviceId: canonicalServiceId(input.serviceId) };
    if (this.live.configured) {
      try {
        const order = await this.live.purchase(input);
        this.mode = "live";
        return order;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Number purchase failed";
        throw new Error(message);
      }
    }
    throw new Error("Supplier is not connected. Live numbers cannot be purchased yet.");
  }

  async getOrder(providerOrderId: string): Promise<ProviderOrder> {
    await this.ensureLive();
    if (providerOrderId.startsWith("fb_")) return fallbackGetOrder(providerOrderId);
    if (this.live.configured) return this.live.getOrder(providerOrderId);
    return fallbackGetOrder(providerOrderId);
  }

  async cancelOrder(providerOrderId: string): Promise<{ refunded: boolean }> {
    await this.ensureLive();
    if (providerOrderId.startsWith("fb_")) return fallbackCancel(providerOrderId);
    if (this.live.configured) return this.live.cancelOrder(providerOrderId);
    return fallbackCancel(providerOrderId);
  }
}

async function readCachedServices(): Promise<CatalogueService[]> {
  const sql = await getSql();
  const rows = await sql<{ id: string; name: string; slug: string | null }>`
    select id, name, slug from services order by name
  `;
  return rows.map((row) => {
    const slug = row.slug ?? row.name.toLowerCase();
    return withCategory({ id: row.id, name: row.name, slug, category: categoryFor({ name: row.name, slug }) });
  });
}

async function readCachedCountries(): Promise<CatalogueCountry[]> {
  const sql = await getSql();
  const rows = await sql<{ id: string; name: string; iso2: string | null; dial: string | null }>`
    select id, name, iso2, dial from countries order by name
  `;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    iso2: (row.iso2 ?? "").toUpperCase(),
    dial: row.dial ?? "",
  }));
}

async function readCachedOffers(markup: number, serviceId?: string): Promise<CatalogueOffer[]> {
  const sql = await getSql();
  const rows = serviceId
    ? await sql<{
        service_id: string;
        service_name: string;
        country_id: string;
        country_name: string;
        iso2: string | null;
        wholesale_price: string;
        stock: number;
        available: boolean;
      }>`
        select o.service_id, s.name as service_name, o.country_id, c.name as country_name,
               c.iso2, o.wholesale_price, o.stock, o.available
        from catalogue_offers o
        join services s on s.id = o.service_id
        join countries c on c.id = o.country_id
        where o.service_id = ${serviceId}
      `
    : await sql<{
        service_id: string;
        service_name: string;
        country_id: string;
        country_name: string;
        iso2: string | null;
        wholesale_price: string;
        stock: number;
        available: boolean;
      }>`
        select o.service_id, s.name as service_name, o.country_id, c.name as country_name,
               c.iso2, o.wholesale_price, o.stock, o.available
        from catalogue_offers o
        join services s on s.id = o.service_id
        join countries c on c.id = o.country_id
      `;
  return rows.map((row) => {
    const wholesale = num(row.wholesale_price);
    return {
      serviceId: row.service_id,
      serviceName: row.service_name,
      countryId: row.country_id,
      countryName: row.country_name,
      countryIso2: (row.iso2 ?? "").toUpperCase(),
      wholesalePrice: wholesale,
      customerPrice: roundMoney(wholesale * markup),
      stock: Number(row.stock) || 0,
      available: Boolean(row.available) && Number(row.stock) > 0,
    };
  });
}

let providerSingleton: Sms2Provider | null = null;

export function getSmsProvider(): SmsProvider {
  providerSingleton ??= new Sms2Provider();
  return providerSingleton;
}

export function resetSmsProvider(): void {
  providerSingleton = null;
}

export { applyMarkup, getMarkupMultiplier, FALLBACK_COUNTRIES, FALLBACK_SERVICES };
