/**
 * Automated Follow-Up Service
 *
 * 1. Queries customers with no job/quote activity in X days.
 * 2. Generates a personalised Dutch message per customer via OpenAI.
 * 3. Returns structured output ready for WhatsApp (wa.me URL) or email (mailto URL).
 *
 * No messages are sent — the service only prepares them.
 * Safe to call from both API routes and server actions.
 */

import OpenAI from "openai";
import { db } from "@/lib/db/prisma";

// ─── Public types ─────────────────────────────────────────────────────────────

export type FollowUpChannel = "whatsapp" | "email";

export type FollowUpCandidate = {
  customerId: string;
  customerName: string;
  customerType: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  /** Days since the last job or quote was created for this customer. */
  daysSinceContact: number;
  lastActivity: string | null; // ISO date string (serialisable)
  jobCount: number;
  quoteCount: number;
  /** AI-generated follow-up message. May be a fallback template if OpenAI is unavailable. */
  suggestedMessage: string;
  /** Ready-to-use WhatsApp deep-link (null if no phone number). */
  whatsappUrl: string | null;
  /** Ready-to-use mailto URL (null if no email address). */
  mailtoUrl: string | null;
  /** Which channel was chosen for this candidate. */
  channel: FollowUpChannel;
};

export type FollowUpOptions = {
  companyId: string;
  /** Customers inactive for at least this many days. Min 7, max 365. Default 30. */
  notContactedDays?: number;
  /** How many candidates to generate messages for. Min 1, max 10. Default 5. */
  limit?: number;
  /** Preferred channel. "both" picks WhatsApp when phone is available, else email. */
  channel?: FollowUpChannel | "both";
};

export type FollowUpResult = {
  ok: boolean;
  candidates: FollowUpCandidate[];
  /** Total number of inactive customers found (may be more than limit). */
  totalFound: number;
  notContactedDays: number;
  error?: string;
};

// ─── Phone normalisation ──────────────────────────────────────────────────────

/**
 * Converts a Dutch or international phone number to a digits-only string
 * suitable for a wa.me URL (e.g. "31612345678").
 */
function normalisePhone(raw: string): string | null {
  let n = raw.replace(/[\s\-().+]/g, "");
  if (n.startsWith("00")) n = "31" + n.slice(2);
  else if (n.startsWith("0")) n = "31" + n.slice(1);
  // Must be at least 10 digits after normalisation
  return /^\d{10,15}$/.test(n) ? n : null;
}

function buildWhatsAppUrl(phone: string | null, message: string): string | null {
  if (!phone) return null;
  const normalised = normalisePhone(phone);
  if (!normalised) return null;
  return `https://wa.me/${normalised}?text=${encodeURIComponent(message)}`;
}

function buildMailtoUrl(
  email: string | null,
  customerName: string,
  message: string,
): string | null {
  if (!email) return null;
  const subject = `Bericht van Berteck Dakwerken`;
  // Mailto body has a 2000-char practical limit in most clients
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message.slice(0, 1800))}`;
}

// ─── Fallback template (when OpenAI is unavailable for a specific customer) ───

function fallbackMessage(customer: {
  name: string;
  customerType: string;
  contactPerson: string | null;
  channel: FollowUpChannel;
}): string {
  const formal = ["BUSINESS", "HOA", "CONTRACTOR"].includes(customer.customerType);
  const pronoun = formal ? "u" : "je";
  const address = customer.contactPerson ?? customer.name;

  if (customer.channel === "whatsapp") {
    return formal
      ? `Goedemiddag ${address}, wij nemen graag contact op voor uw dakonderhoud. Kan ik een afspraak inplannen?`
      : `Hey ${address}! Lang niet gezien. Kunnen wij iets voor ${pronoun} betekenen qua dakonderhoud?`;
  }

  return formal
    ? `Goedemiddag ${address},\n\nWij nemen graag contact met ${pronoun} op omtrent uw dak. Heeft ${pronoun} vragen over onderhoud, een inspectie of herstelwerkzaamheden? Wij helpen ${pronoun} graag verder.\n\nMet vriendelijke groet,\nBerteck Dakwerken\n+31 20 555 0147`
    : `Hoi ${address},\n\nLang niet van ons gehoord! Kunnen wij iets voor ${pronoun} betekenen voor je dak? Denk aan onderhoud, inspectie of een kleine reparatie.\n\nGroeten,\nBerteck Dakwerken`;
}

// ─── OpenAI message generation ────────────────────────────────────────────────

async function generateMessageWithAI(
  openai: OpenAI,
  customer: {
    name: string;
    customerType: string;
    contactPerson: string | null;
    city: string | null;
    jobCount: number;
    quoteCount: number;
    daysSinceContact: number;
    lastActivity: Date | null;
    channel: FollowUpChannel;
  },
): Promise<string> {
  const formal = ["BUSINESS", "HOA", "CONTRACTOR"].includes(customer.customerType);
  const customerTypeLabel: Record<string, string> = {
    PRIVATE: "particuliere klant",
    BUSINESS: "zakelijke klant",
    HOA: "VvE (vereniging van eigenaren)",
    CONTRACTOR: "aannemer",
  };

  const channelInstruction =
    customer.channel === "whatsapp"
      ? "Short WhatsApp message: max 2 sentences, casual yet professional. No greeting line needed."
      : "Professional email body: 3–4 sentences. No subject line. Close with 'Met vriendelijke groet, Berteck Dakwerken'.";

  const historyContext =
    customer.jobCount > 0 || customer.quoteCount > 0
      ? `They have ${customer.jobCount} past job(s) and ${customer.quoteCount} quote(s) with the company.`
      : "This customer has no past jobs or quotes yet.";

  const systemPrompt = `You write short, warm follow-up messages in Dutch for Berteck Dakwerken, a roofing company in Amsterdam.
Tone: ${formal ? "formal (use 'u'/'uw')" : "friendly and informal (use 'je'/'jouw')"}.
Always write in Dutch. Never use English.`;

  const userPrompt = `Write a follow-up message for this customer who hasn't been contacted in ${customer.daysSinceContact} days.

Customer: ${customer.name}${customer.contactPerson ? ` — contact: ${customer.contactPerson}` : ""}
Type: ${customerTypeLabel[customer.customerType] ?? customer.customerType}
City: ${customer.city ?? "Amsterdam"}
${historyContext}
Last contact: ${customer.lastActivity ? customer.lastActivity.toLocaleDateString("nl-NL") : "unknown"}

Instructions: ${channelInstruction}
Write ONLY the message body. No subject line. No markdown. Plain text only.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.75,
    max_tokens: customer.channel === "whatsapp" ? 120 : 280,
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

// ─── Find inactive customers ──────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function findInactiveCustomers(companyId: string, cutoff: Date, limit: number) {
  // "No activity" = no job AND no quote created since cutoff
  const inactiveWhere = {
    companyId,
    isActive: true as boolean,
    AND: [
      { jobs:   { none: { createdAt: { gte: cutoff } } } },
      { quotes: { none: { createdAt: { gte: cutoff } } } },
    ],
  };

  const [rows, total] = await Promise.all([
    db.customer.findMany({
      where: inactiveWhere,
      select: {
        id: true,
        name: true,
        customerType: true,
        contactPerson: true,
        phone: true,
        email: true,
        billingCity: true,
        createdAt: true,
        _count: { select: { jobs: true, quotes: true } },
        // Latest activity dates for computing daysSinceContact
        jobs:   { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
        quotes: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      // Oldest first — most neglected customers are prioritised
      orderBy: { updatedAt: "asc" },
      take: limit,
    }),
    db.customer.count({ where: inactiveWhere }),
  ]);

  return { rows, total };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function generateFollowUps(
  options: FollowUpOptions,
): Promise<FollowUpResult> {
  const {
    companyId,
    notContactedDays = 30,
    limit = 5,
    channel = "both",
  } = options;

  const safeDays  = Math.min(Math.max(7, Math.floor(notContactedDays)), 365);
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 10);
  const cutoff    = daysAgo(safeDays);

  // 1. Find inactive customers
  const { rows, total } = await findInactiveCustomers(companyId, cutoff, safeLimit);

  if (rows.length === 0) {
    return { ok: true, candidates: [], totalFound: 0, notContactedDays: safeDays };
  }

  // 2. Initialise OpenAI (may be absent — graceful degradation to templates)
  const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

  // 3. Generate a follow-up per customer (parallel, max safeLimit concurrent calls)
  const candidates = await Promise.all(
    rows.map(async (c): Promise<FollowUpCandidate> => {
      // Compute last activity date
      const lastJobDate   = c.jobs[0]?.createdAt   ?? null;
      const lastQuoteDate = c.quotes[0]?.createdAt ?? null;
      const lastActivityDate =
        lastJobDate && lastQuoteDate
          ? new Date(Math.max(lastJobDate.getTime(), lastQuoteDate.getTime()))
          : lastJobDate ?? lastQuoteDate ?? null;

      const daysSinceContact = lastActivityDate
        ? Math.floor((Date.now() - lastActivityDate.getTime()) / 86_400_000)
        : safeDays;

      // Resolve channel: "both" prefers WhatsApp when phone is available
      const resolvedChannel: FollowUpChannel =
        channel === "both" ? (c.phone ? "whatsapp" : "email") : channel;

      // Generate message
      let suggestedMessage: string;
      if (openai) {
        try {
          suggestedMessage = await generateMessageWithAI(openai, {
            name: c.name,
            customerType: c.customerType,
            contactPerson: c.contactPerson,
            city: c.billingCity,
            jobCount: c._count.jobs,
            quoteCount: c._count.quotes,
            daysSinceContact,
            lastActivity: lastActivityDate,
            channel: resolvedChannel,
          });
        } catch {
          // Per-customer fallback — one failure doesn't stop others
          suggestedMessage = fallbackMessage({ ...c, channel: resolvedChannel });
        }
      } else {
        suggestedMessage = fallbackMessage({ ...c, channel: resolvedChannel });
      }

      return {
        customerId:       c.id,
        customerName:     c.name,
        customerType:     c.customerType,
        contactPerson:    c.contactPerson,
        phone:            c.phone,
        email:            c.email,
        city:             c.billingCity,
        daysSinceContact,
        lastActivity:     lastActivityDate?.toISOString() ?? null,
        jobCount:         c._count.jobs,
        quoteCount:       c._count.quotes,
        suggestedMessage,
        whatsappUrl:      buildWhatsAppUrl(c.phone, suggestedMessage),
        mailtoUrl:        buildMailtoUrl(c.email, c.name, suggestedMessage),
        channel:          resolvedChannel,
      };
    }),
  );

  return { ok: true, candidates, totalFound: total, notContactedDays: safeDays };
}
