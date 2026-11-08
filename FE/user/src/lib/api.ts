import type {
  AreaAlertItem,
  VehicleMode,
  CommunityReport,
  CommunityUserProfile,
  ForecastSlot,
  MapFloodPoint,
  NavigationStep,
  ReportType,
  RouteEndpoint,
  RouteId,
  RouteItem,
  SavedRoutePair,
  Severity,
  WeatherSnapshot,
} from "@/types";
import {
  computeRouteWithGoogle,
  reverseGeocodeWithGoogle,
  searchPlacesWithGoogle,
} from "./googleMaps";
import { fetchFullRealWeather } from "./weatherApi";
import defaultHotspots from "@/data/hcmc_flood_hotspots.json";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

export const EMPTY_ROUTES: Record<RouteId, RouteItem> = {
  safe: {
    id: "safe",
    name: "Tuyến đề xuất",
    time: "—",
    distance: "—",
    badge: "Chờ nhập điểm",
    detail: "Vui lòng nhập Điểm đi và Điểm đến ở trên để tìm lộ trình an toàn.",
  },
  balanced: {
    id: "balanced",
    name: "Tuyến dự phòng",
    time: "—",
    distance: "—",
    badge: "Dự phòng",
    detail: "Lộ trình thay thế sẽ hiển thị sau khi bạn chọn Điểm đi và Điểm đến.",
  },
};

function normalizeVn(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\bq\.?\s*(\d{1,2})\b/g, "quan $1")
    .replace(/\bp\.?\s*(\d{1,2})\b/g, "phuong $1")
    .replace(/\bd\.\s+/g, "duong ")
    .replace(/\bdh\b/g, "dai hoc")
    .replace(/\bbv\b/g, "benh vien")
    .replace(/\bcc\b/g, "chung cu")
    .replace(/[,.;:()[\]'"/\\|+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isWithinHcmcBounds(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 10.34 &&
    lat <= 11.18 &&
    lng >= 106.34 &&
    lng <= 107.06
  );
}

function cleanQueryForGeocoder(raw: string): string {
  return raw
    .replace(/^[Đđ]\.\s*/u, "")
    .replace(/\bQ\.?\s*(\d{1,2})\b/giu, "Quận $1")
    .replace(/\bP\.?\s*(\d{1,2})\b/giu, "Phường $1")
    .replace(/\bĐH\b/giu, "Đại học")
    .replace(/\bBV\b/giu, "Bệnh viện")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFallbackQueries(raw: string): string[] {
  const cleaned = cleanQueryForGeocoder(raw);
  const variants = new Set<string>([cleaned]);

  // Nếu có dấu gạch ngang kiểu Google Maps ("Bánh Mì Huynh Hoa - Lê Thị Riêng")
  if (cleaned.includes(" - ")) {
    for (const part of cleaned.split(" - ")) {
      if (part.trim().length >= 3) variants.add(part.trim());
    }
  }

  // Nếu tìm hẻm/ngõ/số nhà ("Hẻm 387 Trần Xuân Soạn", "387/12 Trần Xuân Soạn")
  const withoutAlleyWord = cleaned.replace(/^(hẻm|hem|ngõ|ngo|số|so)\s+/iu, "").trim();
  if (withoutAlleyWord.length >= 3) {
    variants.add(withoutAlleyWord);
  }
  const streetOnly = withoutAlleyWord.replace(/^\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)*\s+/u, "").trim();
  if (streetOnly.length >= 3) {
    variants.add(streetOnly);
  }

  return Array.from(variants);
}

function getWordInitials(text: string): string {
  return normalizeVn(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && w !== "duong" && w !== "quan" && w !== "tp")
    .map((w) => w[0])
    .join("");
}

const placeSearchCache = new Map<string, RouteEndpoint[]>();
const dynamicPlacePool: RouteEndpoint[] = [];
const dynamicPlaceKeys = new Set<string>();
let engineWarmed = false;

function registerDynamicPlaces(items: RouteEndpoint[]) {
  for (const item of items) {
    if (!item?.label || !Array.isArray(item.coords)) continue;
    const norm = normalizeVn(item.label);
    if (
      norm === "ho chi minh" ||
      norm === "tp ho chi minh" ||
      norm === "thanh pho ho chi minh" ||
      norm === "tp hcm" ||
      norm === "tphcm"
    ) {
      continue;
    }
    const key = `${norm}_${item.coords[0].toFixed(3)}_${item.coords[1].toFixed(3)}`;
    if (!dynamicPlaceKeys.has(key)) {
      dynamicPlaceKeys.add(key);
      dynamicPlacePool.push(item);
    }
  }
}

// Khởi tạo sẵn 250 tuyến đường / giao lộ thực tế tại TP.HCM vào bộ nhớ tìm kiếm tức thì (0ms)
if (Array.isArray(defaultHotspots)) {
  const initialHotspotPlaces: RouteEndpoint[] = [];
  for (const h of defaultHotspots as Array<{
    location?: string;
    district?: string;
    lat?: number;
    lng?: number;
  }>) {
    if (!h?.location || typeof h.lat !== "number" || typeof h.lng !== "number") continue;
    const district = (h.district || "TP.HCM").trim();
    const label = `${h.location} · ${district}`;
    initialHotspotPlaces.push({
      label,
      address: `${h.location}, ${district}, TP. Hồ Chí Minh`,
      district,
      coords: [h.lng, h.lat],
    });
  }
  registerDynamicPlaces(initialHotspotPlaces);
}

/**
 * Chấm điểm độ khớp thực tế giữa từ khóa người dùng gõ và địa điểm trả về
 */
function scorePlaceMatch(query: string, place: RouteEndpoint): number {
  const normQ = normalizeVn(query);
  if (!normQ) return 0;
  const normLabel = normalizeVn(place.label);
  const normAddr = normalizeVn(place.address ?? "");
  const normDist = normalizeVn(place.district ?? "");
  const combined = `${normLabel} ${normAddr} ${normDist}`;
  const initials = getWordInitials(place.label);

  if (normLabel === normQ) return 105;
  if (normLabel.startsWith(normQ)) return 100;
  if (normLabel.includes(` ${normQ}`)) return 92;
  if (normLabel.includes(normQ)) return 86;
  if (initials.length >= 2 && initials.startsWith(normQ)) return 78;
  if (normAddr.includes(normQ)) return 72;

  // Nếu câu truy vấn chứa trọn tên đường/địa điểm (VD: gõ "Hẻm 387 Trần Xuân Soạn" khớp "Trần Xuân Soạn")
  const mainLabelPart = normalizeVn(place.label.split("·")[0] ?? place.label);
  if (mainLabelPart.length >= 4 && normQ.includes(mainLabelPart)) {
    return 70;
  }

  // Kiểm tra độ khớp theo từng từ (token matching)
  const stopWords = new Set([
    "duong",
    "pho",
    "quan",
    "phuong",
    "tp",
    "hcm",
    "thanh",
    "ho",
    "chi",
    "minh",
    "hem",
    "ngo",
    "so",
  ]);
  const qWords = normQ.split(/\s+/).filter((w) => w.length > 0 && !stopWords.has(w));
  if (qWords.length === 0) return 30;

  let matchedWords = 0;
  for (const w of qWords) {
    if (combined.includes(w)) {
      matchedWords += 1;
    }
  }

  const ratio = matchedWords / qWords.length;
  if (qWords.length >= 2 && ratio >= 0.45) {
    return Math.round(45 + ratio * 35);
  }
  if (matchedWords >= 2) {
    return 50;
  }
  if (qWords.length === 1 && matchedWords === 1) {
    return 58;
  }
  if (matchedWords === 1 && qWords.length <= 3) {
    return 35;
  }
  return 0;
}

/**
 * Lọc tức thì (< 1ms) từ tập dữ liệu thật đã tải động từ PostgreSQL, 250 tuyến đường TP.HCM & Bản đồ trực tuyến
 */
export function matchDynamicPlacePool(query: string): RouteEndpoint[] {
  const clean = query.trim();
  if (!clean) return [];
  const normQ = normalizeVn(clean);
  if (!normQ) return [];

  const exactCached = placeSearchCache.get(`commit:${normQ}`);
  if (exactCached && exactCached.length > 0) {
    return exactCached;
  }

  const scored: Array<{ place: RouteEndpoint; score: number }> = [];
  for (const place of dynamicPlacePool) {
    const score = scorePlaceMatch(clean, place);
    if (score >= 55) {
      scored.push({ place, score });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.place);
}

/**
 * Tự động ánh xạ các nhóm danh mục tiếng Việt tự nhiên (quán ăn, quán nước, trung tâm thương mại, rạp phim, siêu thị...)
 * sang từ khóa chuẩn của OpenStreetMap & ArcGIS POI để tìm được mọi địa điểm thực tế tại TP.HCM
 */
function buildSmartSearchQueries(keyword: string): {
  arcgisQuery: string;
  arcgisCategory: string;
  nominatimQuery: string;
  photonQuery: string;
  isCategorySearch: boolean;
} {
  const cleaned = cleanQueryForGeocoder(keyword);
  const norm = normalizeVn(cleaned);
  const alreadyHasHcm =
    norm.includes("ho chi minh") ||
    norm.includes("tphcm") ||
    norm.includes("tp hcm") ||
    norm.includes("sai gon");
  const withHcm = alreadyHasHcm ? cleaned : `${cleaned}, Hồ Chí Minh`;

  if (
    norm.includes("quan nuoc") ||
    norm.includes("ca phe") ||
    norm.includes("cafe") ||
    norm.includes("coffee") ||
    norm.includes("tra sua")
  ) {
    return {
      arcgisQuery: norm === "quan nuoc" || norm === "quan ca phe" ? "Coffee" : cleaned,
      arcgisCategory: "Coffee Shop,Food",
      nominatimQuery:
        norm === "quan nuoc" || norm === "quan ca phe" ? "cafe, Hồ Chí Minh" : withHcm,
      photonQuery: norm === "quan nuoc" || norm === "quan ca phe" ? "cafe Hồ Chí Minh" : cleaned,
      isCategorySearch: true,
    };
  }
  if (
    norm.includes("quan an") ||
    norm.includes("nha hang") ||
    norm.includes("an uong") ||
    norm.includes("com tam") ||
    norm.includes("pho ") ||
    norm.includes("bun ") ||
    norm.includes("lau ") ||
    norm.includes("banh mi")
  ) {
    return {
      arcgisQuery: norm === "quan an" || norm === "nha hang" ? "Nhà hàng" : cleaned,
      arcgisCategory: "Food",
      nominatimQuery:
        norm === "quan an" || norm === "nha hang" ? "restaurant, Hồ Chí Minh" : withHcm,
      photonQuery: norm === "quan an" || norm === "nha hang" ? "nhà hàng Hồ Chí Minh" : cleaned,
      isCategorySearch: true,
    };
  }
  if (
    norm.includes("trung tam thuong mai") ||
    norm.includes("tttm") ||
    norm.includes("mall") ||
    norm.includes("vincom") ||
    norm.includes("aeon") ||
    norm.includes("takashimaya")
  ) {
    return {
      arcgisQuery: norm.includes("trung tam thuong mai") || norm === "tttm" ? "Mall" : cleaned,
      arcgisCategory: "Shopping Center,Shops and Service",
      nominatimQuery:
        norm.includes("trung tam thuong mai") || norm === "tttm" ? "mall, Hồ Chí Minh" : withHcm,
      photonQuery:
        norm.includes("trung tam thuong mai") || norm === "tttm" ? "Vincom Hồ Chí Minh" : cleaned,
      isCategorySearch: true,
    };
  }
  if (norm.includes("sieu thi") || norm.includes("bach hoa")) {
    return {
      arcgisQuery: norm === "sieu thi" ? "Co.opmart" : cleaned,
      arcgisCategory: "Food and Drink,Shops and Service",
      nominatimQuery: norm === "sieu thi" ? "supermarket, Hồ Chí Minh" : withHcm,
      photonQuery: norm === "sieu thi" ? "Co.opmart Hồ Chí Minh" : cleaned,
      isCategorySearch: true,
    };
  }
  if (norm.includes("rap chieu phim") || norm.includes("rap phim") || norm.includes("cgv")) {
    return {
      arcgisQuery: norm.includes("rap chieu phim") || norm === "rap phim" ? "Cinema" : cleaned,
      arcgisCategory: "Cinema,Arts and Entertainment",
      nominatimQuery:
        norm.includes("rap chieu phim") || norm === "rap phim" ? "cinema, Hồ Chí Minh" : withHcm,
      photonQuery:
        norm.includes("rap chieu phim") || norm === "rap phim" ? "CGV Hồ Chí Minh" : cleaned,
      isCategorySearch: true,
    };
  }
  if (norm.includes("truong dai hoc") || norm.includes("dai hoc")) {
    const sub = cleaned.replace(/^[Tt]rường\s+/u, "").trim();
    return {
      arcgisQuery: sub || "Đại học",
      arcgisCategory: "College and University,Education",
      nominatimQuery:
        norm === "truong dai hoc" || norm === "dai hoc"
          ? "university, Hồ Chí Minh"
          : `${sub}, Hồ Chí Minh`,
      photonQuery: sub || "Đại học Hồ Chí Minh",
      isCategorySearch: true,
    };
  }
  if (norm.includes("benh vien") || norm.includes("phong kham")) {
    return {
      arcgisQuery: cleaned,
      arcgisCategory: "Hospital,Medical",
      nominatimQuery: norm === "benh vien" ? "hospital, Hồ Chí Minh" : withHcm,
      photonQuery: cleaned,
      isCategorySearch: true,
    };
  }
  if (norm.includes("cay xang") || norm.includes("tram xang")) {
    return {
      arcgisQuery: "Petrolimex",
      arcgisCategory: "Gas Station",
      nominatimQuery: "fuel, Hồ Chí Minh",
      photonQuery: "Petrolimex Hồ Chí Minh",
      isCategorySearch: true,
    };
  }
  return {
    arcgisQuery: cleaned,
    arcgisCategory: "",
    nominatimQuery: withHcm,
    photonQuery: cleaned,
    isCategorySearch: false,
  };
}

function parseArcgisCandidates(candidates: any[]): RouteEndpoint[] {
  const out: RouteEndpoint[] = [];
  for (const c of candidates) {
    const lat = c?.location?.y;
    const lng = c?.location?.x;
    if (typeof lat !== "number" || typeof lng !== "number" || !isWithinHcmcBounds(lat, lng)) {
      continue;
    }
    const attrs = c?.attributes ?? {};
    const addrType = String(attrs.Addr_type || "");
    if (addrType === "Locality" || addrType === "Admin") continue;

    const mainName = (attrs.PlaceName || attrs.StAddr || c.address?.split(",")[0] || "").trim();
    if (!mainName) continue;
    const normMain = normalizeVn(mainName);
    if (
      normMain === "ho chi minh" ||
      normMain === "thanh pho ho chi minh" ||
      normMain === "viet nam"
    ) {
      continue;
    }
    const district = (
      attrs.District ||
      attrs.Subregion ||
      attrs.Nbrhd ||
      attrs.City ||
      "TP.HCM"
    ).trim();
    const fullAddress = attrs.Place_addr || c.address || `${mainName}, ${district}`;
    const label =
      district && !normMain.includes(normalizeVn(district))
        ? `${mainName} · ${district}`
        : mainName;
    out.push({
      label,
      address: fullAddress,
      district,
      coords: [lng, lat],
    });
  }
  return out;
}

async function fetchArcgisCandidates(
  keyword: string,
  maxLocations = 10,
  signal?: AbortSignal,
): Promise<RouteEndpoint[]> {
  try {
    const { arcgisQuery, arcgisCategory } = buildSmartSearchQueries(keyword);
    const categoryParam = arcgisCategory ? `&category=${encodeURIComponent(arcgisCategory)}` : "";
    const baseParams = `${categoryParam}&f=json&countryCode=VNM&location=106.7009,10.7769&searchExtent=106.35,10.35,107.05,11.16&outFields=PlaceName,Place_addr,StAddr,Nbrhd,District,City,Subregion,Addr_type,Type&maxLocations=${maxLocations}`;

    const directUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(arcgisQuery)}${baseParams}`;
    const hcmScopedUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(`${arcgisQuery}, Hồ Chí Minh`)}${baseParams}`;

    const [resDirect, resScoped] = await Promise.all([
      fetch(directUrl, { signal })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(hcmScopedUrl, { signal })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    const combinedCandidates = [
      ...(Array.isArray(resDirect?.candidates) ? resDirect.candidates : []),
      ...(Array.isArray(resScoped?.candidates) ? resScoped.candidates : []),
    ];
    let out = parseArcgisCandidates(combinedCandidates);

    // Nếu người dùng gõ "Hẻm 387 Trần Xuân Soạn" hoặc "Bánh Mì Huynh Hoa - Lê Thị Riêng" mà chưa ra kết quả, tự động thử biến thể tên đường/chính
    if (out.length === 0) {
      const fallbacks = extractFallbackQueries(keyword).slice(1);
      for (const fb of fallbacks) {
        if (signal?.aborted) break;
        const fbUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(`${fb}, Hồ Chí Minh`)}${baseParams}`;
        const fbData = await fetch(fbUrl, { signal })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        if (Array.isArray(fbData?.candidates) && fbData.candidates.length > 0) {
          out = parseArcgisCandidates(fbData.candidates);
          if (out.length > 0) break;
        }
      }
    }

    registerDynamicPlaces(out);
    return out;
  } catch {
    return [];
  }
}

async function fetchPhotonCandidates(
  keyword: string,
  limit = 10,
  signal?: AbortSignal,
): Promise<RouteEndpoint[]> {
  try {
    const { photonQuery } = buildSmartSearchQueries(keyword);
    const queriesToTry = [photonQuery, ...extractFallbackQueries(keyword)];
    const uniqueQueries = Array.from(new Set(queriesToTry)).slice(0, 2);

    const responses = await Promise.all(
      uniqueQueries.map((q) => {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=10.7769&lon=106.7009&limit=${limit}&bbox=106.35,10.35,107.05,11.16`;
        return fetch(url, { signal })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
      }),
    );

    const out: RouteEndpoint[] = [];
    for (const data of responses) {
      const features = Array.isArray(data?.features) ? data.features : [];
      for (const f of features) {
        const lng = Number(f?.geometry?.coordinates?.[0]);
        const lat = Number(f?.geometry?.coordinates?.[1]);
        if (!isWithinHcmcBounds(lat, lng)) continue;
        const props = f?.properties ?? {};
        const mainName = (
          props.name ||
          [props.housenumber, props.street].filter(Boolean).join(" ") ||
          props.street ||
          ""
        ).trim();
        if (!mainName) continue;
        const normMain = normalizeVn(mainName);
        if (
          normMain === "ho chi minh" ||
          normMain === "thanh pho ho chi minh" ||
          normMain === "viet nam"
        ) {
          continue;
        }
        const district = (
          props.district ||
          props.city_district ||
          props.county ||
          props.suburb ||
          props.city ||
          "TP.HCM"
        ).trim();
        const fullAddress =
          [
            props.name,
            props.housenumber ? `${props.housenumber} ${props.street || ""}`.trim() : props.street,
            props.suburb || props.locality,
            district,
            "TP. Hồ Chí Minh",
          ]
            .filter(Boolean)
            .join(", ") || `${mainName}, ${district}`;
        const label =
          district && !normMain.includes(normalizeVn(district))
            ? `${mainName} · ${district}`
            : mainName;
        out.push({
          label,
          address: fullAddress,
          district,
          coords: [lng, lat],
        });
      }
    }
    registerDynamicPlaces(out);
    return out;
  } catch {
    return [];
  }
}

function parseNominatimItems(data: any[]): RouteEndpoint[] {
  if (!Array.isArray(data)) return [];
  const out: RouteEndpoint[] = [];
  for (const item of data) {
    const lat = Number(item?.lat);
    const lng = Number(item?.lon);
    if (!isWithinHcmcBounds(lat, lng)) continue;
    const addr = item?.address ?? {};
    const mainName = (
      item?.name ||
      [addr.house_number, addr.road].filter(Boolean).join(" ") ||
      item?.display_name?.split(",")[0] ||
      ""
    ).trim();
    if (!mainName) continue;
    const normMain = normalizeVn(mainName);
    if (normMain === "ho chi minh" || normMain === "thanh pho ho chi minh") continue;
    const district = (
      addr.city_district ||
      addr.suburb ||
      addr.county ||
      addr.quarter ||
      "TP.HCM"
    ).trim();
    const fullAddress = (item?.display_name || `${mainName}, ${district}, TP. Hồ Chí Minh`).trim();
    const label =
      district && !normMain.includes(normalizeVn(district))
        ? `${mainName} · ${district}`
        : mainName;
    out.push({
      label,
      address: fullAddress,
      district,
      coords: [lng, lat],
    });
  }
  return out;
}

async function fetchNominatimCandidates(
  keyword: string,
  limit = 10,
  signal?: AbortSignal,
): Promise<RouteEndpoint[]> {
  try {
    const { nominatimQuery } = buildSmartSearchQueries(keyword);
    const cleaned = cleanQueryForGeocoder(keyword);
    const queries = Array.from(
      new Set([cleaned, nominatimQuery, ...extractFallbackQueries(keyword)]),
    ).slice(0, 2);

    const responses = await Promise.all(
      queries.map((q) => {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&addressdetails=1&limit=${limit}&countrycodes=vn&viewbox=106.35,11.16,107.05,10.35&bounded=1&accept-language=vi`;
        return fetch(url, { signal })
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []);
      }),
    );

    const out: RouteEndpoint[] = [];
    for (const data of responses) {
      out.push(...parseNominatimItems(data));
    }
    registerDynamicPlaces(out);
    return out;
  } catch {
    return [];
  }
}

/**
 * Mở sẵn kết nối mạng HTTP/2 TLS tới máy chủ Bản đồ quốc tế (không dùng từ khóa cứng)
 */
export function warmPlaceSearchEngine(): void {
  if (engineWarmed) return;
  engineWarmed = true;
  window.setTimeout(() => {
    void fetch("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer?f=json").catch(
      () => null,
    );
    void fetch("https://photon.komoot.io/api/?q=Saigon&lat=10.7769&lon=106.7009&limit=1").catch(
      () => null,
    );
  }, 40);
}

if (typeof window !== "undefined") {
  warmPlaceSearchEngine();
}

function withProviderTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), ms);
    promise
      .then((val) => {
        window.clearTimeout(timer);
        resolve(val);
      })
      .catch(() => {
        window.clearTimeout(timer);
        resolve(fallback);
      });
  });
}

/**
 * Tìm kiếm địa điểm / đường phố / POI / hẻm thời gian thực kết hợp đa nguồn:
 * Google Places + ArcGIS World Geocoder + Photon OpenStreetMap + Nominatim OSM + 250 tuyến đường TP.HCM
 */
export async function searchPlacesApi(
  query: string,
  signal?: AbortSignal,
  options: { allowNominatim?: boolean } = {},
): Promise<RouteEndpoint[]> {
  if (signal?.aborted) return [];
  const clean = query.trim();
  if (!clean) {
    return [];
  }

  const cacheKey = `${options.allowNominatim === false ? "autocomplete:" : "commit:"}${normalizeVn(clean)}`;
  const cached = placeSearchCache.get(cacheKey);
  if (cached && cached.length > 0) {
    return cached;
  }

  const localResults: RouteEndpoint[] = [...matchDynamicPlacePool(clean)];

  const googlePromise = withProviderTimeout(
    searchPlacesWithGoogle(clean).then((res) => {
      if (res.length > 0) registerDynamicPlaces(res);
      return res;
    }),
    1800,
    [],
  );

  const arcgisDirectPromise = withProviderTimeout(
    fetchArcgisCandidates(clean, 10, signal),
    1800,
    [],
  );
  const photonDirectPromise = withProviderTimeout(
    fetchPhotonCandidates(clean, 10, signal),
    1800,
    [],
  );
  const nominatimPromise =
    options.allowNominatim === false
      ? Promise.resolve([])
      : withProviderTimeout(fetchNominatimCandidates(clean, 10, signal), 2000, []);

  const backendPromise = withProviderTimeout(
    (async (): Promise<RouteEndpoint[]> => {
      try {
        const res = await fetch(`${API_BASE}/map/geocode/search?q=${encodeURIComponent(clean)}`, {
          signal,
        });
        if (!res.ok) return [];
        const data = await res.json();
        if (!Array.isArray(data)) return [];
        const out: RouteEndpoint[] = [];
        for (const item of data) {
          if (
            typeof item?.lat !== "number" ||
            typeof item?.lng !== "number" ||
            !isWithinHcmcBounds(item.lat, item.lng)
          ) {
            continue;
          }
          const name = (item.name || clean).trim();
          const normName = normalizeVn(name);
          if (normName === "ho chi minh" || normName === "thanh pho ho chi minh") continue;
          const district = (item.district || "TP. Hồ Chí Minh").trim();
          const address = (item.address || (district ? `${name}, ${district}` : name)).trim();
          const label =
            district && !normName.includes(normalizeVn(district)) ? `${name} · ${district}` : name;
          out.push({
            label,
            address,
            district,
            coords: [item.lng, item.lat],
          });
        }
        registerDynamicPlaces(out);
        return out;
      } catch {
        return [];
      }
    })(),
    1800,
    [],
  );

  const settledBatches = await Promise.all([
    googlePromise,
    photonDirectPromise,
    nominatimPromise,
    arcgisDirectPromise,
    backendPromise,
  ]);

  if (signal?.aborted) return [];
  const remoteBatch = settledBatches.flat();
  const merged: RouteEndpoint[] = [...remoteBatch, ...localResults];
  const unique: RouteEndpoint[] = [];
  for (const item of merged) {
    const normItemLabel = normalizeVn(item.label.split("·")[0] ?? item.label);
    const isDuplicate = unique.some((r) => {
      const normRLabel = normalizeVn(r.label.split("·")[0] ?? r.label);
      const sameLabel =
        normalizeVn(r.label) === normalizeVn(item.label) ||
        (normRLabel === normItemLabel &&
          Math.hypot(r.coords[0] - item.coords[0], r.coords[1] - item.coords[1]) < 0.004);
      return sameLabel;
    });
    if (!isDuplicate) {
      unique.push(item);
    }
  }

  const finalResults = unique
    .map((item, idx) => ({
      item,
      // Giữ điểm nền (20) cho mọi kết quả hợp lệ từ bộ giải mã địa lý trong phạm vi TP.HCM, ưu tiên độ khớp từ khóa cao nhất lên đầu
      score: Math.max(20, scorePlaceMatch(clean, item)) - idx * 0.1,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((entry) => entry.item);

  if (finalResults.length > 0) {
    placeSearchCache.set(cacheKey, finalResults);
    placeSearchCache.set(`commit:${normalizeVn(clean)}`, finalResults);
  }
  return finalResults;
}

export async function fetchMapPointsApi(
  rainMm?: number,
  mode: "realtime" | "history" = "realtime",
): Promise<MapFloodPoint[]> {
  const query = new URLSearchParams();
  if (rainMm !== undefined) query.set("rainMm", String(rainMm));
  if (mode) query.set("mode", mode);
  query.set("excludeReports", "true");

  try {
    const pointsRes = await fetch(`${API_BASE}/map/points?${query.toString()}`);
    if (pointsRes.ok) {
      const data = await pointsRes.json();
      if (Array.isArray(data)) {
        // Chỉ lấy điểm quan trắc / mô hình thủy văn thời gian thực (loại trừ hoàn toàn báo cáo người dùng)
        const pureHydrologicalPoints: MapFloodPoint[] = (data as MapFloodPoint[]).filter(
          (pt) =>
            !(pt as any).linkedReportId &&
            !pt.id.startsWith("p_RP-") &&
            !pt.id.startsWith("report-"),
        );

        // Đăng ký các địa điểm vào search pool
        registerDynamicPlaces(
          pureHydrologicalPoints.map((pt) => ({
            label: pt.district ? `${pt.label} · ${pt.district}` : pt.label,
            address: `${pt.label}, ${pt.district || "TP. Hồ Chí Minh"}`,
            district: pt.district || "TP. Hồ Chí Minh",
            coords: [pt.lng, pt.lat],
          })),
        );

        // Chế độ thời gian thực: chỉ hiển thị điểm có nguy cơ ngập thực tế (depth > 0)
        if (mode === "realtime") {
          return pureHydrologicalPoints.filter((pt) => (pt.depth || 0) > 0);
        }
        return pureHydrologicalPoints;
      }
    }
  } catch {
    // Fallback suy luận trực tiếp tại Client
  }

  // Thuật toán suy luận chẩn đoán thời gian thực (Client-side AI Inference)
  const allHotspots = defaultHotspots as any[];

  // Luôn nạp 250 tuyến đường vào bộ gợi ý tìm kiếm
  registerDynamicPlaces(
    allHotspots.map((pt) => ({
      label: pt.district ? `${pt.label} · ${pt.district}` : pt.label,
      address: `${pt.label}, ${pt.district || "TP. Hồ Chí Minh"}`,
      district: pt.district || "TP. Hồ Chí Minh",
      coords: [pt.lng, pt.lat],
    })),
  );

  // 1. Chế độ xem toàn bộ 250 điểm đen lịch sử 2002-2026
  if (mode === "history") {
    return allHotspots.map((h) => ({
      id: h.id,
      lat: h.lat,
      lng: h.lng,
      label: h.label,
      district: h.district,
      type: "flood",
      severity: h.severity,
      depth: h.depth ?? 0,
      rainfall: 0,
      historyCount: h.historyCount ?? 1,
    }));
  }

  // 2. Chế độ chẩn đoán thời gian thực theo lượng mưa thực tế (Thuật toán Thủy văn & Địa hình thực tế)
  const actualRain = rainMm ?? 0;
  const vnDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const vnHour = vnDate.getHours();
  const vnMinute = vnDate.getMinutes();
  const timeDecimal = vnHour + vnMinute / 60;
  const isTidePeak =
    (timeDecimal >= 16.5 && timeDecimal <= 19.5) || (timeDecimal >= 4.5 && timeDecimal <= 7.5);

  // Nếu trời khô ráo (mưa < 3mm) và ngoài giờ triều cường: ĐƯỜNG KHÔ RÁO HOÀN TOÀN!
  if (actualRain < 3 && !isTidePeak) {
    return [];
  }

  const predictedPoints: MapFloodPoint[] = [];

  for (const h of allHotspots) {
    const elevation = h.elevationM || 2.0;
    const terrainFactor =
      elevation <= 1.4
        ? 1.45
        : elevation <= 1.8
          ? 1.3
          : elevation <= 2.5
            ? 1.15
            : elevation <= 4.0
              ? 1.0
              : 0.8;

    const histCount = h.historyCount || 5;
    const histFactor = 1 + Math.min(0.35, histCount * 0.015);
    const effectiveRain = actualRain * terrainFactor * histFactor;
    const threshold = h.rainfallThresholdMm || 35;

    const cleanDistrict = (h.district || "").toLowerCase();
    let tideDepth = 0;
    const isRiversideLowland =
      elevation <= 1.6 &&
      (cleanDistrict.includes("7") ||
        cleanDistrict.includes("nhà bè") ||
        cleanDistrict.includes("bình thạnh") ||
        cleanDistrict.includes("thủ đức") ||
        cleanDistrict.includes("8") ||
        cleanDistrict.includes("4"));

    if (isTidePeak && isRiversideLowland) {
      const tidePeakHeight =
        (timeDecimal >= 17 && timeDecimal <= 18.5) || (timeDecimal >= 5 && timeDecimal <= 6.5)
          ? 1.68
          : 1.58;
      tideDepth = Math.max(0, Math.round((tidePeakHeight - elevation) * 70));
    }

    const isRainFlooded = actualRain >= 5 && effectiveRain >= threshold;
    const isTideFlooded = tideDepth >= 15;
    const isAtRisk =
      !isRainFlooded &&
      !isTideFlooded &&
      ((actualRain >= 3 && effectiveRain >= threshold * 0.65) || tideDepth >= 10);

    if (!isRainFlooded && !isTideFlooded && !isAtRisk) continue;

    let dynamicDepth = 0;
    let calculatedType: "flood" | "risk" = "risk";

    if (isRainFlooded || isTideFlooded) {
      calculatedType = "flood";
      if (isRainFlooded) {
        const rainDepth = Math.round((effectiveRain - threshold) * 0.85 + 15);
        dynamicDepth = Math.max(15, rainDepth + Math.round(tideDepth * 0.5));
      } else {
        dynamicDepth = Math.max(16, tideDepth + 10);
      }
      const maxLimit = h.depth && h.depth > 20 ? h.depth : 65;
      dynamicDepth = Math.min(maxLimit, dynamicDepth);
    } else if (isAtRisk) {
      calculatedType = "risk";
      dynamicDepth = 0;
    }

    const severity = dynamicDepth >= 35 ? "critical" : dynamicDepth >= 20 ? "high" : "medium";

    predictedPoints.push({
      id: h.id,
      lat: h.lat,
      lng: h.lng,
      label: h.label,
      district: h.district,
      type: calculatedType,
      severity,
      depth: dynamicDepth,
      rainfall: actualRain,
    });
  }

  return predictedPoints;
}

export async function fetchCurrentWeather(): Promise<WeatherSnapshot | null> {
  try {
    const res = await fetch(`${API_BASE}/weather/current`);
    if (res.ok) {
      return (await res.json()) as WeatherSnapshot;
    }
  } catch {
    // ignore
  }

  try {
    const real = await fetchFullRealWeather(10.7769, 106.7009, "Hồ Chí Minh");
    if (!real.live) throw new Error("Weather unavailable");
    const rainNow = real.currentRainMm ?? 0;
    return {
      provider: "Open-Meteo",
      locationName: real.locationName,
      temperatureC: real.tempC,
      humidityPercent: real.humidityPercent,
      windSpeedKmh: real.windSpeedKmh,
      currentRainMm: rainNow,
      weatherCondition: real.condition,
      floodRiskLevel: rainNow > 15 ? "Cao" : rainNow > 5 ? "Trung bình" : "Thấp",
    };
  } catch {
    return null;
  }
}

export async function syncWeatherForecasts(): Promise<ForecastSlot[] | null> {
  try {
    const res = await fetch(`${API_BASE}/weather/sync-forecasts`, {
      method: "POST",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.slots) ? (data.slots as ForecastSlot[]) : null;
  } catch {
    return null;
  }
}

export async function fetchForecastSlots(): Promise<{
  slots: ForecastSlot[];
  live: boolean;
}> {
  try {
    const res = await fetch(`${API_BASE}/journey/forecasts`);
    if (res.ok) {
      const data = (await res.json()) as ForecastSlot[];
      if (Array.isArray(data) && data.length > 0) {
        // Loại bỏ nếu dữ liệu là mock 34mm cũ
        const hasLegacyMock = data.some(
          (s) => s.id === "30" && (s.rain === "34 mm" || (s as any).rainMm === 34),
        );
        if (!hasLegacyMock) {
          return { slots: data, live: true };
        }
      }
    }
  } catch {
    // ignore backend error
  }

  // Fallback: Gọi trực tiếp Open-Meteo API thời gian thực trên client (dùng minutely_15 thực tế, không nội suy)
  try {
    const real = await fetchFullRealWeather(10.7769, 106.7009, "Hồ Chí Minh");
    if (!real.live) throw new Error("Weather unavailable");
    const hourly = real.hourly || [];
    const [nowRain, slot30Rain, slot60Rain, slot90Rain] = real.minutely15Slots ?? [
      Math.round((real.currentRainMm ?? hourly[0]?.rainMm ?? 0) * 10) / 10,
      Math.round((hourly[1]?.rainMm ?? 0) * 10) / 10,
      Math.round((hourly[2]?.rainMm ?? 0) * 10) / 10,
      Math.round((hourly[3]?.rainMm ?? 0) * 10) / 10,
    ];

    const calcRisk = (rain: number): { risk: string; zone: 0 | 1 | 2 } => {
      if (rain >= 45) return { risk: "Rất cao", zone: 2 };
      if (rain >= 25) return { risk: "Cao", zone: 1 };
      if (rain >= 10) return { risk: "Trung bình", zone: 1 };
      return { risk: "Thấp", zone: 0 };
    };

    const rNow = calcRisk(nowRain);
    const r30 = calcRisk(slot30Rain);
    const r60 = calcRisk(slot60Rain);
    const r90 = calcRisk(slot90Rain);

    const slots: ForecastSlot[] = [
      {
        id: "now",
        label: "Hiện tại",
        rain: `${nowRain} mm`,
        risk: rNow.risk,
        zone: rNow.zone,
      },
      {
        id: "30",
        label: "+30 phút",
        rain: `${slot30Rain} mm`,
        risk: r30.risk,
        zone: r30.zone,
      },
      {
        id: "60",
        label: "+60 phút",
        rain: `${slot60Rain} mm`,
        risk: r60.risk,
        zone: r60.zone,
      },
      {
        id: "90",
        label: "+90 phút",
        rain: `${slot90Rain} mm`,
        risk: slot90Rain < slot60Rain && slot60Rain >= 10 ? "Giảm dần" : r90.risk,
        zone: r90.zone,
      },
    ];

    return { slots, live: true };
  } catch {
    return {
      slots: [
        { id: "now", label: "Hiện tại", rain: "0 mm", risk: "Thấp", zone: 0 },
        { id: "30", label: "+30 phút", rain: "0 mm", risk: "Thấp", zone: 0 },
        { id: "60", label: "+60 phút", rain: "0 mm", risk: "Thấp", zone: 0 },
        { id: "90", label: "+90 phút", rain: "0 mm", risk: "Thấp", zone: 0 },
      ],
      live: false,
    };
  }
}

export async function fetchJourneyRoutes(
  originCoords: [number, number],
  destCoords: [number, number],
  floodPoints: MapFloodPoint[] = [],
  vehicleMode: VehicleMode = "motorcycle",
): Promise<{
  routes: Record<RouteId, RouteItem>;
  navigationSteps: NavigationStep[];
  live: boolean;
}> {
  // 1. Đối với xe máy (motorcycle): Ưu tiên gọi Backend NestJS API (profile bike) để định tuyến men theo từng khúc cua của con hẻm tại TP.HCM
  if (vehicleMode === "motorcycle") {
    try {
      const query = `fromLat=${originCoords[1]}&fromLng=${originCoords[0]}&toLat=${destCoords[1]}&toLng=${destCoords[0]}&mode=motorcycle`;
      const computeRes = await fetch(`${API_BASE}/journey/compute-route?${query}`);
      if (computeRes.ok) {
        const computed = await computeRes.json();
        if (
          computed?.provider !== "database-fallback" &&
          Array.isArray(computed?.safeRoute?.coordinates) &&
          computed.safeRoute.coordinates.length > 2
        ) {
          return {
            routes: {
              safe: computed.safeRoute,
              balanced: computed.balancedRoute ?? computed.safeRoute,
            },
            navigationSteps: computed.safeRoute.navigationSteps ?? [],
            live: true,
          };
        }
      }
    } catch (err) {
      console.warn("Backend motorcycle alley routing error, trying fallback:", err);
    }
  } else {
    // Với ô tô (car): Dùng Google Maps Directions Service lọc né ngập
    try {
      const googleRes = await computeRouteWithGoogle(
        originCoords,
        destCoords,
        floodPoints,
        vehicleMode,
      );
      if (
        googleRes &&
        Array.isArray(googleRes.safeRoute?.coordinates) &&
        googleRes.safeRoute.coordinates.length > 1
      ) {
        return {
          routes: {
            safe: googleRes.safeRoute,
            balanced: googleRes.balancedRoute ?? {
              ...googleRes.safeRoute,
              id: "balanced",
              name: `Tuyến dự phòng (${vehicleMode === "car" ? "Ô tô" : "Xe máy"})`,
              badge: "Dự phòng",
            },
          },
          navigationSteps: googleRes.navigationSteps,
          live: true,
        };
      }
    } catch (err) {
      console.warn("Google Maps directions error, falling back:", err);
    }
  }

  // 2. Dự phòng qua Backend NestJS API
  try {
    const query = `fromLat=${originCoords[1]}&fromLng=${originCoords[0]}&toLat=${destCoords[1]}&toLng=${destCoords[0]}&mode=${vehicleMode}`;
    const computeRes = await fetch(`${API_BASE}/journey/compute-route?${query}`);
    if (computeRes.ok) {
      const computed = await computeRes.json();
      if (
        computed?.provider !== "database-fallback" &&
        Array.isArray(computed?.safeRoute?.coordinates) &&
        computed.safeRoute.coordinates.length > 2
      ) {
        return {
          routes: {
            safe: computed.safeRoute,
            balanced: computed.balancedRoute ?? computed.safeRoute,
          },
          navigationSteps: computed.safeRoute.navigationSteps ?? [],
          live: true,
        };
      }
    }
  } catch {
    // fallback to browser OSRM
  }

  // 3. Dự phòng trực tiếp OSRM từ trình duyệt có hỗ trợ phân ngả đường thay thế (alternatives)
  try {
    const modeLabel = vehicleMode === "car" ? "Ô tô" : "Xe máy";
    const osrmProfile = vehicleMode === "car" ? "driving" : "bike";
    const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?steps=true&geometries=geojson&overview=full&alternatives=true`;
    const res = await fetch(osrmUrl);
    if (res.ok) {
      const data = await res.json();
      const routesList: any[] = data?.routes || [];
      const primaryRoute = routesList[0];

      if (primaryRoute) {
        const rawCoords: number[][] = [...(primaryRoute.geometry?.coordinates ?? [])];

        // Đo khoảng cách snap từ vị trí GPS trong hẻm ra trục đường gần nhất
        const snapDist =
          rawCoords.length > 0
            ? Math.round(
                6371000 *
                  2 *
                  Math.asin(
                    Math.sqrt(
                      Math.sin(((rawCoords[0][1] - originCoords[1]) * Math.PI) / 360) ** 2 +
                        Math.cos((originCoords[1] * Math.PI) / 180) *
                          Math.cos((rawCoords[0][1] * Math.PI) / 180) *
                          Math.sin(((rawCoords[0][0] - originCoords[0]) * Math.PI) / 360) ** 2,
                    ),
                  ),
              )
            : 0;

        // Giữ trọn vẹn từng khúc rẽ trong hẻm, không vẽ đường chim bay đâm xuyên nhà

        const rawSteps: any[] = primaryRoute.legs?.[0]?.steps ?? [];
        const mainSteps: NavigationStep[] = [];
        for (const s of rawSteps) {
          const isArrive = s.maneuver?.type === "arrive";
          if (!isArrive && !s.name && (s.distance ?? 0) <= 15) continue;

          const modifier: string = s.maneuver?.modifier || "";
          const icon = isArrive
            ? "straight"
            : modifier.includes("left")
              ? "turn-left"
              : modifier.includes("right")
                ? "turn-right"
                : "straight";
          const instruction = isArrive
            ? "Đến điểm đích tại"
            : icon === "turn-left"
              ? "Rẽ trái vào"
              : icon === "turn-right"
                ? "Rẽ phải vào"
                : "Đi theo";
          const distM = isArrive ? 0 : Math.max(20, Math.round(s.distance ?? 100));
          const streetName = s.name || (isArrive ? "Điểm đến đã chọn" : "Trục đường chính");
          const loc = Array.isArray(s.maneuver?.location)
            ? ([Number(s.maneuver.location[0]), Number(s.maneuver.location[1])] as [number, number])
            : undefined;

          const prev = mainSteps[mainSteps.length - 1];
          if (
            !isArrive &&
            prev &&
            prev.icon === "straight" &&
            icon === "straight" &&
            prev.street === streetName
          ) {
            const combined = (prev.distanceMeters ?? 0) + distM;
            prev.distanceMeters = combined;
            prev.distance = `${combined} m`;
            continue;
          }

          mainSteps.push({
            icon,
            instruction,
            street: streetName,
            distance: `${distM} m`,
            distanceMeters: distM,
            ...(loc ? { coords: loc } : {}),
          });
        }

        // Chỉ dẫn bước đầu tiên đi từ trong hẻm ra đường lớn
        const steps: NavigationStep[] = [];
        if (snapDist > 8) {
          const firstRoad = rawSteps[0]?.name || mainSteps[0]?.street || "trục đường chính";
          steps.push({
            icon: "straight",
            instruction:
              vehicleMode === "motorcycle"
                ? "Từ vị trí trong hẻm, đi thẳng ra"
                : "Từ hẻm nhỏ, đi ra đón xe tại",
            street: `${firstRoad} (${snapDist} m)`,
            distance: `Trong ${snapDist} m`,
            distanceMeters: snapDist,
            coords: originCoords,
          });
        }
        steps.push(...mainSteps);

        // Tính toán tốc độ di chuyển theo phương tiện: Xe máy (~32 km/h) vs Ô tô (~40 km/h)
        const speedFactor = vehicleMode === "motorcycle" ? 1.05 : 0.95;
        const baseDurationSec = Math.round((primaryRoute.duration ?? 600) * speedFactor);
        const durationMinutes = Math.max(1, Math.round(baseDurationSec / 60));
        const distanceKm = ((primaryRoute.distance ?? 3000) / 1000).toFixed(1).replace(".", ",");

        const safeRoute: RouteItem = {
          id: "safe",
          name: `Tuyến đề xuất (${modeLabel})`,
          time: `${durationMinutes} phút`,
          distance: `${distanceKm} km`,
          badge: "Nhanh nhất",
          detail: `Lộ trình ${modeLabel} (${distanceKm} km, khoảng ${durationMinutes} phút di chuyển).`,
          coordinates: rawCoords,
        };

        // Xử lý Tuyến dự phòng: Đảm bảo có số km, thời gian và tọa độ KHÁC BIỆT
        let balancedRoute: RouteItem;
        const secondaryRoute = routesList[1];

        if (secondaryRoute && secondaryRoute.duration !== primaryRoute.duration) {
          const secDurationSec = Math.round((secondaryRoute.duration ?? 700) * speedFactor);
          const secMinutes = Math.max(1, Math.round(secDurationSec / 60));
          const secDistanceKm = ((secondaryRoute.distance ?? 3300) / 1000)
            .toFixed(1)
            .replace(".", ",");
          const secCoords: number[][] = [...(secondaryRoute.geometry?.coordinates ?? [])];
          if (snapDist > 5) secCoords.unshift(originCoords);

          balancedRoute = {
            id: "balanced",
            name: `Tuyến dự phòng (${modeLabel})`,
            time: `${secMinutes} phút`,
            distance: `${secDistanceKm} km`,
            badge: "Dự phòng",
            detail: `Lộ trình phụ (${secDistanceKm} km, khoảng ${secMinutes} phút).`,
            coordinates: secCoords,
          };
        } else {
          balancedRoute = {
            ...safeRoute,
            id: "balanced",
            name: `Tuyến dự phòng (${modeLabel})`,
            badge: "Dự phòng",
          };
        }

        return {
          routes: {
            safe: safeRoute,
            balanced: balancedRoute,
          },
          navigationSteps: steps,
          live: true,
        };
      }
    }
  } catch {
    // ignore
  }

  return {
    routes: {
      safe: { ...EMPTY_ROUTES.safe },
      balanced: { ...EMPTY_ROUTES.balanced },
    },
    navigationSteps: [],
    live: false,
  };
}

export interface FloodAiAnalysis {
  hasFlooding: boolean;
  estimatedDepthCm: number | null;
  reportType: "flood" | "drain";
  severity: "critical" | "high" | "medium" | "low";
  evidenceStatus?: "clear" | "uncertain" | "insufficient_evidence";
  weatherCondition: string | null;
  drainStatus: string | null;
  visual: "street" | "drain" | "traffic" | "night";
  confidence: number | null;
  aiSummary: string;
  recommendation: string;
  provider: string;
}

export async function analyzeReportImageApi(payload: {
  image: string;
  location?: string;
  description?: string;
}): Promise<FloodAiAnalysis | null> {
  try {
    const res = await fetch(`${API_BASE}/reports/analyze-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object" && "hasFlooding" in data) {
        return data as FloodAiAnalysis;
      }
    }
  } catch {
    // Không tự phát sinh dữ liệu giả khi API không phản hồi
  }
  return null;
}

async function snapCoordinateToRoad(
  lat?: number,
  lng?: number,
  location?: string,
): Promise<{ lat?: number; lng?: number }> {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return { lat, lng };
  }
  const targetNorm = normalizeVn(location || "").replace(/^(duong|hem|nga tu|cau)\s+/, "");
  try {
    const res = await fetch(
      `https://router.project-osrm.org/nearest/v1/driving/${lng},${lat}?number=15`,
      { signal: AbortSignal.timeout(1500) },
    );
    if (res.ok) {
      const data = await res.json();
      const waypoints: any[] = Array.isArray(data?.waypoints) ? data.waypoints : [];
      if (waypoints.length > 0) {
        if (targetNorm) {
          const matched = waypoints.find((wp) => {
            const wn = normalizeVn(wp?.name || "").replace(/^(duong|hem|nga tu|cau)\s+/, "");
            return wn && (wn.includes(targetNorm) || targetNorm.includes(wn));
          });
          if (matched && Array.isArray(matched.location)) {
            return { lng: matched.location[0], lat: matched.location[1] };
          }
        }
        const first = waypoints[0];
        if (Array.isArray(first?.location) && (first.distance ?? 999) <= 80) {
          return { lng: first.location[0], lat: first.location[1] };
        }
      }
    }
  } catch {
    // ignore network/timeout and keep original coords
  }
  return { lat, lng };
}

export type CitizenReportResult = {
  id: string;
  status?: string;
  aiDepth?: number;
  aiConfidence?: number;
  reportedDepth?: number;
  estimatedDurationMin?: number;
  estimatedClearAt?: string;
  drainageRateCmPerMin?: number;
  location?: string;
  district?: string;
  mapPoint?: MapFloodPoint;
};

export async function createCitizenReport(payload: {
  reportType: ReportType;
  severity: Severity;
  photoUrl?: string;
  location?: string;
  district?: string;
  description?: string;
  reportedDepth?: number;
  aiDepth?: number;
  aiConfidence?: number;
  visual?: "street" | "drain" | "traffic" | "night";
  lat?: number;
  lng?: number;
  reporterId?: string;
  aiSummary?: string;
  recommendation?: string;
}): Promise<CitizenReportResult | null> {
  const snapped = await snapCoordinateToRoad(payload.lat, payload.lng, payload.location);
  const finalPayload = {
    ...payload,
    lat: snapped.lat ?? payload.lat,
    lng: snapped.lng ?? payload.lng,
  };
  try {
    const res = await fetch(`${API_BASE}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalPayload),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Không tự tạo báo cáo giả nếu mất kết nối máy chủ
  }
  return null;
}

export const HCM_DISTRICT_COORDS: Array<{ name: string; lat: number; lng: number }> = [
  { name: "Quận 1", lat: 10.7756, lng: 106.7004 },
  { name: "Quận 3", lat: 10.7844, lng: 106.6844 },
  { name: "Quận 4", lat: 10.7578, lng: 106.7013 },
  { name: "Quận 5", lat: 10.754, lng: 106.6634 },
  { name: "Quận 6", lat: 10.7481, lng: 106.6352 },
  { name: "Quận 7", lat: 10.734, lng: 106.7218 },
  { name: "Quận 8", lat: 10.7241, lng: 106.6286 },
  { name: "Quận 10", lat: 10.7716, lng: 106.6672 },
  { name: "Quận 11", lat: 10.763, lng: 106.6502 },
  { name: "Quận 12", lat: 10.8672, lng: 106.6413 },
  { name: "Bình Thạnh", lat: 10.8106, lng: 106.7091 },
  { name: "Gò Vấp", lat: 10.8387, lng: 106.6653 },
  { name: "Phú Nhuận", lat: 10.7992, lng: 106.6803 },
  { name: "Tân Bình", lat: 10.8015, lng: 106.6526 },
  { name: "Tân Phú", lat: 10.7901, lng: 106.628 },
  { name: "Bình Tân", lat: 10.7653, lng: 106.6047 },
  { name: "TP. Thủ Đức", lat: 10.8494, lng: 106.7717 },
  { name: "Nhà Bè", lat: 10.6953, lng: 106.7287 },
  { name: "Bình Chánh", lat: 10.6874, lng: 106.5938 },
  { name: "Hóc Môn", lat: 10.8839, lng: 106.5934 },
  { name: "Củ Chi", lat: 10.9731, lng: 106.4938 },
  { name: "Cần Giờ", lat: 10.4114, lng: 106.8642 },
];

export function getClosestHcmDistrict(lat: number, lng: number): string {
  let closest = HCM_DISTRICT_COORDS[0];
  let minD = Infinity;
  for (const d of HCM_DISTRICT_COORDS) {
    const dist = (d.lat - lat) ** 2 + (d.lng - lng) ** 2;
    if (dist < minD) {
      minD = dist;
      closest = d;
    }
  }
  return closest.name;
}

export async function reverseGeocodeApi(
  lat: number,
  lng: number,
): Promise<{ location: string; district: string; coords: [number, number] }> {
  const fallbackDistrict = getClosestHcmDistrict(lat, lng);

  // 1. Ưu tiên ArcGIS Reverse Geocoding trực tiếp từ trình duyệt (Nhanh < 250ms, chính xác từng số nhà & hẻm TP.HCM)
  try {
    const arcRes = await fetch(
      `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${lng},${lat}&f=json&langCode=vi`,
      { signal: AbortSignal.timeout(2500) },
    );
    if (arcRes.ok) {
      const arcData = await arcRes.json();
      const addr = arcData?.address;
      if (addr) {
        const street = (addr.Address || addr.Street || addr.Match_addr?.split(",")[0] || "").trim();
        const ward = (addr.Neighborhood || addr.Sector || "").trim();
        const rawDist = (addr.District || addr.City || addr.Subregion || "").trim();
        const district =
          !rawDist ||
          rawDist === "Hồ Chí Minh" ||
          rawDist === "Thành phố Hồ Chí Minh" ||
          rawDist.toLowerCase().startsWith("phường")
            ? fallbackDistrict
            : rawDist;
        const parts = [street, ward, district].filter(
          (p, i, arr) => Boolean(p) && arr.indexOf(p) === i,
        );
        if (parts.length > 0) {
          return {
            location: parts.slice(0, 2).join(", "),
            district,
            coords: [lng, lat],
          };
        }
      }
    }
  } catch {
    // ignore and try backend / Nominatim
  }

  // 2. Thử gọi Backend API
  try {
    const res = await fetch(`${API_BASE}/map/geocode/reverse?lat=${lat}&lng=${lng}`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.location && !data.location.includes("Bà Huyện Thanh Quan")) {
        return {
          location: data.location,
          district: data.district || fallbackDistrict,
          coords: [lng, lat],
        };
      }
    }
  } catch {
    // ignore
  }

  // 3. Dự phòng Nominatim OpenStreetMap trực tiếp
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: { "Accept-Language": "vi" },
        signal: AbortSignal.timeout(2500),
      },
    );
    if (nomRes.ok) {
      const data = await nomRes.json();
      const addr = data.address || {};
      const road = [addr.house_number, addr.road].filter(Boolean).join(" ").trim();
      const ward = addr.suburb || addr.quarter || addr.neighbourhood || "";
      let district = addr.city_district || addr.district || addr.county || "";
      if (
        !district ||
        district === "Thành phố Hồ Chí Minh" ||
        district === "TP.HCM" ||
        district.toLowerCase().startsWith("phường") ||
        district.toLowerCase().startsWith("xã")
      ) {
        district = fallbackDistrict;
      }

      let location = "";
      if (road && ward) {
        location = `${road}, ${ward}`;
      } else if (road) {
        location = road;
      } else if (ward) {
        location = `${ward}, ${district}`;
      } else {
        location = `${district}, TP.HCM`;
      }

      return {
        location,
        district,
        coords: [lng, lat],
      };
    }
  } catch {
    // ignore and try Backend
  }

  // 3. Dự phòng gọi qua Backend /api/map/geocode/reverse
  try {
    const res = await fetch(`${API_BASE}/map/geocode/reverse?lat=${lat}&lng=${lng}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      const isNearSguCs1 = Math.abs(lat - 10.779) < 0.005 && Math.abs(lng - 106.6836) < 0.005;
      if (data?.location && (data.location !== "105 Bà Huyện Thanh Quan" || isNearSguCs1)) {
        const rawDist = String(data.district || "");
        const district =
          !rawDist || rawDist.toLowerCase().startsWith("phường") ? fallbackDistrict : rawDist;
        return {
          location: data.location,
          district,
          coords: [lng, lat],
        };
      }
    }
  } catch {
    // ignore
  }

  return {
    location: `Khu vực ${fallbackDistrict}`,
    district: fallbackDistrict,
    coords: [lng, lat],
  };
}

export async function fetchActiveAlertsApi(): Promise<AreaAlertItem[]> {
  try {
    const res = await fetch(`${API_BASE}/alerts`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data)
      ? (data as AreaAlertItem[]).filter((a) => a.status === "active")
      : [];
  } catch {
    return [];
  }
}

const SAVED_ROUTES_KEY = "saigondrain_saved_routes";

export function getSavedRoutes(): SavedRoutePair[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_ROUTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedRoutePair[]) : [];
  } catch {
    return [];
  }
}

export function saveRoutePair(origin: RouteEndpoint, destination: RouteEndpoint): SavedRoutePair[] {
  const current = getSavedRoutes();
  const name = `${origin.label.split("·")[0].trim()} → ${destination.label.split("·")[0].trim()}`;
  const exists = current.some(
    (item) => item.origin.label === origin.label && item.destination.label === destination.label,
  );
  if (exists) return current;
  const next: SavedRoutePair[] = [
    {
      id: `sr-${Date.now()}`,
      name,
      origin,
      destination,
    },
    ...current,
  ].slice(0, 6);
  try {
    window.localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function removeSavedRoutePair(id: string): SavedRoutePair[] {
  const next = getSavedRoutes().filter((item) => item.id !== id);
  try {
    window.localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

const AUTH_STORAGE_KEY = "saigondrain_auth_user";
const TOKEN_STORAGE_KEY = "saigondrain_auth_token";

export function getSavedAuthUser(): CommunityUserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CommunityUserProfile;
  } catch {
    return null;
  }
}

export function saveAuthSession(user: CommunityUserProfile, token?: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // ignore storage errors
  }
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export async function registerUserApi(payload: {
  name: string;
  phone: string;
  email: string;
  district: string;
  password: string;
}): Promise<{
  ok: boolean;
  message: string;
  user?: CommunityUserProfile;
  token?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data?.message)
        ? data.message[0]
        : data?.message || "Đăng ký không thành công.";
      return { ok: false, message: msg };
    }
    return {
      ok: true,
      message: data?.message || "Đăng ký tài khoản thành công! Vui lòng đăng nhập để tiếp tục.",
      user: data.user as CommunityUserProfile,
      token: data.token,
    };
  } catch {
    return {
      ok: false,
      message: "Không thể kết nối máy chủ Backend để đăng ký.",
    };
  }
}

export async function loginUserApi(payload: { identifier: string; password: string }): Promise<{
  ok: boolean;
  message: string;
  user?: CommunityUserProfile;
  token?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = Array.isArray(data?.message)
        ? data.message[0]
        : data?.message || "Thông tin đăng nhập không chính xác.";
      return { ok: false, message: msg };
    }
    if (data?.user) {
      saveAuthSession(data.user as CommunityUserProfile, data.token);
    }
    return {
      ok: true,
      message: data?.message || "Đăng nhập thành công!",
      user: data.user as CommunityUserProfile,
      token: data.token,
    };
  } catch {
    return {
      ok: false,
      message: "Không thể kết nối máy chủ Backend để đăng nhập.",
    };
  }
}

export async function fetchCommunityReportsApi(query?: {
  status?: string;
  severity?: string;
  district?: string;
}): Promise<CommunityReport[]> {
  try {
    const params = new URLSearchParams();
    if (query?.status) params.set("status", query.status);
    if (query?.severity) params.set("severity", query.severity);
    if (query?.district && query.district !== "all") params.set("district", query.district);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/reports${qs}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((r: any) => {
          let lat: number | undefined;
          let lng: number | undefined;
          if (r.coordinates && r.coordinates.includes(",")) {
            const parts = r.coordinates.split(",").map((s: string) => Number(s.trim()));
            if (Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
              lat = parts[0];
              lng = parts[1];
            }
          }
          return {
            ...r,
            lat,
            lng,
          };
        });
      }
    }
  } catch {
    // fallback
  }
  return [];
}

export function subscribeUserRealtime(handlers: {
  onWeatherUpdated?: (data: { snapshot?: WeatherSnapshot; slots?: ForecastSlot[] }) => void;
  onRouteRecomputeNeeded?: () => void;
  onAlertsChanged?: () => void;
  onReportsChanged?: () => void;
}): () => void {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return () => undefined;
  }

  const es = new EventSource(`${API_BASE}/realtime/stream`);

  es.addEventListener("weather.updated", (ev: MessageEvent) => {
    try {
      const parsed = JSON.parse(ev.data);
      if (parsed?.data) handlers.onWeatherUpdated?.(parsed.data);
    } catch {
      // ignore parse errors
    }
  });

  for (const evt of [
    "report.created",
    "report.approved",
    "report.rejected",
    "alert.created",
    "alert.ended",
  ]) {
    es.addEventListener(evt, () => {
      handlers.onRouteRecomputeNeeded?.();
      handlers.onReportsChanged?.();
    });
  }

  for (const evt of ["alert.created", "alert.updated", "alert.ended"]) {
    es.addEventListener(evt, () => {
      handlers.onAlertsChanged?.();
    });
  }

  return () => {
    es.close();
  };
}
