import { useRef, useState } from 'react';
import type { FinancialMetrics, StockQuote, StockProfile, HistoricalData, HistoricalFinancials } from '../types';
import { getCurrencySymbol } from '../utils/format';

interface Props {
  symbol: string;
  quote: StockQuote;
  profile?: StockProfile | null;
  metrics: FinancialMetrics;
  history: HistoricalData[];
  historicalFinancials: HistoricalFinancials[];
  marketCap: number | null;
}

// ─── Palette ──────────────────────────────────────────────────────────────────
const BG     = '#FAF7F0';   // warm cream
const DARK   = '#111827';   // near-black
const GREEN  = '#22C55E';
const RED    = '#EF4444';
const MUTED  = '#6B7280';
const BORDER = '#E5DDD0';   // subtle warm divider

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Returns CAGR (annualised) and the actual number of years used.
 *  Falls back to whatever history is available when < targetYears exist. */
function calcAnnualReturn(
  history: HistoricalData[],
  targetYears: number,
): { value: number; years: number } | null {
  if (history.length < 2) return null;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const latestDate = new Date(latest.date);

  const cutoff = new Date(latestDate);
  cutoff.setFullYear(cutoff.getFullYear() - targetYears);

  // First trading day on-or-after the cutoff (oldest available if stock is newer)
  const base = sorted.find(d => new Date(d.date) >= cutoff) ?? sorted[0];
  if (base.close === 0) return null;

  const actualYears =
    (latestDate.getTime() - new Date(base.date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (actualYears < 0.25) return null;

  // Compound Annual Growth Rate
  const cagr = (Math.pow(latest.close / base.close, 1 / actualYears) - 1) * 100;
  return { value: cagr, years: Math.round(actualYears) };
}

function fmtPct(v: number | null, digits = 0): string {
  if (v == null || isNaN(v)) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`;
}
function fmtMult(v: number | null): string {
  if (v == null || isNaN(v) || v <= 0) return '—';
  return `${v.toFixed(1)}x`;
}
function fmtLarge(v: number | null): string {
  if (v == null) return '—';
  const a = Math.abs(v);
  if (a >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
  if (a >= 1e9)  return `${(v / 1e9).toFixed(1)}B`;
  if (a >= 1e6)  return `${(v / 1e6).toFixed(1)}M`;
  return v.toLocaleString();
}


// ─── Sub-components ───────────────────────────────────────────────────────────

/** Dark circle icon wrapper */
function IconCircle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%', background: DARK, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </div>
  );
}

/** One cell in the KPI strip */  
function KpiCell({
  icon, value, sub, color = DARK, last = false,
}: { icon: React.ReactNode; value: string; sub: string; color?: string; last?: boolean }) {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 10,
      padding: '13px 12px',
      borderRight: last ? 'none' : `1px solid ${BORDER}`,
    }}>
      <IconCircle>{icon}</IconCircle>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1, fontFamily: 'system-ui' }}>
          {value}
        </div>
        <div style={{ fontSize: 9, color: MUTED, marginTop: 3, fontFamily: 'system-ui', lineHeight: 1.3 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

/** Label + value + optional colour bar */
function MetricRow({
  label, value, bar, barColor = GREEN, bold = false,
}: { label: string; value: string; bar?: number; barColor?: string; bold?: boolean }) {
  const filled = bar != null ? Math.min(100, Math.max(0, bar)) : null;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: MUTED, fontFamily: 'system-ui' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: bold ? 700 : 600, color: DARK, fontFamily: 'system-ui' }}>
          {value}
        </span>
      </div>
      {filled != null && (
        <div style={{ height: 5, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${filled}%`, height: '100%', background: barColor, borderRadius: 3 }} />
        </div>
      )}
    </div>
  );
}

/** Section header with icon circle + title */
function SectionHead({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <IconCircle>{icon}</IconCircle>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: DARK, fontFamily: 'system-ui' }}>{title}</div>
        {sub && <div style={{ fontSize: 9, color: MUTED, fontFamily: 'system-ui' }}>{sub}</div>}
      </div>
    </div>
  );
}

const PRICE_COLOR = '#3B82F6'; // blue for stock price line

/** Pure-SVG bar chart with a continuous weekly price line overlay (secondary axis) */
function RevenueChart({
  data, weeklyPrices, width, height,
}: {
  data: { label: string; rev: number; inc: number | null }[];
  /** Each point has x in [0,1] (fraction of the date range) and a close price */
  weeklyPrices: { x: number; price: number }[];
  width: number;
  height: number;
}) {
  if (data.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: 11 }}>
        No data
      </div>
    );
  }

  const labelH = 20;
  const chartH = height - labelH;
  const maxVal = Math.max(...data.map(d => d.rev), 1);
  const groupW = width / data.length;
  const bw = groupW * 0.28;
  const gap = groupW * 0.05;

  const barCx = (i: number) => {
    const x0 = i * groupW + groupW * 0.1;
    return x0 + bw + gap / 2;
  };

  // Price line — normalised vertically with 10 % top/bottom padding
  const prices = weeklyPrices.map(p => p.price);
  const hasPrice = prices.length >= 2;
  const minP = hasPrice ? Math.min(...prices) : 0;
  const maxP = hasPrice ? Math.max(...prices) : 1;
  const priceRange = maxP - minP || 1;
  const PAD = chartH * 0.1;
  const normY = (p: number) =>
    chartH - PAD - ((p - minP) / priceRange) * (chartH - PAD * 2);

  // Build SVG polyline points from continuous weekly data
  const pricePolyline = weeklyPrices
    .map(pt => `${(pt.x * width).toFixed(1)},${normY(pt.price).toFixed(1)}`)
    .join(' ');

  return (
    <svg width={width} height={height}>
      {/* Bars */}
      {data.map((d, i) => {
        const x0 = i * groupW + groupW * 0.1;
        const revH = (d.rev / maxVal) * chartH;
        const incH = d.inc != null ? (Math.abs(d.inc) / maxVal) * chartH : 0;
        const incPos = d.inc == null || d.inc >= 0;
        return (
          <g key={i}>
            <rect x={x0} y={chartH - revH} width={bw} height={revH} fill={DARK} rx={2} />
            {d.inc != null && (
              <rect
                x={x0 + bw + gap} y={incPos ? chartH - incH : chartH}
                width={bw} height={incH}
                fill={incPos ? GREEN : RED} rx={2}
              />
            )}
            <text
              x={barCx(i)} y={height - 3}
              textAnchor="middle" fontSize={8} fill={MUTED}
              fontFamily="system-ui,-apple-system,sans-serif"
            >
              {d.label}
            </text>
          </g>
        );
      })}

      {/* Continuous weekly price line */}
      {hasPrice && (
        <polyline
          points={pricePolyline}
          fill="none" stroke={PRICE_COLOR} strokeWidth={1.5}
          strokeLinejoin="round" strokeLinecap="round"
        />
      )}
    </svg>
  );
}

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────
const ICON = {
  trend:    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round"><polyline points="3 17 9 11 13 15 21 7"/></svg>,
  clock:    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><circle cx={12} cy={12} r={9}/><polyline points="12 7 12 12 15 15"/></svg>,
  cash:     <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><rect x={2} y={6} width={20} height={12} rx={2}/><path d="M12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0"/></svg>,
  scale:    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><path d="M3 6l9-3 9 3M3 6l3 9a6 6 0 0012 0l3-9M3 6h18M12 3v18"/></svg>,
  search:   <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><circle cx={11} cy={11} r={7}/><path d="m21 21-4.35-4.35"/></svg>,
  diamond:  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><path d="M6 3l-4 6 10 12 10-12-4-6z"/><path d="M2 9h20"/></svg>,
  dollar:   <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  bar:      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><rect x={3} y={12} width={4} height={9}/><rect x={10} y={6} width={4} height={15}/><rect x={17} y={2} width={4} height={19}/></svg>,
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function StockShareCard({
  symbol, quote, profile, metrics, history, historicalFinancials, marketCap,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // ── Derived values ──
  const sym    = getCurrencySymbol(profile?.currency);
  const isPos  = quote.change >= 0;
  const retAnn = calcAnnualReturn(history, 5);
  // Margins/returns are already stored as percentages by the data provider
  const grossM = metrics.grossMargin;
  const opM    = metrics.operatingMargin;
  const netM   = metrics.netMargin;
  const roeP   = metrics.roe;
  const roaP   = metrics.roa;
  const fcfM   = metrics.freeCashFlow != null && metrics.revenue != null && metrics.revenue > 0
    ? (metrics.freeCashFlow / metrics.revenue) * 100 : null;

  const ev = metrics.enterpriseValue ??
    (marketCap != null && metrics.netDebt != null ? marketCap + metrics.netDebt : null);
  const evToEbitda  = ev && metrics.ebitda        ? ev / metrics.ebitda        : metrics.evToEbitda;
  const evToEbit    = ev && metrics.ebit          ? ev / metrics.ebit          : metrics.evToEbit;
  const evToRevenue = ev && metrics.revenue       ? ev / metrics.revenue       : metrics.evToRevenue;
  const evToFcf     = ev && metrics.freeCashFlow && metrics.freeCashFlow > 0
    ? ev / metrics.freeCashFlow : null;

  // Revenue growth (most recent year vs prior year)
  const revItems = historicalFinancials.filter(d => d.revenue != null).slice(-2);
  const revGrowth = revItems.length === 2 && revItems[0].revenue
    ? ((revItems[1].revenue! - revItems[0].revenue!) / Math.abs(revItems[0].revenue!)) * 100
    : null;

  // Chart data — last 5 annual bars
  const chartData = historicalFinancials
    .filter(d => d.label == null) // annual only
    .filter(d => d.revenue != null)
    .slice(-5)
    .map(d => ({
      label: String(d.year).slice(2), // '24', '23'…
      year: d.year,
      rev: (d.revenue ?? 0) / 1e9,
      inc: d.netIncome != null ? d.netIncome / 1e9 : null,
    }));

  // Weekly price line — sampled every ~5 trading days over the chartData date range
  const weeklyPrices = (() => {
    if (chartData.length === 0 || history.length === 0) return [];
    const firstYear = chartData[0].year;
    const lastYear  = chartData[chartData.length - 1].year;
    const rangeStart = new Date(`${firstYear}-01-01`).getTime();
    // Extend to today so current-year prices are always included, even when
    // historicalFinancials only covers the last completed fiscal year.
    const rangeEnd = Math.max(new Date(`${lastYear + 1}-01-01`).getTime(), Date.now());
    const rangeDuration = rangeEnd - rangeStart;

    const inRange = history
      .filter(d => {
        const t = new Date(d.date).getTime();
        return t >= rangeStart && t <= rangeEnd && d.close > 0;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Sample roughly every 5 trading days (~weekly)
    const step = Math.max(1, Math.floor(inRange.length / 260));
    return inRange
      .filter((_, i) => i % step === 0)
      .map(d => ({
        x: (new Date(d.date).getTime() - rangeStart) / rangeDuration,
        price: d.close,
      }));
  })();

  const today = new Date();
  const quarter = `Q${Math.ceil((today.getMonth() + 1) / 3)} ${today.getFullYear()}`;

  // ── Download ──
  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: BG });
      const a = document.createElement('a');
      a.download = `${symbol}-${today.toISOString().slice(0, 10)}.png`;
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  // ── Reusable divider ──
  const thick = <div style={{ height: 2, background: DARK }} />;
  const thin  = <div style={{ width: 1, background: BORDER, alignSelf: 'stretch' }} />;

  return (
    <div>
      {/* ═══ SHAREABLE CARD ═══════════════════════════════════════════════════ */}
      <div
        ref={cardRef}
        style={{
          width: 620, background: BG, overflow: 'hidden',
          border: `2px solid ${DARK}`,
          fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,sans-serif',
        }}
      >
        {/* ── HEADER ── */}
        <div style={{ background: DARK, padding: '18px 22px 22px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            <span style={{
              fontSize: 50, fontWeight: 900, color: 'white',
              letterSpacing: '-2px', lineHeight: 1,
            }}>
              {symbol}
            </span>
            <div style={{ paddingBottom: 6 }}>
              <div style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 500 }}>{quote.name}</div>
              {profile && (
                <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                  {profile.sector}{profile.industry ? ` · ${profile.industry}` : ''}
                </div>
              )}
            </div>
          </div>
          {/* Quarter badge */}
          <div style={{
            position: 'absolute', bottom: 0, left: '50%',
            transform: 'translateX(-50%) translateY(50%)',
            background: '#374151', color: '#E5E7EB',
            fontSize: 9, fontWeight: 700, padding: '3px 14px',
            borderRadius: 999, letterSpacing: '0.8px', zIndex: 1,
            border: `1px solid ${DARK}`,
          }}>
            {quarter}
          </div>
        </div>

        {/* ── KPI STRIP ── */}
        <div style={{ display: 'flex', borderBottom: `2px solid ${DARK}`, marginTop: 12 }}>
          <KpiCell
            icon={ICON.trend}
            value={retAnn != null ? fmtPct(retAnn.value, 0) : '—'}
            sub={retAnn != null
              ? `Avg. yearly return\n(Past ${retAnn.years}Y · annualised)`
              : 'Yearly stock return'}
            color={retAnn == null ? DARK : retAnn.value >= 0 ? GREEN : RED}
          />
          <KpiCell
            icon={ICON.clock}
            value={grossM != null ? `${grossM.toFixed(0)}%` : '—'}
            sub={'Gross margin' + '\n(Past year)'}
          />
          <KpiCell
            icon={ICON.cash}
            value={fcfM != null ? `${fcfM.toFixed(0)}%` : '—'}
            sub={'FCF margin' + '\n(Past year)'}
          />
          <KpiCell
            icon={ICON.scale}
            value={`${sym}${quote.price.toFixed(0)}`}
            sub={`Current price · ${isPos ? '+' : ''}${quote.changePercent.toFixed(2)}% today`}
            color={isPos ? GREEN : RED}
            last
          />
        </div>

        {thick}

        {/* ── CHART + MARGINS ROW ── */}
        <div style={{ display: 'flex' }}>
          {/* Revenue & Net Income chart — 2/3 width */}
          <div style={{ flex: 2, padding: '14px 16px 14px 14px', borderRight: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 1 }}>
              Revenue, Net Income &amp; Stock Price
            </div>
            <div style={{ fontSize: 9, color: MUTED, marginBottom: 8 }}>
              Annual figures in $B · price line uses secondary axis
            </div>
            <RevenueChart data={chartData} weeklyPrices={weeklyPrices} width={370} height={155} />
            {/* Legend */}
            <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
              {[
                { color: DARK,        label: 'Revenue',    dot: false },
                { color: GREEN,       label: 'Net Income', dot: false },
                { color: PRICE_COLOR, label: 'Stock Price (weekly, normalised)', dot: true },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {l.dot
                    ? <svg width={14} height={10}><line x1={0} y1={5} x2={14} y2={5} stroke={l.color} strokeWidth={1.8}/><circle cx={7} cy={5} r={2.5} fill={l.color}/></svg>
                    : <div style={{ width: 10, height: 10, background: l.color, borderRadius: 2 }} />
                  }
                  <span style={{ fontSize: 9, color: MUTED }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Margins — 1/3 width */}
          <div style={{ flex: 1, padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: DARK, marginBottom: 12 }}>Margins</div>
            <MetricRow label="Gross Margin"     value={grossM != null ? `${grossM.toFixed(1)}%`  : '—'} bar={grossM ?? undefined} />
            <MetricRow label="Operating Margin" value={opM   != null ? `${opM.toFixed(1)}%`    : '—'} bar={opM ?? undefined} />
            <MetricRow label="Net Margin"       value={netM  != null ? `${netM.toFixed(1)}%`    : '—'} bar={netM ?? undefined} />
            <MetricRow label="FCF Margin"       value={fcfM  != null ? `${fcfM.toFixed(1)}%`    : '—'} bar={fcfM ?? undefined} />
            <div style={{ height: 1, background: BORDER, margin: '10px 0' }} />
            <MetricRow label="Return on Equity" value={roeP != null ? `${roeP.toFixed(1)}%`  : '—'} bar={roeP != null ? Math.min(roeP, 100) : undefined} />
            <MetricRow label="Return on Assets" value={roaP != null ? `${roaP.toFixed(1)}%`  : '—'} bar={roaP != null ? Math.min(roaP, 100) : undefined} />
            {revGrowth != null && (
              <MetricRow
                label="Revenue Growth (YoY)"
                value={fmtPct(revGrowth, 1)}
                bar={Math.min(Math.max(revGrowth, 0), 100)}
                barColor={revGrowth >= 0 ? GREEN : RED}
              />
            )}
          </div>
        </div>

        {thick}

        {/* ── METRICS: VALUATION | FINANCIALS | BALANCE SHEET ── */}
        <div style={{ display: 'flex' }}>
          {/* Valuation Multiples */}
          <div style={{ flex: 1, padding: 14, borderRight: `1px solid ${BORDER}` }}>
            <SectionHead icon={ICON.search} title="Key Metrics" />
            <MetricRow label="P/E Ratio (TTM)" value={fmtMult(metrics.peRatio)} />
            <MetricRow label="Forward P/E"     value={fmtMult(metrics.forwardPE)} />
            <MetricRow label="PEG Ratio"       value={fmtMult(metrics.pegRatio)} />
            <MetricRow label="P/S Ratio"       value={fmtMult(metrics.priceToSales)} />
            <MetricRow label="P/B Ratio"       value={fmtMult(metrics.priceToBook)} />
          </div>

          {thin}

          {/* EV Multiples */}
          <div style={{ flex: 1, padding: 14, borderRight: `1px solid ${BORDER}` }}>
            <SectionHead icon={ICON.diamond} title="Valuation" sub="Enterprise multiples" />
            <MetricRow label="EV / EBITDA"  value={fmtMult(evToEbitda)} />
            <MetricRow label="EV / EBIT"    value={fmtMult(evToEbit)} />
            <MetricRow label="EV / Revenue" value={fmtMult(evToRevenue)} />
            <MetricRow label="EV / FCF"     value={fmtMult(evToFcf)} />
            <div style={{ height: 1, background: BORDER, margin: '8px 0' }} />
            <MetricRow label="Revenue"      value={fmtLarge(metrics.revenue)} bold />
            <MetricRow label="Net Income"   value={fmtLarge(metrics.netIncome)} bold />
            <MetricRow label="Free Cash Flow" value={fmtLarge(metrics.freeCashFlow)} bold />
          </div>

          {thin}

          {/* Balance Sheet */}
          <div style={{ flex: 1, padding: 14 }}>
            <SectionHead icon={ICON.dollar} title="Financials" sub="Balance sheet" />
            <MetricRow label="Market Cap"        value={fmtLarge(marketCap)} bold />
            <MetricRow label="Enterprise Value"  value={fmtLarge(ev)} bold />
            <MetricRow label="Total Cash"        value={fmtLarge(metrics.totalCash)} />
            <MetricRow label="Total Debt"        value={fmtLarge(metrics.totalDebt)} />
            <MetricRow label="Net Debt"          value={fmtLarge(metrics.netDebt)} />
            <MetricRow
              label="Shares Outstanding"
              value={metrics.sharesOutstanding != null
                ? `${(metrics.sharesOutstanding / 1e9).toFixed(2)}B` : '—'}
            />
          </div>
        </div>

        {thick}

        {/* ── FOOTER ── */}
        <div style={{
          background: DARK, display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          padding: '9px 16px',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', letterSpacing: '0.5px' }}>
            tikrshot.com
          </span>
          <span style={{ fontSize: 8, color: '#4B5563' }}>
            For educational purposes only · Not financial advice
          </span>
        </div>
      </div>

      {/* ── Download button (outside card, not captured) ── */}
      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors text-sm shadow-lg"
        >
          {downloading ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Exporting…
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor">
                <path d="M7.5 11L3 6.5h3V1h3v5.5h3L7.5 11z" />
                <rect x="2" y="12" width="11" height="1.5" rx="0.75" />
              </svg>
              Save as Image
            </>
          )}
        </button>
        <span className="text-xs text-gray-400">
          1240 × auto px · ideal for Instagram &amp; X
        </span>
      </div>
    </div>
  );
}
