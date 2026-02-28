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

  switch (multipleType) {
    case 'pe': {
      const projectedNetIncome = projectedRevenue * targetMargin;
      price = (projectedNetIncome * exitMultiple) / projectedShares;
      break;
    }
    case 'evEbit': {
      const operatingMargin = targetMargin * 1.3;
      const projectedEbit = projectedRevenue * operatingMargin;
      const equityValue = projectedEbit * exitMultiple - (metrics.netDebt || 0);
      price = equityValue / projectedShares;
      break;
    }
    case 'evEbitda': {
      const operatingMargin = targetMargin * 1.3;
      const projectedEbitda = projectedRevenue * operatingMargin * 1.2;
      const equityValue = projectedEbitda * exitMultiple - (metrics.netDebt || 0);
      price = equityValue / projectedShares;
      break;
    }
    case 'evRevenue': {
      const equityValue = projectedRevenue * exitMultiple - (metrics.netDebt || 0);
      price = equityValue / projectedShares;
      break;
    }
    case 'evFcf': {
      // FCF margin ≈ net margin (targetMargin) — reasonable for asset-light companies
      const projectedFcf = projectedRevenue * targetMargin;
      const equityValue = projectedFcf * exitMultiple - (metrics.netDebt || 0);
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
  let price: number;

  switch (multipleType) {
    case 'pe': {
      price = (currentRevenue * targetMargin * exitMultiple) / sharesOutstanding;
      break;
    }
    case 'evEbit': {
      const operatingMargin = targetMargin * 1.3;
      const equityValue = currentRevenue * operatingMargin * exitMultiple - (metrics.netDebt || 0);
      price = equityValue / sharesOutstanding;
      break;
    }
    case 'evEbitda': {
      const operatingMargin = targetMargin * 1.3;
      const equityValue = currentRevenue * operatingMargin * 1.2 * exitMultiple - (metrics.netDebt || 0);
      price = equityValue / sharesOutstanding;
      break;
    }
    case 'evRevenue': {
      const equityValue = currentRevenue * exitMultiple - (metrics.netDebt || 0);
      price = equityValue / sharesOutstanding;
      break;
    }
    case 'evFcf': {
      const fcfMargin = targetMargin;
      const equityValue = currentRevenue * fcfMargin * exitMultiple - (metrics.netDebt || 0);
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
