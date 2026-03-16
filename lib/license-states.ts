/**
 * State contractor license lookup URL templates.
 * V1 supports CA, FL, TX, NY, CO.
 */

const LICENSE_URLS: Record<string, (name: string) => string> = {
  CA: (name) =>
    `https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/CheckLicense.aspx?CheckLicenseType=Name&txtName=${encodeURIComponent(name)}`,
  FL: (name) =>
    `https://www.myfloridalicense.com/wl11.asp?mode=0&search=LicNbr&SID=&brd=&typ=&bureau=&LicSta=&LicNum=&Lic_Name=${encodeURIComponent(name)}&City=&County=&Zip=&myFlLicURL=wl11.asp`,
  TX: (name) =>
    `https://www.license.state.tx.us/LicenseeSearch/LicenseeSearch.aspx?SearchType=Name&SearchValue=${encodeURIComponent(name)}`,
  NY: (name) =>
    `https://www.dos.ny.gov/licensing/contractor/contractor_search.html?Name=${encodeURIComponent(name)}`,
  CO: (name) =>
    `https://apps2.colorado.gov/dora/licensing/lookup/licenselookup.aspx?last=${encodeURIComponent(name)}`,
};

/**
 * Parse a state abbreviation from a "City, ST" or "City, ST XXXXX" location string.
 */
function parseState(location: string): string | null {
  const match = location.trim().match(/,\s*([A-Z]{2})\b/);
  return match ? match[1] : null;
}

/**
 * Get a license lookup URL for a given location + contractor name.
 * Returns null if the state is not supported or cannot be parsed.
 */
export function getLicenseUrl(location: string, name: string): string | null {
  const state = parseState(location);
  if (!state) return null;
  const builder = LICENSE_URLS[state];
  if (!builder) return null;
  return builder(name);
}
