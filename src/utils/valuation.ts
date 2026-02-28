import type { FinancialMetrics, PriceProjection, ProjectionAssumptions } from '../types';

export type MultipleType = 'pe' | 'evEbit' | 'evEbitda' | 'evRevenue' | 'evFcf';

export function calculateCAGR(
  start: number | null | undefined,
  end: number | null | undefined,
  years: number
): number | null {
  if (!start || !end || years <= 0 || start <= 0) return null;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

export function calculateScenarioPrice(
  currentRevenue: number,
  sharesOutstanding: number,
  growthRate: number,
  targetMargin: number,
  exitMultiple: number,
  dilutionRate: number,
  years: number,
  multipleType: MultipleType,
  metrics: FinancialMetrics
): number {
  const projectedRevenue = currentRevenue * Math.pow(1 + growthRate, years);
  const projectedShares = sharesOutstanding * Math.pow(1 + dilutionRate, years);
  let price: number;

  // targetMargin is the margin appropriate for the chosen method:
  // pe → net margin, evEbit → EBIT margin, evEbitda → EBITDA margin, evFcf → FCF margin.
  // No magic conversion factors — the caller sets the right margin for the method.
  switch (multipleType) {
    case 'pe': {
      price = (projectedRevenue * targetMargin * exitMultiple) / projectedShares;
      break;
    }
    case 'evEbit': {
      const equityValue = projectedRevenue * targetMargin * exitMultiple - (metrics.netDebt || 0);
      price = equityValue / projectedShares;
      break;
    }
    case 'evEbitda': {
      const equityValue = projectedRevenue * targetMargin * exitMultiple - (metrics.netDebt || 0);
      price = equityValue / projectedShares;
      break;
    }
    case 'evRevenue': {
      const equityValue = projectedRevenue * exitMultiple - (metrics.netDebt || 0);
      price = equityValue / projectedShares;
      break;
    }
    case 'evFcf': {
      const equityValue = projectedRevenue * targetMargin * exitMultiple - (metrics.netDebt || 0);
      price = equityValue / projectedShares;
      break;
    }
    default:
      price = 0;
  }

  return Math.max(0, price);
}

export function calculateFairValuePrice(
  currentRevenue: number,
  sharesOutstanding: number,
  targetMargin: number,
  exitMultiple: number,
  multipleType: MultipleType,
  metrics: FinancialMetrics
): number {
  // Use actual metric values so that base case (current multiple, current margin)
  // always equals the current market price by definition.
  // Fall back to revenue × margin only when the actual figure is unavailable.
  let price: number;

  switch (multipleType) {
    case 'pe': {
      const netIncome = metrics.netIncome ?? currentRevenue * targetMargin;
      price = (netIncome * exitMultiple) / sharesOutstanding;
      break;
    }
    case 'evEbit': {
      const ebit = metrics.ebit ?? currentRevenue * targetMargin;
      const equityValue = ebit * exitMultiple - (metrics.netDebt || 0);
      price = equityValue / sharesOutstanding;
      break;
    }
    case 'evEbitda': {
      const ebitda = metrics.ebitda ?? currentRevenue * targetMargin;
      const equityValue = ebitda * exitMultiple - (metrics.netDebt || 0);
      price = equityValue / sharesOutstanding;
      break;
    }
    case 'evRevenue': {
      const equityValue = currentRevenue * exitMultiple - (metrics.netDebt || 0);
      price = equityValue / sharesOutstanding;
      break;
    }
    case 'evFcf': {
      const fcf = metrics.freeCashFlow ?? currentRevenue * targetMargin;
      const equityValue = fcf * exitMultiple - (metrics.netDebt || 0);
      price = equityValue / sharesOutstanding;
      break;
    }
    default:
      price = 0;
  }

  return Math.max(0, price);
}

export function calculateProjections(
  metrics: FinancialMetrics,
  assumptions: ProjectionAssumptions,
  currentYear: number
): PriceProjection[] {
  const projections: PriceProjection[] = [];
  const currentRevenue = metrics.revenue || 0;
  const sharesOutstanding = metrics.sharesOutstanding || 1;

  for (let i = 1; i <= assumptions.years; i++) {
    projections.push({
      year: currentYear + i,
      bearCase: calculateScenarioPrice(
        currentRevenue, sharesOutstanding,
        assumptions.revenueGrowth.bear / 100, assumptions.targetMargin.bear / 100,
        assumptions.exitMultiple.bear, assumptions.dilutionRate / 100,
        i, assumptions.multipleType, metrics
      ),
      baseCase: calculateScenarioPrice(
        currentRevenue, sharesOutstanding,
        assumptions.revenueGrowth.base / 100, assumptions.targetMargin.base / 100,
        assumptions.exitMultiple.base, assumptions.dilutionRate / 100,
        i, assumptions.multipleType, metrics
      ),
      bullCase: calculateScenarioPrice(
        currentRevenue, sharesOutstanding,
        assumptions.revenueGrowth.bull / 100, assumptions.targetMargin.bull / 100,
        assumptions.exitMultiple.bull, assumptions.dilutionRate / 100,
        i, assumptions.multipleType, metrics
      ),
    });
  }

  return projections;
}
