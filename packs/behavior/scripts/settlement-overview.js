export const MAX_SETTLEMENT_NAME_LENGTH = 24;

export function settlementName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!name || [...name].length > MAX_SETTLEMENT_NAME_LENGTH || /[\u0000-\u001f\u007f§]/u.test(name)) return null;
  return name;
}

export function biomeName(biome) {
  if (!biome || biome === "unknown") return "Unknown";
  return biome.replace(/^minecraft:/, "").replaceAll("_", " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

export function powerValue(census) {
  if (!census || census.error) return "Unavailable";
  if (census.realmPowerTenths === null) return `≥ ${(census.minimumPowerTenths / 10).toFixed(1)}`;
  return (census.realmPowerTenths / 10).toFixed(1);
}
