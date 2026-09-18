export type MarketplaceStats = {
  totalCalls: number;
  callsLast7: number;
  callsLast30: number;
  asks: number;
  asksLast30: number;
  lastCallAt: Date | null;
  lastAskAt: Date | null;
  reviewCount: number;
  ratingAvg: number;
};

export function joinWithAnd(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export function unclaimedDemandCopy(input: {
  asks: number;
  asksLast30: number;
  trades: string[];
  areas: string[];
}) {
  const where = [joinWithAnd(input.trades), joinWithAnd(input.areas)].filter(Boolean);
  const appears = where.length
    ? `This listing already appears when people search ${where.join(" in ")}.`
    : "This listing is already live in local search.";
  if (input.asks <= 0) {
    return `${appears} Customers cannot tap Call now until it is claimed.`;
  }
  const recent =
    input.asksLast30 > 0 && input.asksLast30 !== input.asks
      ? ` ${input.asksLast30} of those were in the last 30 days.`
      : input.asksLast30 > 0
        ? " Those asks are from the last 30 days."
        : "";
  const noun = input.asks === 1 ? "customer has" : "customers have";
  return `${input.asks} ${noun} asked for this business on 1mileaway.${recent} They could not be connected because the listing is not claimed. ${appears}`;
}

export function callCountCopy(stats: Pick<MarketplaceStats, "totalCalls" | "callsLast7" | "callsLast30" | "lastCallAt">) {
  if (stats.totalCalls <= 0) {
    return "No customer has tapped Call now on this listing yet. Each tap through the web app is counted here.";
  }
  const last = stats.lastCallAt ? " The most recent tap is listed below." : "";
  return `${stats.totalCalls} customer ${stats.totalCalls === 1 ? "tap" : "taps"} of Call now through the web app.${last} We cannot see whether the phone was answered or how long you spoke — the customer's phone dials you directly.`;
}
