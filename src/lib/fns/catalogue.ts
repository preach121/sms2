import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSmsProvider } from "@/lib/n1sms";
import { DATING_SPOTLIGHT_IDS, datingServices } from "@/lib/n1sms/catalog";
import { getSql } from "@/lib/db";
import { num } from "@/lib/utils";
import type { CatalogueOffer } from "@/lib/n1sms";

const cache = new Map<string, { at: number; value: unknown }>();
const TTL_MS = 20_000;

function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.value as T);
  return loader().then((value) => {
    cache.set(key, { at: Date.now(), value });
    return value;
  });
}

function sortCountries<T extends { name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.name === "Ghana") return -1;
    if (b.name === "Ghana") return 1;
    return a.name.localeCompare(b.name);
  });
}

function sortOffers(offers: CatalogueOffer[]): CatalogueOffer[] {
  return [...offers].sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    if (a.countryName === "Ghana" && b.countryName !== "Ghana") return -1;
    if (b.countryName === "Ghana" && a.countryName !== "Ghana") return 1;
    const byService = a.serviceName.localeCompare(b.serviceName);
    if (byService !== 0) return byService;
    return a.countryName.localeCompare(b.countryName);
  });
}

const POPULAR = ["1012", "907", "1688", "329", "457"];

export const getProviderStatus = createServerFn({ method: "GET" }).handler(async () => {
  return cached("provider-status", async () => {
    const provider = getSmsProvider();
    return provider.getStatus();
  });
});

export const getCatalogue = createServerFn({ method: "GET" }).handler(async () => {
  return cached("catalogue", async () => {
    const provider = getSmsProvider();
    const [services, countries, status, markupRow] = await Promise.all([
      provider.getServices(),
      provider.getCountries(),
      provider.getStatus(),
      (await getSql())<{ value: string }>`select value from settings where key = 'markup_multiplier'`,
    ]);
    const sortedServices = [...services].sort((a, b) => a.name.localeCompare(b.name));
    const sortedCountries = sortCountries(countries);
    const dating = datingServices(sortedServices);
    const featuredId =
      POPULAR.find((id) => sortedServices.some((s) => s.id === id)) ?? sortedServices[0]?.id;
    const offers = featuredId ? sortOffers(await provider.getOffers(featuredId)) : [];
    const datingFeatured = DATING_SPOTLIGHT_IDS.map((id) => dating.find((s) => s.id === id)).filter(
      (s): s is NonNullable<typeof s> => Boolean(s),
    );
    return {
      services: sortedServices,
      countries: sortedCountries,
      offers,
      featuredServiceId: featuredId ?? null,
      datingFeatured,
      datingCount: dating.length,
      status,
      markup: num(markupRow[0]?.value) || 1.5,
      stats: {
        countryCount: sortedCountries.length,
        serviceCount: sortedServices.length,
        availableCount: offers.filter((o) => o.available).length,
        datingCount: dating.length,
      },
    };
  });
});

export const getOffers = createServerFn({ method: "GET" })
  .validator(
    z.object({
      serviceId: z.string().optional(),
      countryId: z.string().optional(),
      q: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const serviceId = data.serviceId?.trim() || undefined;
    return cached(`offers:${serviceId ?? "default"}`, async () => {
      const provider = getSmsProvider();
      const [services, countries, status, markupRow, offers] = await Promise.all([
        provider.getServices(),
        provider.getCountries(),
        provider.getStatus(),
        (await getSql())<{ value: string }>`select value from settings where key = 'markup_multiplier'`,
        provider.getOffers(serviceId),
      ]);
      return {
        services: [...services].sort((a, b) => a.name.localeCompare(b.name)),
        countries: sortCountries(countries),
        offers: sortOffers(offers),
        status,
        markup: num(markupRow[0]?.value) || 1.5,
      };
    }).then((payload) => {
      let offers = payload.offers;
      if (data.countryId) offers = offers.filter((o) => o.countryId === data.countryId);
      if (data.q) {
        const q = data.q.toLowerCase();
        offers = offers.filter(
          (o) =>
            o.serviceName.toLowerCase().includes(q) ||
            o.countryName.toLowerCase().includes(q) ||
            o.countryIso2.toLowerCase().includes(q),
        );
      }
      return { ...payload, offers };
    });
  });
