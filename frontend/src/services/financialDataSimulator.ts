interface FinancialMetrics {
  totalCosts: CostMetrics;
  roi: ROIMetrics;
  savings: SavingsMetrics;
  budget: BudgetMetrics;
  efficiency: EfficiencyMetrics;
  riskMetrics: RiskMetrics;
  marketTrends: MarketTrend[];
  timestamp: Date;
}

interface CostMetrics {
  current: number;
  previous: number;
  projected: number;
  breakdown: CostBreakdown;
  trend: 'up' | 'down' | 'stable';
  variance: number; // percentage
}

interface CostBreakdown {
  infrastructure: number;
  personnel: number;
  software: number;
  security: number;
  compliance: number;
  operations: number;
}

interface ROIMetrics {
  current: number;
  target: number;
  projected: number;
  timeToBreakeven: number; // months
  trend: 'up' | 'down' | 'stable';
  confidence: number; // 0-1
}

interface SavingsMetrics {
  automated: number;
  efficiency: number;
  prevention: number;
  optimization: number;
  total: number;
  annualized: number;
}

interface BudgetMetrics {
  allocated: number;
  spent: number;
  remaining: number;
  utilization: number; // percentage
  forecast: number;
  variance: number; // percentage from plan
}

interface EfficiencyMetrics {
  operationalEfficiency: number; // percentage
  costPerIncident: number;
  meanTimeToResolution: number; // hours
  automationRate: number; // percentage
  resourceUtilization: number; // percentage
}

interface RiskMetrics {
  financialRisk: number; // 0-100 score
  complianceCost: number;
  potentialLosses: number;
  insuranceCoverage: number;
  riskMitigation: number; // percentage
}

interface MarketTrend {
  sector: string;
  trend: 'bullish' | 'bearish' | 'neutral';
  volatility: number; // 0-1
  confidence: number; // 0-1
  impact: 'positive' | 'negative' | 'neutral';
  timeframe: 'short' | 'medium' | 'long';
}

interface CostOptimizationOpportunity {
  id: string;
  category: string;
  description: string;
  potentialSavings: number;
  implementationCost: number;
  timeToImplement: number; // days
  riskLevel: 'low' | 'medium' | 'high';
  priority: number; // 1-5
  confidence: number; // 0-1
}

interface FinancialScenario {
  id: string;
  name: string;
  description: string;
  probability: number; // 0-1
  impact: number; // financial impact
  timeframe: number; // months
  mitigation: string[];
}

class FinancialDataSimulator {
  private baseMetrics: FinancialMetrics;
  private historicalData: FinancialMetrics[] = [];
  private scenarios: FinancialScenario[] = [];
  private opportunities: CostOptimizationOpportunity[] = [];

  constructor() {
    this.baseMetrics = this.initializeBaseMetrics();
    this.generateHistoricalData();
    this.generateScenarios();
    this.generateOptimizationOpportunities();
  }

  private initializeBaseMetrics(): FinancialMetrics {
    return {
      totalCosts: {
        current: 250000,
        previous: 245000,
        projected: 240000,
        breakdown: {
          infrastructure: 100000,
          personnel: 80000,
          software: 30000,
          security: 20000,
          compliance: 15000,
          operations: 5000,
        },
        trend: 'down',
        variance: -2.0,
      },
      roi: {
        current: 28.5,
        target: 30.0,
        projected: 32.1,
        timeToBreakeven: 8,
        trend: 'up',
        confidence: 0.85,
      },
      savings: {
        automated: 45000,
        efficiency: 25000,
        prevention: 60000,
        optimization: 15000,
        total: 145000,
        annualized: 174000,
      },
      budget: {
        allocated: 300000,
        spent: 187500,
        remaining: 112500,
        utilization: 62.5,
        forecast: 285000,
        variance: -5.0,
      },
      efficiency: {
        operationalEfficiency: 87.3,
        costPerIncident: 2500,
        meanTimeToResolution: 4.2,
        automationRate: 73.5,
        resourceUtilization: 82.1,
      },
      riskMetrics: {
        financialRisk: 25,
        complianceCost: 50000,
        potentialLosses: 500000,
        insuranceCoverage: 1000000,
        riskMitigation: 78.5,
      },
      marketTrends: this.generateMarketTrends(),
      timestamp: new Date(),
    };
  }

  generateCurrentMetrics(): FinancialMetrics {
    const metrics = { ...this.baseMetrics };
    const timeVariation = this.getTimeBasedVariation();
    const marketInfluence = this.getMarketInfluence();

    // Apply realistic variations
    metrics.totalCosts.current = this.applyVariation(
      this.baseMetrics.totalCosts.current,
      timeVariation * 0.1 + marketInfluence * 0.05,
      0.15
    );

    metrics.roi.current = this.applyVariation(
      this.baseMetrics.roi.current,
      timeVariation * 0.2 + marketInfluence * 0.1,
      0.1
    );

    // Update savings based on efficiency improvements
    const efficiencyGain = (Math.sin(Date.now() / (30 * 24 * 60 * 60 * 1000)) + 1) * 0.1;
    metrics.savings.automated = this.applyVariation(
      this.baseMetrics.savings.automated,
      efficiencyGain,
      0.2
    );

    // Update budget utilization
    const monthProgress = (Date.now() % (365 * 24 * 60 * 60 * 1000)) / (365 * 24 * 60 * 60 * 1000);
    metrics.budget.utilization = Math.min(95, monthProgress * 100 + (Math.random() - 0.5) * 10);
    metrics.budget.spent = (metrics.budget.allocated * metrics.budget.utilization) / 100;
    metrics.budget.remaining = metrics.budget.allocated - metrics.budget.spent;

    // Update efficiency metrics
    metrics.efficiency.operationalEfficiency = this.applyVariation(
      this.baseMetrics.efficiency.operationalEfficiency,
      efficiencyGain * 0.5,
      0.05
    );

    metrics.efficiency.automationRate = Math.min(95, 
      this.applyVariation(
        this.baseMetrics.efficiency.automationRate,
        efficiencyGain * 0.3,
        0.08
      )
    );

    // Update risk metrics
    metrics.riskMetrics.financialRisk = this.applyVariation(
      this.baseMetrics.riskMetrics.financialRisk,
      -efficiencyGain * 0.2, // Risk decreases with efficiency
      0.15
    );

    // Update market trends
    metrics.marketTrends = this.generateMarketTrends();
    metrics.timestamp = new Date();

    // Store in historical data
    this.historicalData.push(metrics);
    if (this.historicalData.length > 100) {
      this.historicalData = this.historicalData.slice(-100);
    }

    return metrics;
  }

  private generateMarketTrends(): MarketTrend[] {
    const sectors = [
      'Cybersecurity',
      'Cloud Computing',
      'AI/ML Services',
      'Compliance Technology',
      'Infrastructure',
      'Automation Tools',
    ];

    return sectors.map(sector => ({
      sector,
      trend: this.getRandomTrend(),
      volatility: Math.random() * 0.5 + 0.1, // 0.1-0.6
      confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      impact: this.getRandomImpact(),
      timeframe: this.getRandomTimeframe(),
    }));
  }

  private getRandomTrend(): MarketTrend['trend'] {
    const trends: MarketTrend['trend'][] = ['bullish', 'bearish', 'neutral'];
    const weights = [0.4, 0.2, 0.4]; // Slightly optimistic
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < trends.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return trends[i];
      }
    }
    
    return 'neutral';
  }

  private getRandomImpact(): MarketTrend['impact'] {
    const impacts: MarketTrend['impact'][] = ['positive', 'negative', 'neutral'];
    const weights = [0.45, 0.25, 0.3];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < impacts.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return impacts[i];
      }
    }
    
    return 'neutral';
  }

  private getRandomTimeframe(): MarketTrend['timeframe'] {
    const timeframes: MarketTrend['timeframe'][] = ['short', 'medium', 'long'];
    return timeframes[Math.floor(Math.random() * timeframes.length)];
  }

  private generateHistoricalData(): void {
    const months = 12;
    const baseTime = Date.now() - (months * 30 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < months; i++) {
      const timestamp = new Date(baseTime + i * 30 * 24 * 60 * 60 * 1000);
      const variation = (Math.sin(i / 6 * Math.PI) + Math.random() - 0.5) * 0.1;
      
      const historicalMetrics: FinancialMetrics = {
        ...this.baseMetrics,
        totalCosts: {
          ...this.baseMetrics.totalCosts,
          current: this.applyVariation(this.baseMetrics.totalCosts.current, variation, 0.1),
        },
        roi: {
          ...this.baseMetrics.roi,
          current: this.applyVariation(this.baseMetrics.roi.current, variation * 0.5, 0.08),
        },
        timestamp,
      };

      this.historicalData.push(historicalMetrics);
    }
  }

  private generateScenarios(): void {
    this.scenarios = [
      {
        id: 'scenario-1',
        name: 'Economic Downturn',
        description: 'Market recession leading to budget cuts and cost optimization pressure',
        probability: 0.25,
        impact: -50000,
        timeframe: 6,
        mitigation: ['Increase automation', 'Optimize resource allocation', 'Renegotiate contracts'],
      },
      {
        id: 'scenario-2',
        name: 'Regulatory Changes',
        description: 'New compliance requirements increasing operational costs',
        probability: 0.4,
        impact: -25000,
        timeframe: 12,
        mitigation: ['Invest in compliance automation', 'Staff training', 'Process optimization'],
      },
      {
        id: 'scenario-3',
        name: 'Technology Advancement',
        description: 'AI/ML improvements leading to significant efficiency gains',
        probability: 0.7,
        impact: 75000,
        timeframe: 18,
        mitigation: ['Invest in AI capabilities', 'Staff retraining', 'Process redesign'],
      },
      {
        id: 'scenario-4',
        name: 'Security Incident',
        description: 'Major security breach requiring significant response investment',
        probability: 0.15,
        impact: -200000,
        timeframe: 3,
        mitigation: ['Incident response plan', 'Insurance coverage', 'Preventive measures'],
      },
    ];
  }

  private generateOptimizationOpportunities(): void {
    this.opportunities = [
      {
        id: 'opt-1',
        category: 'Automation',
        description: 'Automate routine incident response procedures',
        potentialSavings: 35000,
        implementationCost: 15000,
        timeToImplement: 45,
        riskLevel: 'low',
        priority: 4,
        confidence: 0.85,
      },
      {
        id: 'opt-2',
        category: 'Infrastructure',
        description: 'Migrate to cloud-native architecture',
        potentialSavings: 60000,
        implementationCost: 40000,
        timeToImplement: 120,
        riskLevel: 'medium',
        priority: 5,
        confidence: 0.75,
      },
      {
        id: 'opt-3',
        category: 'Process',
        description: 'Implement predictive maintenance for systems',
        potentialSavings: 25000,
        implementationCost: 10000,
        timeToImplement: 30,
        riskLevel: 'low',
        priority: 3,
        confidence: 0.9,
      },
      {
        id: 'opt-4',
        category: 'Vendor',
        description: 'Consolidate security tool vendors',
        potentialSavings: 45000,
        implementationCost: 5000,
        timeToImplement: 60,
        riskLevel: 'medium',
        priority: 4,
        confidence: 0.8,
      },
    ];
  }

  private getTimeBasedVariation(): number {
    const time = Date.now();
    const dailyPattern = Math.sin((time % (24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000) * 2 * Math.PI);
    const weeklyPattern = Math.sin((time % (7 * 24 * 60 * 60 * 1000)) / (7 * 24 * 60 * 60 * 1000) * 2 * Math.PI);
    const monthlyPattern = Math.sin((time % (30 * 24 * 60 * 60 * 1000)) / (30 * 24 * 60 * 60 * 1000) * 2 * Math.PI);
    
    return (dailyPattern * 0.1 + weeklyPattern * 0.2 + monthlyPattern * 0.3) / 3;
  }

  private getMarketInfluence(): number {
    const trends = this.baseMetrics.marketTrends;
    let influence = 0;
    
    trends.forEach(trend => {
      const trendValue = trend.trend === 'bullish' ? 1 : trend.trend === 'bearish' ? -1 : 0;
      const impactValue = trend.impact === 'positive' ? 1 : trend.impact === 'negative' ? -1 : 0;
      influence += (trendValue + impactValue) * trend.confidence * trend.volatility;
    });
    
    return influence / trends.length;
  }

  private applyVariation(baseValue: number, variation: number, maxVariation: number): number {
    const clampedVariation = Math.max(-maxVariation, Math.min(maxVariation, variation));
    const randomNoise = (Math.random() - 0.5) * maxVariation * 0.2;
    return Math.max(0, baseValue * (1 + clampedVariation + randomNoise));
  }

  // Public methods
  getHistoricalData(months: number = 12): FinancialMetrics[] {
    return this.historicalData.slice(-months);
  }

  getScenarios(): FinancialScenario[] {
    return [...this.scenarios];
  }

  getOptimizationOpportunities(): CostOptimizationOpportunity[] {
    return [...this.opportunities];
  }

  calculateROIProjection(timeframe: number): { months: number[]; roi: number[] } {
    const months = [];
    const roi = [];
    const currentROI = this.baseMetrics.roi.current;
    const targetROI = this.baseMetrics.roi.target;
    
    for (let i = 0; i <= timeframe; i++) {
      months.push(i);
      const progress = i / timeframe;
      const projectedROI = currentROI + (targetROI - currentROI) * progress + 
                          Math.sin(i / 6 * Math.PI) * 2 + (Math.random() - 0.5) * 1;
      roi.push(Math.max(0, projectedROI));
    }
    
    return { months, roi };
  }

  calculateCostBreakdown(): { category: string; amount: number; percentage: number }[] {
    const breakdown = this.baseMetrics.totalCosts.breakdown;
    const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
    
    return Object.entries(breakdown).map(([category, amount]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      amount,
      percentage: (amount / total) * 100,
    }));
  }

  generateBudgetForecast(months: number): { month: string; allocated: number; projected: number; variance: number }[] {
    const forecast = [];
    const baseAllocated = this.baseMetrics.budget.allocated / 12; // Monthly allocation
    
    for (let i = 1; i <= months; i++) {
      const monthName = new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short' });
      const seasonalVariation = Math.sin(i / 12 * 2 * Math.PI) * 0.1;
      const trendVariation = i * 0.02; // 2% growth per month
      
      const allocated = baseAllocated;
      const projected = baseAllocated * (1 + seasonalVariation + trendVariation + (Math.random() - 0.5) * 0.1);
      const variance = ((projected - allocated) / allocated) * 100;
      
      forecast.push({
        month: monthName,
        allocated,
        projected,
        variance,
      });
    }
    
    return forecast;
  }

  generateEfficiencyTrends(): { metric: string; current: number; target: number; trend: string }[] {
    const efficiency = this.baseMetrics.efficiency;
    
    return [
      {
        metric: 'Operational Efficiency',
        current: efficiency.operationalEfficiency,
        target: 90,
        trend: efficiency.operationalEfficiency > 85 ? 'improving' : 'needs attention',
      },
      {
        metric: 'Automation Rate',
        current: efficiency.automationRate,
        target: 80,
        trend: efficiency.automationRate > 70 ? 'on track' : 'behind target',
      },
      {
        metric: 'Resource Utilization',
        current: efficiency.resourceUtilization,
        target: 85,
        trend: efficiency.resourceUtilization > 80 ? 'optimal' : 'underutilized',
      },
    ];
  }
}

export const financialDataSimulator = new FinancialDataSimulator();
export default financialDataSimulator;