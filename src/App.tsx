import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { HomePage, StockPage } from './pages';
import { StockDataContextProvider } from './context';
import { YahooFinanceProvider } from './services';
import { ErrorBoundary } from './components/ErrorBoundary';

const provider = new YahooFinanceProvider();

function App() {
  return (
    <ErrorBoundary>
      <StockDataContextProvider initialProvider={provider}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/stock/:symbol" element={<StockPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </StockDataContextProvider>
      <Analytics />
    </ErrorBoundary>
  );
}

export default App
