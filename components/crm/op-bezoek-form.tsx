"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ActionForm } from "@/components/crm/action-form";
import { FormSubmit } from "@/components/crm/form-submit";
import { saveOpBezoekAction } from "@/lib/crm/actions";

type JobOption = {
  id: string;
  titel: string;
};

const extraOptions = [
  { id: "isolatie", label: "Isolatie", price: 12 },
  { id: "goot_reiniging", label: "Gootreiniging", price: 6 },
  { id: "zinkwerk", label: "Zinkwerk", price: 18 },
];

export function OpBezoekForm({ jobs }: { jobs: JobOption[] }) {
  const [m2, setM2] = useState(0);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const totaal = useMemo(() => {
    const base = m2 * 45;
    const extrasTotal = selectedExtras.reduce((sum, id) => {
      const extra = extraOptions.find((item) => item.id === id);
      return sum + (extra?.price ?? 0) * m2;
    }, 0);
    return base + extrasTotal;
  }, [m2, selectedExtras]);

  return (
    <ActionForm action={saveOpBezoekAction} className="space-y-4">
      <select name="job_id" required className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm">
        <option value="">Selecteer job</option>
        {jobs.map((job) => (
          <option key={job.id} value={job.id}>
            {job.titel}
          </option>
        ))}
      </select>

      <div>
        <label className="mb-1 block text-sm font-medium text-primary">Oppervlakte (m²)</label>
        <input
          name="m2"
          type="number"
          min={0}
          value={m2}
          onChange={(event) => setM2(Number(event.target.value))}
          className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-primary">Extras</legend>
        {extraOptions.map((extra) => (
          <label key={extra.id} className="flex items-center gap-2 text-sm text-primary">
            <input
              type="checkbox"
              checked={selectedExtras.includes(extra.id)}
              onChange={(event) =>
                setSelectedExtras((current) =>
                  event.target.checked
                    ? [...current, extra.id]
                    : current.filter((item) => item !== extra.id),
                )
              }
            />
            {extra.label}
          </label>
        ))}
      </fieldset>

      <input type="hidden" name="extras" value={selectedExtras.join(",")} />
      <input type="hidden" name="totaal" value={totaal} />

      <div>
        <label className="mb-1 block text-sm font-medium text-primary">Fotos nemen</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            setPreviewUrls(files.map((file) => URL.createObjectURL(file)));
          }}
          className="w-full rounded-lg border border-blue-200 px-3 py-2 text-sm"
        />
        {previewUrls.length > 0 ? (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {previewUrls.map((url) => (
              <Image
                key={url}
                src={url}
                alt="Preview"
                width={120}
                height={80}
                unoptimized
                className="h-20 w-full rounded-md object-cover"
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-lg bg-blue-50 p-3">
        <p className="text-sm text-blue-700">Prijsindicatie</p>
        <p className="text-2xl font-semibold text-primary">EUR {totaal.toFixed(2)}</p>
      </div>

      <FormSubmit label="Werkbon opslaan" />
    </ActionForm>
  );
}
