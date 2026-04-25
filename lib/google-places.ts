/**
 * Google Places API helpers for contractor enrichment.
 * All functions are best-effort and return null on any failure.
 *
 * Search uses the Places API (New) text search endpoint, which matches
 * Google Maps ranking. Details still use the legacy Details endpoint.
 */

const API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";
const NEW_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

interface NewPlaceResult {
  id: string;
  displayName: { text: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
}

interface PlaceDetailsResult {
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
}

async function newTextSearch(textQuery: string, maxResultCount = 5): Promise<NewPlaceResult[]> {
  if (!API_KEY) return [];
  console.log("[google-places] newTextSearch query", textQuery);

  const res = await fetch(NEW_TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({ textQuery, maxResultCount }),
  });
  console.log("[google-places] newTextSearch response status", res);
  if (!res.ok) return [];

  const json = (await res.json()) as { places?: NewPlaceResult[] };
  console.log("[google-places] newTextSearch results", json.places);
  return json.places ?? [];
}

/**
 * Simple name similarity check — returns true if the result name contains
 * at least one significant word from the query name (case-insensitive).
 */
function isConfidentMatch(queryName: string, resultName: string): boolean {
  const queryWords = queryName
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const resultLower = resultName.toLowerCase();
  return queryWords.some((w) => resultLower.includes(w));
}

/**
 * Search Google Places for a contractor by name + location.
 * Returns the place_id of the best match, or null if no confident match is found.
 */
export async function searchContractorPlace(
  name: string,
  location: string
): Promise<string | null> {
  if (!API_KEY) return null;

  try {
    const places = await newTextSearch(`${name} ${location}`, 5);
    if (!places.length) return null;

    const first = places[0];
    if (!isConfidentMatch(name, first.displayName.text)) return null;

    return first.id;
  } catch (err) {
    console.error("[google-places] searchContractorPlace error", err);
    return null;
  }
}

/**
 * Search Google Places and return up to 5 candidates without applying a confidence
 * filter — used by the Google Business Confirmation Modal so the user can pick the
 * right match themselves.
 */
export async function searchContractorCandidates(
  query: string,
  location: string
): Promise<import("@/types").GooglePlaceCandidate[]> {
  if (!API_KEY) return [];

  try {
    const textQuery = location ? `${query} ${location}` : query;
    const places = await newTextSearch(textQuery, 5);

    return places.map((p) => ({
      place_id: p.id,
      name: p.displayName.text,
      address: p.formattedAddress ?? null,
      rating: p.rating ?? null,
      reviewCount: p.userRatingCount ?? null,
    }));
  } catch (err) {
    console.error("[google-places] searchContractorCandidates error", err);
    return [];
  }
}

/**
 * Fetch place details for a given place_id.
 * Returns structured data or null on failure.
 */
export async function getPlaceDetails(
  placeId: string
): Promise<PlaceDetailsResult | null> {
  if (!API_KEY) return null;

  try {
    const fields =
      "name,formatted_address,formatted_phone_number,website,rating,user_ratings_total";
    const url = `${DETAILS_URL}?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = (await res.json()) as {
      status: string;
      result: {
        formatted_address?: string;
        formatted_phone_number?: string;
        website?: string;
        rating?: number;
        user_ratings_total?: number;
      };
    };

    if (json.status !== "OK" || !json.result) return null;

    const r = json.result;
    return {
      address: r.formatted_address ?? null,
      phone: r.formatted_phone_number ?? null,
      website: r.website ?? null,
      rating: r.rating ?? null,
      reviewCount: r.user_ratings_total ?? null,
    };
  } catch (err) {
    console.error("[google-places] getPlaceDetails error", err);
    return null;
  }
}
