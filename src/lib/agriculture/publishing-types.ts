export type AgricultureSupportContact = {
  phone: string;
  email: string;
  messageBn: string;
  messageEn: string;
};

export type AgricultureMarketPriceRecord = {
  id: string;
  product: string;
  market: string;
  district: string;
  unit: string;
  price: string;
  observedAt: string;
  source: string;
  status: "DRAFT" | "PUBLISHED";
  sourceRequestId: string;
};

export type AgricultureUpdateRecord = {
  id: string;
  kind: "NEWS" | "ADVICE" | "WEATHER_ALERT";
  title: string;
  body: string;
  source: string;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string;
  expiresAt: string;
};

export type AgriculturePriceRequest = {
  id: number;
  referenceCode: string | null;
  district: string;
  answers: unknown;
};

export type AgriculturePublishingWorkspaceData = {
  prices: AgricultureMarketPriceRecord[];
  updates: AgricultureUpdateRecord[];
  requests: AgriculturePriceRequest[];
  support: AgricultureSupportContact | null;
};
