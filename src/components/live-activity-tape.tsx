import { ActivityTape } from "@/components/activity-tape";
import { siteActivityHeadlines, siteActivitySnapshot } from "@/lib/activity";

export async function LiveActivityTape() {
  const items = siteActivityHeadlines(await siteActivitySnapshot());
  return <ActivityTape items={items} />;
}
