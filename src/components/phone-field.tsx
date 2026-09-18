export function PhoneField({
  callingCode,
  name = "phone",
  defaultValue,
  placeholder,
  required,
}: {
  callingCode: string;
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <span
        className="inline-flex h-[3.25rem] shrink-0 items-center rounded-2xl border border-line bg-paper px-3 text-sm font-semibold tabular-nums text-ink"
        aria-hidden="true"
      >
        {callingCode}
      </span>
      <input
        className="min-w-0 w-full rounded-2xl border border-line bg-paper px-4 py-3"
        type="tel"
        name={name}
        autoComplete="tel-national"
        inputMode="tel"
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        aria-label="Phone number"
      />
    </div>
  );
}
