export type IndexabilityInput = {
  listingCount: number;
  uniqueBusinesses: number;
  hasLocalCopy: boolean;
  overrideNoindex?: boolean | null;
};

export function isIndexable(input: IndexabilityInput) {
  if (input.overrideNoindex === true) return false;
  if (input.overrideNoindex === false) return true;
  return input.listingCount >= 3 && input.uniqueBusinesses >= 2;
}

export function robotsDirective(indexable: boolean) {
  return indexable ? "index,follow" : "noindex,follow";
}
