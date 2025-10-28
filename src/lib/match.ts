import { DEFAULT_MATCH_KEYWORDS } from "../config";

function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildSearchableText(title: string, tags: string[]): string {
  const normalizedTitle = normalize(title);
  const normalizedTags = tags.map(normalize).join(" ");

  return `${normalizedTitle} ${normalizedTags}`.trim();
}

export function isNerch(
  title: string,
  tags: string[],
  keywords: readonly string[] = DEFAULT_MATCH_KEYWORDS
): boolean {
  if (!title && tags.length === 0) {
    return false;
  }

  const searchable = buildSearchableText(title, tags);

  if (searchable.length === 0) {
    return false;
  }

  return keywords
    .map((keyword) => normalize(keyword))
    .filter((keyword) => keyword.length > 0)
    .some((keyword) => searchable.includes(keyword));
}
