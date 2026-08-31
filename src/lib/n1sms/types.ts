export type ProviderMode = "live" | "fallback";

export type ServiceCategory =
  | "dating"
  | "messaging"
  | "social"
  | "finance"
  | "streaming"
  | "tech"
  | "other";

export type CatalogueService = {
  id: string;
  name: string;
  slug: string;
  category: ServiceCategory;
  aliases?: string[];
};

export type CatalogueCountry = {
  id: string;
  name: string;
  iso2: string;
  dial: string;
};

export type CatalogueOffer = {
  serviceId: string;
  serviceName: string;
  countryId: string;
  countryName: string;
  countryIso2: string;
  wholesalePrice: number;
  customerPrice: number;
  stock: number;
  available: boolean;
};

export type StockCheck = {
  countryId: string;
  serviceId: string;
  stock: number;
  wholesalePrice: number;
  available: boolean;
};

export type ProviderOrder = {
  providerOrderId: string;
  phoneNumber: string;
  status: string;
  expiresAt: string | null;
  smsCode: string | null;
  messages: Array<{ sender?: string; body: string; code?: string }>;
};

export type ProviderStatus = {
  connected: boolean;
  mode: ProviderMode;
  lastOkAt: string | null;
  lastError: string | null;
  lastCheckAt: string | null;
  balance: number | null;
  configured: boolean;
};

export type SmsProvider = {
  readonly name: string;
  getStatus(): Promise<ProviderStatus>;
  getBalance(): Promise<number | null>;
  getServices(): Promise<CatalogueService[]>;
  getCountries(): Promise<CatalogueCountry[]>;
  getOffers(serviceId?: string): Promise<CatalogueOffer[]>;
  getStock(input: { countryId: string; serviceId: string }): Promise<StockCheck>;
  purchase(input: {
    countryId: string;
    serviceId: string;
  }): Promise<ProviderOrder>;
  getOrder(providerOrderId: string): Promise<ProviderOrder>;
  cancelOrder(providerOrderId: string): Promise<{ refunded: boolean }>;
};
