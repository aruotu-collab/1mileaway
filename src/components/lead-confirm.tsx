import { confirmLead, markLeadMissed } from "@/app/actions/calls";
import { LEAD_STATUS } from "@/lib/constants";

export function LeadConfirmActions({ leadId, status }: { leadId: string; status: string }) {
  if (status !== LEAD_STATUS.CREATED) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <form action={confirmLead}>
        <input type="hidden" name="leadId" value={leadId} />
        <button className="btn btn-primary" type="submit">
          This was a real job
        </button>
      </form>
      <form action={markLeadMissed}>
        <input type="hidden" name="leadId" value={leadId} />
        <button className="btn btn-ghost" type="submit">
          Missed or not a job
        </button>
      </form>
    </div>
  );
}
