import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/prisma";
import { isDatabaseReady } from "@/lib/db/db-ready";
import { getAppSession } from "@/lib/auth/session";

type JobDetailPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function JobDetailPage(props: JobDetailPageProps) {
  const { jobId } = await props.params;

  if (!isDatabaseReady()) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-[var(--primary)]">Job detail</h1>
        <p className="mt-2 text-sm text-slate-600">
          Stel eerst `DATABASE_URL` in om jobdetails te laden.
        </p>
      </div>
    );
  }

  const session = await getAppSession();
  if (!session.isAuthenticated) {
    notFound();
  }

  const job = await db.job.findFirst({
    where: {
      id: jobId,
      companyId: session.companyId,
    },
    include: {
      customer: true,
      quote: true,
      assignments: {
        include: {
          user: true,
        },
      },
      photos: true,
      jobNotes: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!job) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-[var(--primary)]">{job.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{job.description ?? "Geen omschrijving"}</p>
        <p className="mt-2 text-sm text-slate-600">Adres: {job.address ?? "-"}</p>
        <p className="text-sm text-slate-600">Status: {job.status}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-[var(--primary)]">Klant</h2>
          <p className="mt-2 text-sm">{job.customer.name}</p>
          <p className="text-sm text-slate-600">{job.customer.phone ?? "-"}</p>
          <Link href="/customers" className="mt-3 inline-block text-sm text-[var(--accent)] hover:underline">
            Naar klanten
          </Link>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold text-[var(--primary)]">Offerte</h2>
          {job.quote ? (
            <>
              <p className="mt-2 text-sm">{job.quote.quoteNumber}</p>
              <p className="text-sm text-slate-600">{job.quote.status}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Geen gekoppelde offerte.</p>
          )}
          <Link href="/quotes" className="mt-3 inline-block text-sm text-[var(--accent)] hover:underline">
            Naar offertes
          </Link>
        </article>
      </section>
    </div>
  );
}
