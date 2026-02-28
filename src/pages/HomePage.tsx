import { useNavigate } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';

const POPULAR_STOCKS = [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'NVDA', name: 'NVIDIA' },
];

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            📈 Stock Analysis
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-20">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Analyze Any Stock
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl">
            Get detailed financial data, valuation metrics, and create custom price projections 
            with bear, base, and bull case scenarios.
          </p>
        </div>

        <SearchBar />

        {/* Popular Stocks */}
        <div className="mt-8">
          <span className="text-sm text-gray-500 mr-3">Popular:</span>
          {POPULAR_STOCKS.map((stock, index) => (
            <button
              key={stock.symbol}
              onClick={() => navigate(`/stock/${stock.symbol}`)}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              {stock.symbol}
              {index < POPULAR_STOCKS.length - 1 && (
                <span className="mx-2 text-gray-300">|</span>
              )}
            </button>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          Data provided by Yahoo Finance. For informational purposes only.
        </div>
      </footer>
    </div>
  );
}
