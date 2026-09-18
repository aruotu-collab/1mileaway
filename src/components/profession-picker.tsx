import { groupedProfessions, type ProfessionPick } from "@/lib/professions";

export function ProfessionPicker({
  professions,
  name = "professionId",
  selectedIds = [],
}: {
  professions: ProfessionPick[];
  name?: string;
  selectedIds?: string[];
}) {
  const selected = new Set(selectedIds);
  return (
    <div className="max-h-80 overflow-y-auto rounded-2xl border border-line bg-paper p-3">
      {groupedProfessions(professions).map((group) => (
        <fieldset key={group.name} className="mb-4 last:mb-0">
          <legend className="px-1 text-sm font-semibold">{group.name}</legend>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            {group.items.map((profession) => (
              <label
                key={profession.id}
                className="flex cursor-pointer items-start gap-2 rounded-xl px-2 py-1.5 hover:bg-paper-strong"
              >
                <input
                  className="mt-1"
                  type="checkbox"
                  name={name}
                  value={profession.id}
                  defaultChecked={selected.has(profession.id)}
                />
                <span className="text-sm leading-snug">{profession.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
