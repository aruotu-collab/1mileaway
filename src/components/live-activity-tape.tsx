import { ActivityTape } from "@/components/activity-tape";
import { siteActivityHeadlines, siteActivitySnapshot } from "@/lib/activity";
import { getRequestUi } from "@/lib/countries/request";
import { tapeCopy } from "@/lib/i18n/tape";

export async function LiveActivityTape() {
  const ui = await getRequestUi();
  const copy = tapeCopy(ui.language);
  const items = siteActivityHeadlines(await siteActivitySnapshot(), ui.language);
  return <ActivityTape key={ui.language} items={items} liveLabel={copy.live} ariaLabel={copy.aria} />;
}
