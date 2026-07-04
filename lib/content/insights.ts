export interface InsightArticle {
  slug: string;
  title: string;
  category: 'Compliance' | 'Virtual CFO' | 'CBAM & ESG' | 'Process & Controls';
  date: string;
  excerpt: string;
  body: string;
}

export const insightArticles: InsightArticle[] = [
  {
    slug: 'gst-compliance-checklist-for-msmes',
    title: 'A practical GST compliance checklist for Coimbatore MSMEs',
    category: 'Compliance',
    date: 'June 2026',
    excerpt:
      'Monthly GSTR-1, GSTR-3B, e-invoicing thresholds, and reconciliations that keep notices away.',
    body: `
      <p>GST compliance is not a once-a-quarter event. For manufacturing MSMEs around Coimbatore, the real risk builds up in the small gaps between sales invoices, purchase entries, and e-way bills.</p>
      <p>Start with a monthly rhythm: reconcile GSTR-1 with your sales register before filing, match GSTR-2B against purchase bills, and verify that HSN summaries match across GSTR-1 and GSTR-3B. If your turnover crossed the e-invoicing threshold, ensure every B2B invoice is generated through the IRP before it is treated as valid.</p>
      <p>Watch the red flags: mismatch in taxable values, unclaimed credits that suddenly disappear, and outward supplies reported under the wrong HSN. These are the items that generate department notices first.</p>
      <p>Build a simple internal checklist—invoice issuance date, IRN date, filing date, and payment date—and review it in the first week of every month. A 30-minute review is cheaper than a demand notice.</p>
    `,
  },
  {
    slug: 'working-capital-levers-for-manufacturers',
    title: 'Three working-capital levers every manufacturer should pull',
    category: 'Virtual CFO',
    date: 'June 2026',
    excerpt:
      'DSO, DIO, and DPO are not just ratios. They are cash-flow levers that decide whether you fund growth or fire-fight liquidity.',
    body: `
      <p>Working capital is where profit turns into cash. A healthy P&L can still feel tight if receivables stretch, inventory sits, or supplier payments are poorly timed.</p>
      <p>The first lever is days sales outstanding. Tighten credit policies, invoice on time, and follow up before the due date. A five-day reduction in collection often frees more cash than a small price hike.</p>
      <p>The second lever is days inventory outstanding. Review slow-moving stock every month, align purchases with production plans, and negotiate return or consignment terms for raw materials where possible.</p>
      <p>The third lever is days payable outstanding. Paying early to please suppliers is costly. Negotiate longer terms where you have bargaining power, but never let payables cross into overdue territory that damages relationships.</p>
      <p>Track these three numbers monthly. Their combined effect—the cash conversion cycle—tells you how much cash is locked inside operations.</p>
    `,
  },
  {
    slug: 'cbam-readiness-for-exporters',
    title: 'CBAM readiness: what Coimbatore exporters need to know',
    category: 'CBAM & ESG',
    date: 'May 2026',
    excerpt:
      'The EU Carbon Border Adjustment Mechanism is moving from transition to enforcement. Here is how to prepare without over-investing.',
    body: `
      <p>CBAM affects exporters of cement, iron and steel, aluminium, fertilisers, electricity, and hydrogen to the European Union. During the transition phase, importers report embedded emissions. Soon, those emissions will carry a cost.</p>
      <p>Start by mapping which products and customers fall under CBAM. Then identify the direct and indirect emissions embedded in production. You do not need a perfect carbon model immediately; you need defensible data and a consistent methodology.</p>
      <p>Build a simple emissions tracker per product line: fuel used, electricity consumed, and any process emissions. Keep supporting invoices and measurement records. This becomes the basis for the CBAM declaration your EU importer will file.</p>
      <p>Early preparation also opens conversations with buyers. Many European customers now ask for carbon data before price. Being ready is a competitive advantage.</p>
    `,
  },
  {
    slug: 'monthly-close-rhythm',
    title: 'Why a 5-day monthly close changes everything',
    category: 'Process & Controls',
    date: 'May 2026',
    excerpt:
      'Speed in financial reporting is not about working harder. It is about a repeatable close process that surfaces problems early.',
    body: `
      <p>Most MSMEs know their numbers weeks after the month ends. By then, decisions are delayed and problems are buried under new transactions.</p>
      <p>A five-day close forces discipline. Day one: close ledgers and reconcile bank accounts. Day two: review receivables, payables, and inventory. Day three: finalise cost of goods sold and overheads. Day four: prepare a simple management P&L and balance sheet. Day five: review with the leadership team.</p>
      <p>The goal is not perfect accuracy. It is timely visibility. A close with 95% accuracy on day five is more useful than 99% accuracy on day twenty.</p>
      <p>Start by documenting every recurring journal entry, every reconciliation, and every approval. Standardise the sequence, assign owners, and track the timeline. Within three months, the rhythm becomes routine.</p>
    `,
  },
];
