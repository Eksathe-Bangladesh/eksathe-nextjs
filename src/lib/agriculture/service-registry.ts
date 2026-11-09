export const agricultureServiceRegistry = [
  {
    slug: "crop-farming",
    icon: "🌾",
    categoryId: "crop-production",
    formVersion: 1,
    fields: [
      {
        name: "crop_name",
        type: "text",
        required: false,
      },
      {
        name: "land_area",
        type: "text",
        required: false,
      },
      {
        name: "crop_stage",
        type: "text",
        required: false,
      },
      {
        name: "planting_period",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "seeds-seedlings",
    icon: "🌱",
    categoryId: "crop-production",
    formVersion: 1,
    fields: [
      {
        name: "seed_kind",
        type: "select",
        options: [
          {
            value: "বীজ",
          },
          {
            value: "চারা",
          },
          {
            value: "বীজ ও চারা",
          },
        ],
        required: false,
      },
      {
        name: "seed_variety",
        type: "text",
        required: false,
      },
      {
        name: "seed_quantity",
        type: "text",
        required: false,
      },
      {
        name: "seed_needed_by",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "fertilizer-soil",
    icon: "🧪",
    categoryId: "crop-production",
    formVersion: 1,
    fields: [
      {
        name: "soil_crop",
        type: "text",
        required: false,
      },
      {
        name: "soil_land_area",
        type: "text",
        required: false,
      },
      {
        name: "soil_test_status",
        type: "select",
        options: [
          {
            value: "এখনও করাইনি",
          },
          {
            value: "পরীক্ষা করিয়েছি",
          },
          {
            value: "পরীক্ষা করাতে চাই",
          },
        ],
        required: false,
      },
      {
        name: "soil_need",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "pest-control",
    icon: "🛡️",
    categoryId: "crop-production",
    formVersion: 1,
    fields: [
      {
        name: "affected_crop",
        type: "text",
        required: false,
      },
      {
        name: "affected_area",
        type: "text",
        required: false,
      },
      {
        name: "symptom_duration",
        type: "text",
        required: false,
      },
      {
        name: "crop_symptoms",
        type: "text",
        required: false,
      },
      {
        name: "disease_photo",
        type: "file",
        required: false,
      },
    ],
  },
  {
    slug: "irrigation",
    icon: "💧",
    categoryId: "crop-production",
    formVersion: 1,
    fields: [
      {
        name: "irrigation_crop",
        type: "text",
        required: false,
      },
      {
        name: "irrigation_area",
        type: "text",
        required: false,
      },
      {
        name: "water_source",
        type: "select",
        options: [
          {
            value: "নলকূপ",
          },
          {
            value: "পুকুর/খাল",
          },
          {
            value: "নদী",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
      {
        name: "irrigation_time",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "farm-machinery",
    icon: "🚜",
    categoryId: "labor-machinery",
    formVersion: 1,
    fields: [
      {
        name: "machine_type",
        type: "select",
        options: [
          {
            value: "ট্রাক্টর",
          },
          {
            value: "পাওয়ার টিলার",
          },
          {
            value: "হারভেস্টার",
          },
          {
            value: "স্প্রেয়ার",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
      {
        name: "machine_service",
        type: "select",
        options: [
          {
            value: "ভাড়া",
          },
          {
            value: "মেরামত",
          },
          {
            value: "অন্য সেবা",
          },
        ],
        required: false,
      },
      {
        name: "machine_area",
        type: "text",
        required: false,
      },
      {
        name: "machine_date",
        type: "date",
        required: false,
      },
    ],
  },
  {
    slug: "farm-labour",
    icon: "👩‍🌾",
    categoryId: "labor-machinery",
    formVersion: 1,
    fields: [
      {
        name: "labour_task",
        type: "select",
        options: [
          {
            value: "রোপণ",
          },
          {
            value: "আগাছা পরিষ্কার",
          },
          {
            value: "ফসল কাটা",
          },
          {
            value: "মাড়াই",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
      {
        name: "labour_count",
        type: "number",
        required: false,
      },
      {
        name: "labour_duration",
        type: "text",
        required: false,
      },
      {
        name: "labour_date",
        type: "date",
        required: false,
      },
    ],
  },
  {
    slug: "livestock",
    icon: "🐄",
    categoryId: "farm-enterprises",
    formVersion: 1,
    fields: [
      {
        name: "livestock_type",
        type: "text",
        required: false,
      },
      {
        name: "livestock_count",
        type: "number",
        required: false,
      },
      {
        name: "livestock_need",
        type: "select",
        options: [
          {
            value: "পালন/খামার ব্যবস্থাপনা",
          },
          {
            value: "খাদ্য",
          },
          {
            value: "পশুস্বাস্থ্য পরামর্শ",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
      {
        name: "livestock_issue",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "poultry",
    icon: "🐔",
    categoryId: "farm-enterprises",
    formVersion: 1,
    fields: [
      {
        name: "poultry_type",
        type: "text",
        required: false,
      },
      {
        name: "poultry_count",
        type: "number",
        required: false,
      },
      {
        name: "poultry_need",
        type: "select",
        options: [
          {
            value: "খাদ্য",
          },
          {
            value: "খামার ব্যবস্থাপনা",
          },
          {
            value: "পাখির স্বাস্থ্য পরামর্শ",
          },
          {
            value: "সরঞ্জাম",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
      {
        name: "poultry_issue",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "fisheries",
    icon: "🐟",
    categoryId: "farm-enterprises",
    formVersion: 1,
    fields: [
      {
        name: "fish_type",
        type: "text",
        required: false,
      },
      {
        name: "pond_area",
        type: "text",
        required: false,
      },
      {
        name: "fish_stage",
        type: "select",
        options: [
          {
            value: "পুকুর প্রস্তুতি",
          },
          {
            value: "পোনা ছাড়ব",
          },
          {
            value: "চলমান চাষ",
          },
          {
            value: "মাছ বিক্রি",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
      {
        name: "fish_need",
        type: "select",
        options: [
          {
            value: "পোনা",
          },
          {
            value: "খাদ্য",
          },
          {
            value: "পুকুর ব্যবস্থাপনা",
          },
          {
            value: "বাজার/বিক্রি",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
    ],
  },
  {
    slug: "farm-inputs",
    icon: "🧰",
    categoryId: "market-supply",
    formVersion: 1,
    fields: [
      {
        name: "input_product",
        type: "text",
        required: false,
      },
      {
        name: "input_trade",
        type: "select",
        options: [
          {
            value: "কিনতে চাই",
          },
          {
            value: "বিক্রি করতে চাই",
          },
        ],
        required: false,
      },
      {
        name: "input_quantity",
        type: "text",
        required: false,
      },
      {
        name: "input_specs",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "produce-market",
    icon: "🛒",
    categoryId: "market-supply",
    formVersion: 1,
    fields: [
      {
        name: "produce_name",
        type: "text",
        required: false,
      },
      {
        name: "produce_trade",
        type: "select",
        options: [
          {
            value: "বিক্রেতা/কৃষক",
          },
          {
            value: "ক্রেতা",
          },
        ],
        required: false,
      },
      {
        name: "produce_quantity",
        type: "text",
        required: false,
      },
      {
        name: "produce_grade",
        type: "text",
        required: false,
      },
      {
        name: "produce_ready_date",
        type: "date",
        required: false,
      },
    ],
  },
  {
    slug: "wholesale-buyers",
    icon: "🏬",
    categoryId: "market-supply",
    formVersion: 1,
    fields: [
      {
        name: "wholesale_product",
        type: "text",
        required: false,
      },
      {
        name: "wholesale_quantity",
        type: "text",
        required: false,
      },
      {
        name: "wholesale_role",
        type: "select",
        options: [
          {
            value: "বিক্রেতা/কৃষক",
          },
          {
            value: "পাইকারি ক্রেতা",
          },
          {
            value: "আড়তদার",
          },
        ],
        required: false,
      },
      {
        name: "wholesale_timing",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "daily-market-price",
    icon: "📊",
    categoryId: "market-supply",
    formVersion: 1,
    fields: [
      {
        name: "price_product",
        type: "text",
        required: false,
      },
      {
        name: "price_market",
        type: "text",
        required: false,
      },
      {
        name: "price_amount",
        type: "number",
        required: false,
      },
      {
        name: "price_unit",
        type: "text",
        required: false,
      },
      {
        name: "price_date",
        type: "date",
        required: false,
      },
    ],
  },
  {
    slug: "storage-warehouse",
    icon: "🏢",
    categoryId: "market-supply",
    formVersion: 1,
    fields: [
      {
        name: "storage_product",
        type: "text",
        required: false,
      },
      {
        name: "storage_quantity",
        type: "text",
        required: false,
      },
      {
        name: "storage_type",
        type: "select",
        options: [
          {
            value: "সাধারণ গুদাম",
          },
          {
            value: "শীতল সংরক্ষণ",
          },
          {
            value: "শুকনো সংরক্ষণ",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
      {
        name: "storage_duration",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "transport-logistics",
    icon: "🚚",
    categoryId: "market-supply",
    formVersion: 1,
    fields: [
      {
        name: "transport_product",
        type: "text",
        required: false,
      },
      {
        name: "transport_quantity",
        type: "text",
        required: false,
      },
      {
        name: "transport_pickup",
        type: "text",
        required: false,
      },
      {
        name: "transport_destination",
        type: "text",
        required: false,
      },
      {
        name: "transport_date",
        type: "date",
        required: false,
      },
    ],
  },
  {
    slug: "food-processing",
    icon: "📦",
    categoryId: "market-supply",
    formVersion: 1,
    fields: [
      {
        name: "processing_product",
        type: "text",
        required: false,
      },
      {
        name: "processing_quantity",
        type: "text",
        required: false,
      },
      {
        name: "processing_type",
        type: "select",
        options: [
          {
            value: "পরিষ্কার/বাছাই",
          },
          {
            value: "গ্রেডিং",
          },
          {
            value: "প্রক্রিয়াজাতকরণ",
          },
          {
            value: "প্যাকেজিং",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
      {
        name: "processing_package",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "export-support",
    icon: "🌍",
    categoryId: "market-supply",
    formVersion: 1,
    fields: [
      {
        name: "export_product",
        type: "text",
        required: false,
      },
      {
        name: "export_quantity",
        type: "text",
        required: false,
      },
      {
        name: "export_destination",
        type: "text",
        required: false,
      },
      {
        name: "export_requirements",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "land-equipment",
    icon: "🗺️",
    categoryId: "farm-enterprises",
    formVersion: 1,
    fields: [
      {
        name: "asset_type",
        type: "select",
        options: [
          {
            value: "কৃষিজমি",
          },
          {
            value: "কৃষিযন্ত্র",
          },
          {
            value: "অন্যান্য কৃষি সম্পদ",
          },
        ],
        required: false,
      },
      {
        name: "asset_size",
        type: "text",
        required: false,
      },
      {
        name: "asset_transaction",
        type: "select",
        options: [
          {
            value: "ভাড়া নিতে চাই",
          },
          {
            value: "ভাড়া দিতে চাই",
          },
          {
            value: "কিনতে চাই",
          },
          {
            value: "বিক্রি করতে চাই",
          },
        ],
        required: false,
      },
      {
        name: "asset_timing",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "training-advice",
    icon: "🎓",
    categoryId: "farm-enterprises",
    formVersion: 1,
    fields: [
      {
        name: "training_topic",
        type: "text",
        required: false,
      },
      {
        name: "training_experience",
        type: "text",
        required: false,
      },
      {
        name: "training_format",
        type: "select",
        options: [
          {
            value: "সশরীরে",
          },
          {
            value: "অনলাইন",
          },
          {
            value: "যেকোনো",
          },
        ],
        required: false,
      },
      {
        name: "training_date",
        type: "date",
        required: false,
      },
    ],
  },
  {
    slug: "organic-farming",
    icon: "🍃",
    categoryId: "crop-production",
    formVersion: 1,
    fields: [
      {
        name: "organic_crop",
        type: "text",
        required: false,
      },
      {
        name: "organic_area",
        type: "text",
        required: false,
      },
      {
        name: "organic_practice",
        type: "text",
        required: false,
      },
      {
        name: "organic_need",
        type: "select",
        options: [
          {
            value: "কম্পোস্ট",
          },
          {
            value: "জৈব বালাই ব্যবস্থাপনা",
          },
          {
            value: "উৎপাদন পদ্ধতি",
          },
          {
            value: "সনদ/মান",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
    ],
  },
  {
    slug: "contract-farming",
    icon: "🤝",
    categoryId: "farm-enterprises",
    formVersion: 1,
    fields: [
      {
        name: "contract_crop",
        type: "text",
        required: false,
      },
      {
        name: "contract_quantity",
        type: "text",
        required: false,
      },
      {
        name: "contract_role",
        type: "select",
        options: [
          {
            value: "চাষি/উৎপাদক",
          },
          {
            value: "ক্রেতা",
          },
        ],
        required: false,
      },
      {
        name: "contract_terms",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "farm-finance",
    icon: "💳",
    categoryId: "finance",
    formVersion: 1,
    fields: [
      {
        name: "finance_purpose",
        type: "select",
        options: [
          {
            value: "ফসল উৎপাদন",
          },
          {
            value: "কৃষি উপকরণ",
          },
          {
            value: "যন্ত্রপাতি",
          },
          {
            value: "খামার/ব্যবসা সম্প্রসারণ",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
      {
        name: "finance_enterprise",
        type: "text",
        required: false,
      },
      {
        name: "finance_amount",
        type: "number",
        required: false,
      },
      {
        name: "finance_timing",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "insurance-claims",
    icon: "🧾",
    categoryId: "finance",
    formVersion: 1,
    fields: [
      {
        name: "insurance_crop",
        type: "text",
        required: false,
      },
      {
        name: "insurance_event",
        type: "select",
        options: [
          {
            value: "বন্যা",
          },
          {
            value: "খরা",
          },
          {
            value: "ঝড়/প্রাকৃতিক দুর্যোগ",
          },
          {
            value: "রোগবালাই",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
      {
        name: "insurance_event_date",
        type: "date",
        required: false,
      },
      {
        name: "insurance_status",
        type: "select",
        options: [
          {
            value: "তথ্য জানতে চাই",
          },
          {
            value: "বীমা করা আছে",
          },
          {
            value: "দাবি জমা দিয়েছি",
          },
        ],
        required: false,
      },
    ],
  },
  {
    slug: "weather-alerts",
    icon: "🌦️",
    categoryId: "information-community",
    formVersion: 1,
    fields: [
      {
        name: "weather_area",
        type: "text",
        required: false,
      },
      {
        name: "weather_crop",
        type: "text",
        required: false,
      },
      {
        name: "weather_alert_type",
        type: "select",
        options: [
          {
            value: "বৃষ্টি/বন্যা",
          },
          {
            value: "ঝড়/বজ্রপাত",
          },
          {
            value: "তাপপ্রবাহ",
          },
          {
            value: "ঠান্ডা/কুয়াশা",
          },
          {
            value: "সাধারণ পূর্বাভাস",
          },
        ],
        required: false,
      },
      {
        name: "weather_period",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "disaster-support",
    icon: "🆘",
    categoryId: "information-community",
    formVersion: 1,
    fields: [
      {
        name: "disaster_type",
        type: "select",
        options: [
          {
            value: "বন্যা",
          },
          {
            value: "খরা",
          },
          {
            value: "ঘূর্ণিঝড়/ঝড়",
          },
          {
            value: "জলাবদ্ধতা",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
      {
        name: "disaster_area",
        type: "text",
        required: false,
      },
      {
        name: "disaster_crop",
        type: "text",
        required: false,
      },
      {
        name: "disaster_need",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "women-farmers",
    icon: "👩‍🌾",
    categoryId: "information-community",
    formVersion: 1,
    fields: [
      {
        name: "women_enterprise",
        type: "text",
        required: false,
      },
      {
        name: "women_role",
        type: "select",
        options: [
          {
            value: "কৃষক/উৎপাদক",
          },
          {
            value: "উদ্যোক্তা",
          },
          {
            value: "প্রক্রিয়াজাতকারী",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
      {
        name: "women_capacity",
        type: "text",
        required: false,
      },
      {
        name: "women_support",
        type: "select",
        options: [
          {
            value: "বাজার/ক্রেতা",
          },
          {
            value: "প্রশিক্ষণ",
          },
          {
            value: "উপকরণ/সেবা",
          },
          {
            value: "অর্থায়ন তথ্য",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
    ],
  },
  {
    slug: "youth-agripreneurs",
    icon: "🚀",
    categoryId: "information-community",
    formVersion: 1,
    fields: [
      {
        name: "youth_idea",
        type: "text",
        required: false,
      },
      {
        name: "youth_stage",
        type: "select",
        options: [
          {
            value: "পরিকল্পনা করছি",
          },
          {
            value: "শুরু করেছি",
          },
          {
            value: "চলমান উদ্যোগ",
          },
        ],
        required: false,
      },
      {
        name: "youth_support",
        type: "select",
        options: [
          {
            value: "প্রশিক্ষণ/পরামর্শ",
          },
          {
            value: "বাজার/ক্রেতা",
          },
          {
            value: "অংশীদার",
          },
          {
            value: "অর্থায়ন তথ্য",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
      {
        name: "youth_capacity",
        type: "text",
        required: false,
      },
    ],
  },
  {
    slug: "worker-marketplace",
    icon: "🧑‍🔧",
    categoryId: "labor-machinery",
    formVersion: 1,
    fields: [
      {
        name: "worker_task",
        type: "text",
        required: false,
      },
      {
        name: "worker_skill",
        type: "text",
        required: false,
      },
      {
        name: "worker_count",
        type: "number",
        required: false,
      },
      {
        name: "worker_date",
        type: "date",
        required: false,
      },
    ],
  },
  {
    slug: "community-reports",
    icon: "📣",
    categoryId: "information-community",
    formVersion: 1,
    fields: [
      {
        name: "report_type",
        type: "select",
        options: [
          {
            value: "কৃষি সমস্যা",
          },
          {
            value: "বাজার অনিয়ম",
          },
          {
            value: "সেবা-সংক্রান্ত সমস্যা",
          },
          {
            value: "অন্যান্য",
          },
        ],
        required: false,
      },
      {
        name: "report_location",
        type: "text",
        required: false,
      },
      {
        name: "report_date",
        type: "text",
        required: false,
      },
      {
        name: "report_action",
        type: "text",
        required: false,
      },
    ],
  },
] as const;

export type AgricultureService = (typeof agricultureServiceRegistry)[number];
export type AgricultureServiceField = AgricultureService["fields"][number];
export type AgricultureServiceFieldWithContent = {
  name: string;
  type: "text" | "number" | "date" | "select" | "file";
  required: boolean;
  maxLength?: number;
  labelBn: string;
  labelEn: string;
  options?: ReadonlyArray<{ value: string; labelBn: string; labelEn: string }>;
};

export type AgricultureServiceWithContent = Omit<AgricultureService, "fields" | "icon"> & {
  titleBn: string;
  titleEn: string;
  descriptionBn: string;
  descriptionEn: string;
  icon: string;
  fields: AgricultureServiceFieldWithContent[];
};

export const agricultureServiceCategories = [
  {
    id: "crop-production",
  },
  {
    id: "farm-enterprises",
  },
  {
    id: "market-supply",
  },
  {
    id: "labor-machinery",
  },
  {
    id: "finance",
  },
  {
    id: "information-community",
  },
] as const;
