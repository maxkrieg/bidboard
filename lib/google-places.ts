/**
 * Google Places API helpers for contractor enrichment.
 * All functions are best-effort and return null on any failure.
 */

const API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? "";
const TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

interface PlaceSearchResult {
  place_id: string;
  name: string;
}

interface PlaceDetailsResult {
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
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
    const query = `${name} ${location}`;
    const url = `${TEXT_SEARCH_URL}?query=${encodeURIComponent(query)}&key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = (await res.json()) as {
      status: string;
      results: PlaceSearchResult[];
    };

    if (json.status !== "OK" || !json.results.length) return null;

    const first = json.results[0];
    if (!isConfidentMatch(name, first.name)) return null;

    return first.place_id;
  } catch (err) {
    console.error("[google-places] searchContractorPlace error", err);
    return null;
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
