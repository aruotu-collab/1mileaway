import { prisma } from "@/lib/db";
import { startOfLocalDay } from "@/lib/utils";

export type ActivitySnapshot = {
  callsLastHour: number;
  callsTodayLocal: number;
  callsTodaySite: number;
  asksToday: number;
  availableNow: number;
  listingCount: number;
  professionName: string;
  professionPlural: string;
  locationName: string;
};

function countLabel(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function activityHeadlines(snap: ActivitySnapshot) {
  const trade = snap.professionPlural.toLowerCase();
  const one = snap.professionName.toLowerCase();
  const area = snap.locationName;
  const lines: string[] = [];

  if (snap.callsLastHour > 0) {
    lines.push(countLabel(snap.callsLastHour, "customer is ringing a tradesman now", "customers are ringing tradesmen now"));
  }
  if (snap.callsTodayLocal > 0) {
    lines.push(
      countLabel(snap.callsTodayLocal, `Call now tap in ${area} today`, `Call now taps in ${area} today`),
    );
  }
  if (snap.callsTodaySite > 0 && snap.callsTodaySite !== snap.callsTodayLocal) {
    lines.push(countLabel(snap.callsTodaySite, "Call now tap on 1mileaway today", "Call now taps on 1mileaway today"));
  }
  if (snap.asksToday > 0) {
    lines.push(countLabel(snap.asksToday, "tradesman was asked to take a job today", "tradesmen were asked to take a job today"));
  }
  if (snap.availableNow > 0) {
    lines.push(countLabel(snap.availableNow, `${one} recently available in ${area}`, `${trade} recently available in ${area}`));
  }
  if (snap.listingCount > 0) {
    lines.push(`${snap.listingCount} ${trade} serve ${area}`);
  }

  return lines;
}

export async function activitySnapshot(input: {
  countryId: string;
  timezone: string;
  professionId: string;
  locationId: string;
  professionName: string;
  professionPlural: string;
  locationName: string;
  availableNow: number;
  listingCount: number;
}): Promise<ActivitySnapshot> {
  const dayStart = startOfLocalDay(input.timezone);
  const hourStart = new Date(Date.now() - 60 * 60 * 1000);
  const [callsLastHour, callsTodayLocal, callsTodaySite, asksToday] = await Promise.all([
    prisma.call.count({ where: { startedAt: { gte: hourStart } } }),
    prisma.call.count({
      where: {
        startedAt: { gte: dayStart },
        lead: { is: { professionId: input.professionId, locationId: input.locationId } },
      },
    }),
    prisma.call.count({
      where: { startedAt: { gte: dayStart }, business: { countryId: input.countryId } },
    }),
    prisma.lead.count({
      where: {
        createdAt: { gte: dayStart },
        callId: null,
        professionId: input.professionId,
        locationId: input.locationId,
      },
    }),
  ]);

  return {
    callsLastHour,
    callsTodayLocal,
    callsTodaySite,
    asksToday,
    availableNow: input.availableNow,
    listingCount: input.listingCount,
    professionName: input.professionName,
    professionPlural: input.professionPlural,
    locationName: input.locationName,
  };
}
