import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { SearchBar, PriceChart, ValuationMetrics, FinancialOverview, PricePredictor, HistoricalFinancialsChart, StatCard } from '../components';
import { useStockPageData } from '../hooks/useStockPageData';
import { formatLargeNumber, formatCompactNumber } from '../utils/format';

type TabType = 'overview' | 'financials' | 'valuation' | 'predict';

export function StockPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  // Always display the ticker in uppercase regardless of how it appears in the URL.
  const displaySymbol = symbol?.toUpperCase() ?? '';
  const { quote, profile, metrics, history, historicalFinancials, loading, error } = useStockPageData(symbol);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Keep the browser tab title in sync with the current stock.
  useEffect(() => {
    document.title = displaySymbol ? `${displaySymbol} - Stock Analysis` : 'Stock Analysis';
    return () => { document.title = 'Stock Analysis'; };
  }, [displaySymbol]);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'financials', label: 'Financials' },
    { id: 'valuation', label: 'Valuation' },
    { id: 'predict', label: 'Price Prediction' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading {displaySymbol}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to search
          </button>
        </div>
      </div>
    );
  }

  const isPositive = (quote?.change || 0) >= 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700">
              📈
            </Link>
            <div className="flex-1 max-w-xl">
              <SearchBar />
            </div>
          </div>
        </div>
      </header>

      {/* Stock Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{displaySymbol}</h1>
                <span className="text-gray-500">·</span>
                <span className="text-xl text-gray-600">{quote?.name}</span>
              </div>
              {profile && (
                <p className="text-gray-500 mt-1">
                  {profile.sector} · {profile.industry}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">
                ${quote?.price.toFixed(2)}
              </p>
              <p className={`text-lg font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{quote?.change.toFixed(2)} ({isPositive ? '+' : ''}{quote?.changePercent.toFixed(2)}%)
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-8 border-b border-gray-200 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Price History</h2>
              <PriceChart data={history} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Market Cap" value={formatLargeNumber(quote?.marketCap || null)} />
              <StatCard label="P/E Ratio" value={metrics?.peRatio?.toFixed(2) || '-'} />
              <StatCard label="52W High" value={`$${quote?.high.toFixed(2)}`} />
              <StatCard label="52W Low" value={`$${quote?.low.toFixed(2)}`} />
              <StatCard label="Volume" value={formatCompactNumber(quote?.volume)} />
              <StatCard label="Avg Volume" value="-" />
              <StatCard label="Open" value={`$${quote?.open.toFixed(2)}`} />
              <StatCard label="Prev Close" value={`$${quote?.previousClose.toFixed(2)}`} />
            </div>

            {profile?.description && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
                <p className="text-gray-600 leading-relaxed">{profile.description}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'financials' && metrics && (
          <div className="space-y-6">
            <FinancialOverview metrics={metrics} />
            {historicalFinancials.length > 0 && (
              <HistoricalFinancialsChart data={historicalFinancials} symbol={displaySymbol} history={history} />
            )}
          </div>
        )}

        {activeTab === 'valuation' && metrics && (
          <ValuationMetrics metrics={metrics} price={quote?.price || 0} marketCap={quote?.marketCap || null} />
        )}

        {/* PricePredictor is kept mounted (not conditionally rendered) to preserve
            the user's scenario inputs when switching between tabs. */}
        {metrics && quote && (
          <div className={activeTab === 'predict' ? '' : 'hidden'}>
            <PricePredictor
              symbol={displaySymbol}
              currentPrice={quote.price}
              metrics={metrics}
              marketCap={quote.marketCap || null}
            />
          </div>
        )}
      </main>
    </div>
  );
}
