import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth/session";
import { getCustomers } from "@/lib/db/customers";
import { QuoteGeneratorForm } from "./quote-generator-form";

export default async function GenerateQuotePage() {
  const session = await getAppSession();
  if (!session.isAuthenticated) redirect("/login");

  const customers = await getCustomers(session.companyId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <a href="/quotes" className="hover:text-gray-600 transition-colors">Offertes</a>
          <span>/</span>
          <span>AI Genereren</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">AI Offerte Generator</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Beschrijf de werkzaamheden en klantgegevens — AI genereert een professionele offerte
          met Nederlandse marktprijzen en BTW berekening.
        </p>
      </div>

      <QuoteGeneratorForm
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.customerType,
          address: c.billingAddress ?? undefined,
          city: c.billingCity ?? undefined,
          phone: c.phone ?? undefined,
          email: c.email ?? undefined,
        }))}
      />
    </div>
  );
}
