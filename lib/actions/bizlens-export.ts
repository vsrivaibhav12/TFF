'use server';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import { getReportById } from '@/lib/repositories/bizlens';
import { getClientById } from '@/lib/repositories/clients';
import {
  computeReport,
  generateInsights,
  generateExecutiveSummary,
  computeBizLensScore,
  computeWCCycle,
  computeBreakEvenDays,
  computeDebtFreedom,
  generateOpportunities,
} from '@/lib/services/bizlens-service';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function monthName(m?: number | null): string {
  if (!m) return '';
  return new Date(2000, m - 1, 1).toLocaleString('en-IN', { month: 'short' });
}

export async function exportBizlensPdfAction(
  reportId: string,
): Promise<ActionResult<{ pdfBase64: string; filename: string }>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'bizlens.view');

    const data = await getReportById(reportId);
    if (!data) return fail('Report not found', 'NOT_FOUND');

    const client = await getClientById(data.client_id);
    const clientName = (client as { business_name?: string } | null)?.business_name ?? 'Client';

    const report = computeReport(data);
    const insights = generateInsights(report);
    const summary = generateExecutiveSummary(report, insights, {}, clientName);
    const score = computeBizLensScore(report);
    const wcc = computeWCCycle(report, { INTm: report.monthly.INTm });
    const breakEven = computeBreakEvenDays(report);
    const debtFreedom = computeDebtFreedom(report);
    const opportunities = generateOpportunities(report);

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 40;
    let y = height - margin;

    function text(
      t: string,
      opts: { x?: number; size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {},
    ) {
      const size = opts.size ?? 10;
      const f = opts.bold ? fontBold : font;
      const color = opts.color ?? rgb(0.1, 0.1, 0.1);
      page.drawText(t, { x: opts.x ?? margin, y, size, font: f, color });
      y -= size + 4;
    }

    function sectionTitle(t: string) {
      y -= 8;
      text(t, { size: 12, bold: true, color: rgb(0.05, 0.4, 0.38) });
      y -= 4;
    }

    function row(label: string, value: string) {
      text(`${label}: ${value}`, { size: 10 });
    }

    function ensureSpace(needed = 80) {
      if (y < margin + needed) {
        page = pdfDoc.addPage();
        y = page.getSize().height - margin;
      }
    }

    // Header
    text('BizLens Diagnostic Report', { size: 18, bold: true, color: rgb(0.05, 0.4, 0.38) });
    text(`${clientName} · ${monthName(data.period_month)} ${data.period_year}`, { size: 11 });
    if (summary) {
      text(`Overall health: ${summary.healthLabel}`, { size: 10, bold: true });
    }
    y -= 6;

    sectionTitle('Key metrics');
    row('Monthly revenue', formatINR(report.monthly.Rm));
    row('Contribution margin', formatPct(report.monthly.cmPct));
    row('Operating profit', formatINR(report.monthly.opProfit));
    row('Operating margin', formatPct(report.monthly.opPct));
    row('Working capital cycle', `${wcc?.ccc ?? 0} days`);
    row('Break-even sales / month', formatINR(report.monthly.beSales));
    row('Break-even days', `${breakEven ?? 0}`);
    row('Debt freedom', debtFreedom != null ? `${debtFreedom} months` : 'N/A');
    row('BizLens score', score != null ? `${score.total}/${score.max}` : 'N/A');

    sectionTitle('Balance sheet snapshot');
    row('Cash', formatINR(report.bs.cash));
    row('Receivables', formatINR(report.bs.ar));
    row('Inventory', formatINR(report.bs.inv));
    row('Payables', formatINR(report.bs.ap));
    row('Short-term borrowings', formatINR(report.bs.stb));
    row('Long-term borrowings', formatINR(report.bs.ltb));
    row('Equity', formatINR(report.bs.eq));

    if (summary) {
      sectionTitle('Operating highlights');
      for (const m of summary.operatingHighlights.slice(0, 6)) {
        row(m.label, m.value);
      }
    }

    const allInsights = [
      ...insights.redFlags.map((i) => `Red flag: ${i.title} — ${i.body}`),
      ...insights.watchAreas.map((i) => `Watch area: ${i.title} — ${i.body}`),
      ...insights.strengths.map((i) => `Strength: ${i.title} — ${i.body}`),
    ];

    if (allInsights.length > 0) {
      sectionTitle('Insights');
      for (const insight of allInsights.slice(0, 12)) {
        ensureSpace(40);
        const lines = wrapText(`• ${insight}`, width - margin * 2 - 12, 9, font);
        for (const line of lines) text(line, { x: margin + 12, size: 9 });
      }
    }

    if (opportunities.length > 0) {
      sectionTitle('Opportunities');
      for (const opp of opportunities.slice(0, 6)) {
        ensureSpace(30);
        const lines = wrapText(`• ${opp.text}`, width - margin * 2 - 12, 9, font);
        for (const line of lines) text(line, { x: margin + 12, size: 9 });
      }
    }

    if (insights.nextSteps.length > 0) {
      sectionTitle('Next steps');
      for (const step of insights.nextSteps.slice(0, 6)) {
        ensureSpace(30);
        const lines = wrapText(`• ${step}`, width - margin * 2 - 12, 9, font);
        for (const line of lines) text(line, { x: margin + 12, size: 9 });
      }
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    const filename = `bizlens-${clientName.replace(/\s+/g, '-').toLowerCase()}-${data.period_year}-${String(data.period_month ?? 0).padStart(2, '0')}.pdf`;

    return ok({ pdfBase64, filename });
  } catch (e: any) {
    return fail(e?.message ?? 'PDF export failed', e?.code ?? 'UNKNOWN');
  }
}

function wrapText(text: string, maxWidth: number, size: number, font: { widthOfTextAtSize: (t: string, s: number) => number }) {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}
