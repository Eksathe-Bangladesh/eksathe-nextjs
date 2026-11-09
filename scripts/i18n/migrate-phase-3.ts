// One-time, repeatable migration. Keep key-migrations.json as the alias history.
import fs from "node:fs";
import path from "node:path";

type Tree = { [key: string]: string | Tree | string[] };
const root = path.resolve(import.meta.dir, "../..");
const catalog = (locale: string): Tree =>
  JSON.parse(fs.readFileSync(path.join(root, `messages/${locale}.json`), "utf8"));
const camel = (value: string) =>
  value.replace(/[_-]([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
const files = [...new Bun.Glob("src/**/*.{ts,tsx}").scanSync(root)].filter(
  (file) => !file.endsWith(".test.ts") && file !== "src/lib/payment-methods.ts",
);
const sources = new Map(
  files.map((file) => [file.replaceAll("\\", "/"), fs.readFileSync(path.join(root, file), "utf8")]),
);

// Sentence-derived and truncated names become short, purpose-based keys.
const overrides: Record<string, string> = {
  these_details_are_used_for_requests_and_bo: "account.profile.usageNotice",
  track_request_status_submitted_details_and: "account.requests.description",
  track_construction_scope_quotes_milestones: "account.projects.description",
  accepting_confirms_the_quoted_price_quanti: "account.requests.acceptanceNotice",
  review_submitted_information_add_a_source: "admin.publishing.description",
  expiry_date_required_for_weather_alerts: "admin.publishing.weatherExpiryLabel",
  these_details_appear_publicly_on_the_agric: "admin.support.visibilityNotice",
  could_not_save_check_the_fields_and_try_ag: "admin.publishing.saveError",
  review_requests_coordinate_follow_up_and_k: "admin.agricultureRequests.description",
  no_agriculture_requests_match_these_filter: "admin.agricultureRequests.empty",
  matched_marketplace_request_id_optional: "admin.agricultureRequests.marketplaceRequestLabel",
  agriculture_transport_commission_notice: "agriculture.commissionCalculator.transportNotice",
  the_agriculture_commission_rate_is_not_ava: "agriculture.commissionCalculator.rateUnavailable",
  estimated_provider_amount_including_transp: "common.commissionCalculator.providerAmount",
  grow_find_support_and_reach_markets_togeth: "agriculture.home.title",
  find_farm_products_workers_machinery_advic: "agriculture.home.description",
  marketplace_listings_could_not_be_loaded_p: "marketplace.listings.loadError",
  no_published_listings_yet_please_check_bac: "agriculture.home.emptyListings",
  choose_a_service_to_see_its_details_and_re: "agriculture.services.description",
  this_estimate_uses_the_current_agriculture: "agriculture.home.commissionNotice",
  market_prices_news_advice_and_weather_aler: "agriculture.home.publicationsDescription",
  published_information_is_temporarily_unava: "agriculture.home.publicationsUnavailable",
  support_information_could_not_be_loaded: "agriculture.support.loadError",
  support_contact_details_have_not_been_conf: "agriculture.support.notConfigured",
  search_listings_by_seller_category_distric: "agriculture.market.description",
  no_published_products_match_these_filters: "agriculture.market.empty",
  agriculture_news_practical_advice_and_curr: "agriculture.information.description",
  this_information_is_temporarily_unavailabl: "agriculture.information.unavailable",
  service_requests_are_reviewed_and_coordina: "agriculture.serviceDetail.coordinationNotice",
  preview_the_fields_below_sign_in_and_verif: "agriculture.requestForm.signInNotice",
  requesting_coordination_does_not_create_an: "agriculture.requestForm.coordinationNotice",
  construction_transport_commission_notice: "construction.commissionCalculator.transportNotice",
  the_construction_commission_rate_is_not_av: "construction.commissionCalculator.rateUnavailable",
  construction_services_across_bangladesh: "construction.home.eyebrow",
  agriculture_services_across_bangladesh: "agriculture.home.eyebrow",
  plan_your_build_and_find_the_right_people: "construction.home.title",
  find_approved_professionals_and_material_s: "construction.home.description",
  no_approved_construction_listings_yet_plea: "construction.home.emptyListings",
  "8_construction_service_areas": "construction.home.serviceAreaCount",
  browse_an_approved_provider_or_create_a_pr: "construction.services.description",
  the_estimate_uses_the_current_construction: "construction.home.commissionNotice",
  track_providers_material_orders_project_mi: "construction.home.projectDescription",
  find_construction_services_and_materials: "construction.market.title",
  browse_by_work_type_location_and_price_cre: "construction.market.description",
  no_approved_listings_match_these_filters_a: "construction.market.empty",
  there_are_no_approved_listings_for_this_se: "construction.serviceDetail.empty",
  the_provider_will_send_terms_for_you_to_re: "marketplace.listingDetail.requestNotice",
  reviews_from_completed_orders_will_appear: "marketplace.providerProfile.emptyReviews",
  no_approved_listings_yet_apply_to_become_a: "dashboard.sector.empty",
  describe_the_work_you_can_invite_construct: "projects.create.description",
  compare_several_quotes_per_package_create: "projects.packages.description",
  compare_scope_quantity_transport_price_and: "projects.quotes.description",
  create_a_work_package_before_inviting_prov: "projects.packages.requiredNotice",
  no_provider_invitations_have_been_sent_for: "projects.packages.noInvitations",
  providers_submit_progress_for_your_approva: "projects.milestones.approvalNotice",
  accept_a_construction_service_provider_s_q: "projects.milestones.quoteRequired",
  these_records_are_visible_only_to_the_proj: "projects.expenses.visibilityNotice",
  no_project_files_have_been_added_yet: "projects.files.empty",
  no_project_photos_have_been_added_yet: "projects.photos.empty",
  only_one_quote_can_be_accepted_for_this_wo: "projects.packages.acceptanceNotice",
  content_and_photo_edits_unpublish_the_list: "provider.listingEdit.moderationNotice",
  the_current_photo_stays_if_you_do_not_choo: "provider.listingEdit.photoNotice",
  the_image_could_not_be_uploaded_please_try: "provider.upload.error",
  goods_need_stock_to_sell_worker_and_machin: "provider.listingForm.stockHelp",
  apply_once_to_serve_customers_in_agricultu: "provider.application.description",
  this_provider_profile_is_suspended_it_cann: "provider.workspace.suspendedNotice",
  new_listings_are_reviewed_by_the_operation: "provider.workspace.moderationNotice",
  customers_see_these_details_your_profile_p: "provider.storefront.description",
  apply_for_additional_sector_capabilities_f: "provider.capabilities.description",
  availability_is_checked_against_booking_da: "provider.listings.availabilityNotice",
  jpg_png_or_webp_up_to_5_mb_leave_blank_to: "provider.storefront.photoHelp",
  daily_rates_are_calculated_for_the_selecte: "marketplace.requestForm.dailyRateNotice",
  add_requirements_collection_or_transport_d: "marketplace.requestForm.requirementsPlaceholder",
  pay_the_provider_directly_the_payment_is_n: "marketplace.order.paymentNotice",
  you_can_leave_one_review_for_each_complete: "marketplace.order.reviewNotice",
  listings_count: "marketplace.listingCount",
  view: "common.actions.view",
  search: "common.actions.search",
  clear: "common.actions.clear",
  update: "common.actions.update",
  saving: "common.states.saving",
  create_a_project: "projects.actions.create",
  track_request: "agriculture.requestForm.trackRequest",
  all_agriculture_services: "agriculture.services.all",
  agriculture_support: "agriculture.support.title",
  agriculture_marketplace: "agriculture.market.name",
  market_prices: "agriculture.information.marketPrices",
  no_published_market_prices_yet: "agriculture.information.emptyPrices",
  news: "agriculture.information.news",
  advice: "agriculture.information.advice",
  weather_alert: "agriculture.information.weatherAlert",
  construction_service: "construction.serviceDetail.label",
  browse_marketplace: "marketplace.actions.browse",
  back_to_dashboard: "dashboard.actions.back",
  name_bangla: "common.fields.nameBangla",
  name_english: "common.fields.nameEnglish",
};

function owner(file: string) {
  const parts = file
    .replace(/^src\/components\//, "")
    .replace(/\.tsx?$/, "")
    .split("/");
  const feature = parts[0];
  const component = parts.at(-1)!;
  const names: Record<string, string> = {
    "agriculture-home": "home",
    "construction-home": "home",
    "agriculture-market": "market",
    "construction-market": "market",
    "agriculture-service-detail": "serviceDetail",
    "construction-service-detail": "serviceDetail",
    "agriculture-public-information-page": "information",
    "service-request-form": "requestForm",
    "agriculture-commission-calculator": "commissionCalculator",
    "construction-commission-calculator": "commissionCalculator",
    "account-workspace": "workspace",
    "agriculture-request-detail": "agricultureRequest",
    "admin-workspace": "workspace",
    "agro-admin-workspace": "agriculture",
    "agriculture-publishing-workspace": "publishing",
    "agriculture-requests-queue": "agricultureRequests",
    "listing-detail": "listingDetail",
    "provider-profile": "providerProfile",
    "sector-landing": "sector",
    "create-project-entry": "create",
    "project-detail": "detail",
    "project-forms": "forms",
    "milestone-list": "milestones",
    "listing-edit-form": "listingEdit",
    "listing-form": "listingForm",
    "provider-application-entry": "application",
    "provider-application-form": "application",
    "provider-workspace": "workspace",
    "storefront-form": "storefront",
    "listing-request-form": "requestForm",
    "order-card": "order",
  };
  return `${["workflows", "dashboard"].includes(feature) && component !== "sector-landing" ? "marketplace" : feature}.${names[component] ?? camel(component)}`;
}

function flatten(tree: Tree, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string"
      ? [[full, value] as [string, string]]
      : flatten(value as Tree, full);
  });
}

const mappingPath = path.join(import.meta.dir, "key-migrations.json");
const mapping: Record<string, string> = fs.existsSync(mappingPath)
  ? JSON.parse(fs.readFileSync(mappingPath, "utf8"))
  : {};
const canonicalRenames: Record<string, string> = {
  "agriculture.home.whatDoYouNeedHelpWith": "agriculture.services.title",
  "agriculture.home.noServicesMatchYourSearch": "agriculture.services.empty",
  "agriculture.home.marketPricesAndAgricultureUpdates": "agriculture.home.publicationsTitle",
  "agriculture.home.reviewedByTheAgricultureTeam": "agriculture.home.publicationsEyebrow",
  "agriculture.information.verifiedAgricultureInformation": "agriculture.information.eyebrow",
  "agriculture.information.newsAdviceAndAlerts": "agriculture.information.updatesTitle",
  "agriculture.requestForm.chooseAnOption": "agriculture.requestForm.optionPlaceholder",
  "agriculture.requestForm.uploadingPrivatePhoto": "agriculture.requestForm.photoUploading",
  "construction.home.whatDoYouNeedForYourProject": "construction.services.title",
  "construction.home.noServiceAreasMatchYourSearch": "construction.services.empty",
  "construction.home.aClearWayToOrganizeYourBuild": "construction.home.workflowEyebrow",
  "construction.home.howConstructionProjectsWork": "construction.home.workflowTitle",
  "construction.home.keepYourProjectInOnePlace": "construction.home.projectTitle",
  "construction.market.listingsAreTemporarilyUnavailable": "construction.market.unavailable",
  "construction.market.createAProjectToRequestQuotes": "construction.market.emptyAction",
  "provider.workspace.thisListingIsArchived": "provider.listings.archivedNotice",
  "projects.forms.houseShopRenovation": "projects.forms.projectTypePlaceholder",
  "home.marketAndPolicy.marketTag": "home.marketUpdates.eyebrow",
  "home.marketAndPolicy.marketTitle": "home.marketUpdates.title",
  "home.marketAndPolicy.feedSampleBadge": "home.marketUpdates.sampleBadge",
  "home.marketAndPolicy.feedSampleTitle": "home.marketUpdates.sampleTitle",
  "home.marketAndPolicy.feedSampleDescription": "home.marketUpdates.sampleDescription",
  "home.marketAndPolicy.feedWarningBadge": "home.marketUpdates.warningBadge",
  "home.marketAndPolicy.feedWarningTitle": "home.marketUpdates.warningTitle",
  "home.marketAndPolicy.feedWarningDescription": "home.marketUpdates.warningDescription",
  "home.marketAndPolicy.policyTag": "home.policy.eyebrow",
  "home.marketAndPolicy.policyTitle": "home.policy.title",
  "home.marketAndPolicy.policies": "home.policy.items",
  "admin.publishing.unitEGKg": "admin.publishing.unitPlaceholder",
  "construction.market.eGBricksEngineerDhaka": "construction.market.searchPlaceholder",
  "provider.listingForm.eGVegetablesBricksMasonry": "provider.listingForm.categoryPlaceholder",
  "provider.listingForm.kgDayBag": "provider.listingForm.unitPlaceholder",
  "agriculture.requestForm.optionalJpegPngOrWebpUpTo5Mb": "agriculture.requestForm.photoHelp",
};
const canonicalKey = (key: string) => {
  for (const [before, after] of Object.entries(canonicalRenames)) {
    if (key === before || key.startsWith(`${before}.`)) return after + key.slice(before.length);
  }
  return key;
};
const en = catalog("en");
for (const [key] of flatten(en)) {
  const [namespace, ...segments] = key.split(".");
  if (namespace === "inline") {
    const name = segments.join(".");
    const consumers = [...sources]
      .filter(([, source]) => source.includes(`"${key}"`) || source.includes(`'${key}'`))
      .map(([file]) => owner(file));
    if (!consumers.length) throw new Error(`No consumer: ${key}`);
    const owners = [...new Set(consumers)];
    const features = [...new Set(owners.map((value) => value.split(".")[0]))];
    const prefix =
      owners.length === 1
        ? owners[0]
        : features.length === 1
          ? `${features[0]}.labels`
          : "common.labels";
    mapping[key] = overrides[name] ?? `${prefix}.${camel(name)}`;
  } else if (namespace === "requestForm")
    mapping[key] = `agriculture.requestForm.${segments.join(".")}`;
  else if (namespace === "commission")
    mapping[key] = `common.commissionCalculator.${segments.join(".")}`;
  else if (namespace === "emergency") mapping[key] = `common.emergency.${segments.join(".")}`;
  else if (namespace === "categoryGrid")
    mapping[key] = `dashboard.categoryGrid.${segments.join(".")}`;
  else if (namespace === "panels")
    mapping[key] = (
      {
        searchAriaLabel: "agriculture.services.searchLabel",
        categoryAriaLabel: "agriculture.services.categoryLabel",
        "categories.market": "admin.publishing.marketLabel",
        "categories.finance": "admin.workspace.financeLabel",
      } as Record<string, string>
    )[segments.join(".")];
  else if (namespace === "marketAndPolicy")
    mapping[key] = `home.marketAndPolicy.${segments.join(".")}`;
  else if (key === "constructionServices.listingsFor")
    mapping[key] = "construction.serviceDetail.listingsFor";
}
// t.raw reads the whole array; preserve its shape while relocating its parent.
mapping["marketAndPolicy.policies"] = "home.marketAndPolicy.policies";
for (const key of Object.keys(mapping)) mapping[key] = canonicalKey(mapping[key]);

function put(target: Tree, key: string, text: string) {
  const segments = key.split(".");
  let node = target;
  for (const [index, segment] of segments.slice(0, -1).entries()) {
    // next-intl addresses object properties, not array entries, as message keys.
    // Option indices stay stable, but use numeric object keys for type-safe lookup.
    if (node[segment] === undefined)
      node[segment] = /^\d+$/.test(segments[index + 1]) && segment !== "options" ? [] : {};
    node = node[segment] as Tree;
  }
  const leaf = segments.at(-1)!;
  if (node[leaf] !== undefined && node[leaf] !== text) throw new Error(`Conflicting alias: ${key}`);
  node[leaf] = text;
}

for (const locale of ["en", "bn"]) {
  const output: Tree = {};
  for (const [key, text] of flatten(catalog(locale)))
    put(output, canonicalKey(mapping[key] ?? key), text);
  fs.writeFileSync(
    path.join(root, `messages/${locale}.json`),
    `${JSON.stringify(output, null, 2)}\n`,
  );
}
for (const [file, source] of sources) {
  let updated = source;
  for (const [before, after] of Object.entries({ ...mapping, ...canonicalRenames })) {
    for (const quote of ['"', "'", "`"])
      updated = updated.replaceAll(`${quote}${before}${quote}`, `${quote}${after}${quote}`);
  }
  if (updated !== source) fs.writeFileSync(path.join(root, file), updated);
}
fs.writeFileSync(mappingPath, `${JSON.stringify(mapping, null, 2)}\n`);
console.log(`Migrated ${Object.keys(mapping).length} keys; English and Bangla values preserved.`);
