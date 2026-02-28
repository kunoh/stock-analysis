# Stock Analysis Website - Planning Document

## Vision
A comprehensive stock analysis platform that enables investors to search for any stock ticker and access detailed financial data, valuation metrics, and customizable price projections with bear, base, and bull case scenarios.

---

## Core Features

### 1. Stock Search & Overview
- **Ticker Search**: Search bar with autocomplete for stock symbols and company names
- **Company Overview**: Name, sector, industry, market cap, exchange, description
- **Real-time Price**: Current price, daily change (%), 52-week high/low
- **Key Statistics**: Shares outstanding, float, average volume, beta

### 2. Financial Data Dashboard

#### Income Statement Metrics
- Revenue (TTM and historical 5-10 years)
- Gross profit & gross margin %
- Operating income & operating margin %
- Net income & net margin %
- EPS (basic & diluted)
- Revenue growth rates (YoY, CAGR)

#### Balance Sheet Metrics
- Total assets & liabilities
- Shareholder equity
- Cash & cash equivalents
- Total debt (short-term + long-term)
- Net debt position
- Book value per share

#### Cash Flow Metrics
- Operating cash flow
- Free cash flow (FCF)
- Capital expenditures
- FCF yield
- Cash conversion ratio

### 3. Valuation Metrics
- **P/E Ratio** (TTM and Forward)
- **EV/EBITDA**
- **EV/EBIT**
- **EV/Revenue**
- **P/S Ratio** (Price to Sales)
- **P/B Ratio** (Price to Book)
- **PEG Ratio**
- **FCF Yield**
- Historical valuation comparison (5-year average multiples)

### 4. Price Prediction Module (Core Feature)

#### User Input Parameters
| Parameter | Description | Input Type |
|-----------|-------------|------------|
| Revenue Growth Rate | Annual growth % for years 1-5 | Per-year input or single CAGR |
| Target Margin % | Operating margin or net margin target | Percentage slider |
| Exit Multiple | P/E or EV/EBIT multiple at year 5 | Number input |
| Discount Rate | For DCF calculation (optional) | Percentage |
| Share Dilution | Expected annual dilution % | Percentage |

#### Three-Case Scenario Builder
For each case (Bear, Base, Bull), user can specify:

**Bear Case**
- Conservative revenue growth (e.g., 5% CAGR)
- Margin compression scenario
- Lower exit multiple (e.g., 15x P/E)

**Base Case**
- Expected/consensus revenue growth (e.g., 12% CAGR)
- Stable or modest margin expansion
- Fair value multiple (e.g., 20x P/E)

**Bull Case**
- Optimistic revenue growth (e.g., 20% CAGR)
- Margin expansion scenario
- Premium multiple (e.g., 30x P/E)

#### Output Display
- **Price Target Table**: Year 1-5 projected prices for each scenario
- **Implied Returns**: Annualized return % from current price to each target
- **Probability-Weighted Target**: Optional weighted average based on user-assigned probabilities
- **Visual Chart**: Line chart showing price trajectory for all three cases

### 5. Historical Analysis
- **Price Chart**: Interactive candlestick/line chart (1D, 1W, 1M, 3M, 1Y, 5Y, MAX)
- **Financial Trends**: Historical revenue, earnings, margins plotted over time
- **Valuation History**: Multiple expansion/contraction visualization

### 6. Comparison Tools
- Compare 2-5 stocks side by side
- Metrics comparison table
- Relative valuation analysis

---

## Technical Architecture

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **State Management**: React Context
- **Routing**: React Router

### Backend
- Currently frontend-only (API calls direct to data providers)
- Future: Node.js with Express or Python with FastAPI

### Data Sources
- **Primary**: Yahoo Finance (unofficial API via CORS proxy)
- **Alternatives**: Alpha Vantage, Financial Modeling Prep (if needed)

### Hosting
- Vercel (free tier) or Cloudflare Pages

---

## Decisions Made

| Question | Decision |
|----------|----------|
| **Data Source** | Free API provider (Yahoo Finance via CORS proxy). Revisit if limitations become blocking. |
| **Authentication** | No user accounts for MVP - open access for everyone |
| **Hosting** | Free/cheapest option: Vercel free tier or Cloudflare Pages |
| **Platform Focus** | Desktop-first design |
| **Market Scope** | Global stocks (all major exchanges) |
| **Valuation Methods** | Support multiple: P/E, EV/EBIT, EV/EBITDA, EV/Revenue |

---

## Project Structure

```
stock-analysis/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── SearchBar.tsx
│   │   ├── PriceChart.tsx
│   │   ├── ValuationMetrics.tsx
│   │   ├── FinancialOverview.tsx
│   │   └── PricePredictor.tsx
│   ├── pages/            # Page components
│   │   ├── HomePage.tsx
│   │   └── StockPage.tsx
│   ├── services/         # API calls
│   │   └── stockApi.ts
│   ├── types/            # TypeScript types
│   │   └── stock.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

---

## MVP Scope (Phase 1) ✅ IN PROGRESS

### Must Have
- [x] Stock ticker search with autocomplete
- [x] Company overview with key stats
- [x] Core financial metrics (revenue, earnings, margins)
- [x] Basic valuation ratios (P/E, EV/EBIT, P/S)
- [x] 3-scenario price prediction calculator with user inputs
- [x] Results table and chart

### Nice to Have (Phase 2)
- [ ] Historical financial charts
- [ ] Stock comparison tool
- [ ] Save/export analyses
- [ ] User accounts and portfolio tracking
- [ ] Email alerts for price targets
- [ ] Mobile responsive design

### Future Enhancements (Phase 3)
- [ ] DCF calculator
- [ ] Analyst estimates integration
- [ ] News feed integration
- [ ] Social features (share analyses)
- [ ] AI-powered insights

---

## Next Steps

1. ~~Finalize feature scope and requirements~~
2. ~~Choose technology stack~~
3. ~~Select data provider / API~~
4. ~~Set up project structure~~
5. Test and refine the application
6. Deploy to Vercel

---

*Last Updated: February 23, 2026*
