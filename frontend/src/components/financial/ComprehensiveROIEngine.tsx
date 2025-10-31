import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

interface ROIScenario {
  id: string;
  name: string;
  description: string;
  timeframe: number; // months
  initialInvestment: number;
  operationalCosts: number[];
  benefits: {
    costSavings: number[];
    revenueIncrease: number[];
    productivityGains: number[];
    riskReduction: number[];
  };
  assumptions: string[];
}

interface ROIMetrics {
  roi: number;
  npv: number;
  paybackPeriod: number;
  irr: number;
  totalBenefits: number;
  totalCosts: number;
  breakEvenMonth: number;
}

export const ComprehensiveROIEngine: React.FC = () => {
  const [scenarios, setScenarios] = useState<ROIScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [metrics, setMetrics] = useState<ROIMetrics | null>(null);
  const [discountRate, setDiscountRate] = useState(0.1); // 10%
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    // Initialize with sample scenarios
    const sampleScenarios: ROIScenario[] = [
      {
        id: '1',
        name: 'ACSO Basic Implementation',
        description: 'Standard ACSO deployment for mid-size organization',
        timeframe: 36,
        initialInvestment: 250000,
        operationalCosts: Array(36).fill(15000),
        benefits: {
          costSavings: Array(36).fill(0).map((_, i) => Math.min(25000 + i * 1000, 45000)),
          revenueIncrease: Array(36).fill(0).map((_, i) => Math.min(10000 + i * 500, 20000)),
          productivityGains: Array(36).fill(0).map((_, i) => Math.min(8000 + i * 300, 15000)),
          riskReduction: Array(36).fill(0).map((_, i) => Math.min(12000 + i * 400, 25000))
        },
        assumptions: [
          '30% reduction in security incidents',
          '40% faster incident response',
          '25% reduction in manual tasks',
          'No major security breaches'
        ]
      },
      {
        id: '2',
        name: 'ACSO Enterprise Implementation',
        description: 'Full enterprise deployment with advanced features',
        timeframe: 48,
        initialInvestment: 500000,
        operationalCosts: Array(48).fill(25000),
        benefits: {
          costSavings: Array(48).fill(0).map((_, i) => Math.min(50000 + i * 2000, 100000)),
          revenueIncrease: Array(48).fill(0).map((_, i) => Math.min(20000 + i * 1000, 50000)),
          productivityGains: Array(48).fill(0).map((_, i) => Math.min(15000 + i * 600, 35000)),
          riskReduction: Array(48).fill(0).map((_, i) => Math.min(25000 + i * 800, 60000))
        },
        assumptions: [
          '50% reduction in security incidents',
          '60% faster incident response',
          '40% reduction in manual tasks',
          'Compliance cost savings',
          'Insurance premium reductions'
        ]
      },
      {
        id: '3',
        name: 'Conservative Estimate',
        description: 'Conservative ROI projection with minimal assumptions',
        timeframe: 24,
        initialInvestment: 150000,
        operationalCosts: Array(24).fill(12000),
        benefits: {
          costSavings: Array(24).fill(0).map((_, i) => Math.min(15000 + i * 500, 25000)),
          revenueIncrease: Array(24).fill(0).map((_, i) => Math.min(5000 + i * 200, 10000)),
          productivityGains: Array(24).fill(0).map((_, i) => Math.min(5000 + i * 150, 8000)),
          riskReduction: Array(24).fill(0).map((_, i) => Math.min(8000 + i * 200, 15000))
        },
        assumptions: [
          '20% reduction in security incidents',
          '30% faster incident response',
          '15% reduction in manual tasks'
        ]
      }
    ];
    
    setScenarios(sampleScenarios);
    setSelectedScenario(sampleScenarios[0].id);
  }, []);

  useEffect(() => {
    if (selectedScenario) {
      calculateROI();
    }
  }, [selectedScenario, discountRate]);

  const calculateROI = async () => {
    const scenario = scenarios.find(s => s.id === selectedScenario);
    if (!scenario) return;

    setIsCalculating(true);
    
    // Simulate calculation delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const monthlyBenefits = scenario.benefits.costSavings.map((_, i) => 
      scenario.benefits.costSavings[i] +
      scenario.benefits.revenueIncrease[i] +
      scenario.benefits.productivityGains[i] +
      scenario.benefits.riskReduction[i]
    );

    const monthlyCashFlow = monthlyBenefits.map((benefit, i) => 
      benefit - scenario.operationalCosts[i]
    );

    // Add initial investment to first month
    monthlyCashFlow[0] -= scenario.initialInvestment;

    // Calculate NPV
    const npv = monthlyCashFlow.reduce((acc, cashFlow, i) => 
      acc + cashFlow / Math.pow(1 + discountRate / 12, i), 0
    );

    // Calculate total benefits and costs
    const totalBenefits = monthlyBenefits.reduce((acc, benefit) => acc + benefit, 0);
    const totalCosts = scenario.initialInvestment + 
      scenario.operationalCosts.reduce((acc, cost) => acc + cost, 0);

    // Calculate ROI
    const roi = ((totalBenefits - totalCosts) / totalCosts) * 100;

    // Calculate payback period
    let cumulativeCashFlow = -scenario.initialInvestment;
    let paybackPeriod = 0;
    for (let i = 0; i < monthlyCashFlow.length; i++) {
      cumulativeCashFlow += monthlyBenefits[i] - scenario.operationalCosts[i];
      if (cumulativeCashFlow >= 0) {
        paybackPeriod = i + 1;
        break;
      }
    }

    // Calculate IRR (simplified approximation)
    const irr = calculateIRR(monthlyCashFlow) * 12 * 100; // Annualized percentage

    // Find break-even month
    let breakEvenMonth = paybackPeriod;

    const calculatedMetrics: ROIMetrics = {
      roi,
      npv,
      paybackPeriod,
      irr,
      totalBenefits,
      totalCosts,
      breakEvenMonth
    };

    setMetrics(calculatedMetrics);
    setIsCalculating(false);
  };

  const calculateIRR = (cashFlows: number[]): number => {
    // Simplified IRR calculation using Newton-Raphson method
    let rate = 0.1;
    for (let i = 0; i < 100; i++) {
      const npv = cashFlows.reduce((acc, cf, period) => 
        acc + cf / Math.pow(1 + rate, period), 0
      );
      const dnpv = cashFlows.reduce((acc, cf, period) => 
        acc - period * cf / Math.pow(1 + rate, period + 1), 0
      );
      
      const newRate = rate - npv / dnpv;
      if (Math.abs(newRate - rate) < 0.0001) break;
      rate = newRate;
    }
    return rate;
  };

  const getChartData = () => {
    const scenario = scenarios.find(s => s.id === selectedScenario);
    if (!scenario) return null;

    const months = Array.from({ length: scenario.timeframe }, (_, i) => `Month ${i + 1}`);
    
    return {
      labels: months,
      datasets: [
        {
          label: 'Cost Savings',
          data: scenario.benefits.costSavings,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        },
        {
          label: 'Revenue Increase',
          data: scenario.benefits.revenueIncrease,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: 'Productivity Gains',
          data: scenario.benefits.productivityGains,
          backgroundColor: 'rgba(255, 206, 86, 0.6)',
          borderColor: 'rgba(255, 206, 86, 1)',
          borderWidth: 1
        },
        {
          label: 'Risk Reduction',
          data: scenario.benefits.riskReduction,
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1
        },
        {
          label: 'Operational Costs',
          data: scenario.operationalCosts.map(cost => -cost),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  const getCumulativeChartData = () => {
    const scenario = scenarios.find(s => s.id === selectedScenario);
    if (!scenario) return null;

    let cumulativeBenefits = 0;
    let cumulativeCosts = scenario.initialInvestment;
    
    const months = Array.from({ length: scenario.timeframe }, (_, i) => `Month ${i + 1}`);
    const benefitsData: number[] = [];
    const costsData: number[] = [];
    const netData: number[] = [];

    scenario.benefits.costSavings.forEach((_, i) => {
      const monthlyBenefit = scenario.benefits.costSavings[i] +
        scenario.benefits.revenueIncrease[i] +
        scenario.benefits.productivityGains[i] +
        scenario.benefits.riskReduction[i];
      
      cumulativeBenefits += monthlyBenefit;
      cumulativeCosts += scenario.operationalCosts[i];
      
      benefitsData.push(cumulativeBenefits);
      costsData.push(cumulativeCosts);
      netData.push(cumulativeBenefits - cumulativeCosts);
    });

    return {
      labels: months,
      datasets: [
        {
          label: 'Cumulative Benefits',
          data: benefitsData,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          fill: false,
          tension: 0.4
        },
        {
          label: 'Cumulative Costs',
          data: costsData,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          fill: false,
          tension: 0.4
        },
        {
          label: 'Net Value',
          data: netData,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          fill: false,
          tension: 0.4
        }
      ]
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="comprehensive-roi-engine">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0">ROI Calculation & Modeling Engine</h4>
          <p className="text-muted mb-0">Comprehensive financial analysis and scenario modeling</p>
        </div>
        <button className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>
          Create New Scenario
        </button>
      </div>

      {/* Scenario Selection and Parameters */}
      <div className="row mb-4">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Scenario Selection</h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <label className="form-label">Select Scenario</label>
                  <select
                    className="form-select"
                    value={selectedScenario}
                    onChange={(e) => setSelectedScenario(e.target.value)}
                  >
                    {scenarios.map(scenario => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </option>
                    ))}
                  </select>
                  {scenarios.find(s => s.id === selectedScenario) && (
                    <div className="mt-2">
                      <small className="text-muted">
                        {scenarios.find(s => s.id === selectedScenario)?.description}
                      </small>
                    </div>
                  )}
                </div>
                <div className="col-md-3">
                  <label className="form-label">Discount Rate (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={discountRate * 100}
                    onChange={(e) => setDiscountRate(Number(e.target.value) / 100)}
                    step="0.1"
                    min="0"
                    max="50"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Action</label>
                  <button
                    className="btn btn-primary w-100"
                    onClick={calculateROI}
                    disabled={isCalculating}
                  >
                    {isCalculating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Calculating...
                      </>
                    ) : (
                      'Recalculate ROI'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Key Assumptions</h6>
            </div>
            <div className="card-body">
              {scenarios.find(s => s.id === selectedScenario)?.assumptions.map((assumption, index) => (
                <div key={index} className="d-flex align-items-center mb-1">
                  <i className="bi bi-check-circle text-success me-2"></i>
                  <small>{assumption}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ROI Metrics Dashboard */}
      {metrics && (
        <div className="row mb-4">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Financial Metrics</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-2 text-center">
                    <h3 className={`mb-1 ${metrics.roi > 0 ? 'text-success' : 'text-danger'}`}>
                      {formatPercentage(metrics.roi)}
                    </h3>
                    <p className="text-muted mb-0 small">ROI</p>
                  </div>
                  <div className="col-md-2 text-center">
                    <h3 className={`mb-1 ${metrics.npv > 0 ? 'text-success' : 'text-danger'}`}>
                      {formatCurrency(metrics.npv)}
                    </h3>
                    <p className="text-muted mb-0 small">NPV</p>
                  </div>
                  <div className="col-md-2 text-center">
                    <h3 className="mb-1 text-info">
                      {metrics.paybackPeriod} mo
                    </h3>
                    <p className="text-muted mb-0 small">Payback Period</p>
                  </div>
                  <div className="col-md-2 text-center">
                    <h3 className="mb-1 text-warning">
                      {formatPercentage(metrics.irr)}
                    </h3>
                    <p className="text-muted mb-0 small">IRR</p>
                  </div>
                  <div className="col-md-2 text-center">
                    <h3 className="mb-1 text-success">
                      {formatCurrency(metrics.totalBenefits)}
                    </h3>
                    <p className="text-muted mb-0 small">Total Benefits</p>
                  </div>
                  <div className="col-md-2 text-center">
                    <h3 className="mb-1 text-danger">
                      {formatCurrency(metrics.totalCosts)}
                    </h3>
                    <p className="text-muted mb-0 small">Total Costs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Monthly Benefits & Costs</h6>
            </div>
            <div className="card-body">
              <div style={{ height: '300px' }}>
                {getChartData() && (
                  <Bar
                    data={getChartData()!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: { stacked: true },
                        y: { stacked: true }
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Cumulative Financial Impact</h6>
            </div>
            <div className="card-body">
              <div style={{ height: '300px' }}>
                {getCumulativeChartData() && (
                  <Line
                    data={getCumulativeChartData()!}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        mode: 'index' as const,
                        intersect: false,
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Comparison */}
      <div className="card">
        <div className="card-header">
          <h6 className="mb-0">Scenario Comparison</h6>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Timeframe</th>
                  <th>Initial Investment</th>
                  <th>ROI</th>
                  <th>NPV</th>
                  <th>Payback Period</th>
                  <th>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map(scenario => {
                  const isSelected = scenario.id === selectedScenario;
                  const riskLevel = scenario.name.includes('Conservative') ? 'Low' :
                    scenario.name.includes('Enterprise') ? 'High' : 'Medium';
                  
                  return (
                    <tr
                      key={scenario.id}
                      className={isSelected ? 'table-active' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedScenario(scenario.id)}
                    >
                      <td>
                        <strong>{scenario.name}</strong>
                        <div className="small text-muted">{scenario.description}</div>
                      </td>
                      <td>{scenario.timeframe} months</td>
                      <td>{formatCurrency(scenario.initialInvestment)}</td>
                      <td>
                        {isSelected && metrics ? (
                          <span className={metrics.roi > 0 ? 'text-success' : 'text-danger'}>
                            {formatPercentage(metrics.roi)}
                          </span>
                        ) : (
                          <span className="text-muted">Calculate</span>
                        )}
                      </td>
                      <td>
                        {isSelected && metrics ? (
                          <span className={metrics.npv > 0 ? 'text-success' : 'text-danger'}>
                            {formatCurrency(metrics.npv)}
                          </span>
                        ) : (
                          <span className="text-muted">Calculate</span>
                        )}
                      </td>
                      <td>
                        {isSelected && metrics ? (
                          <span className="text-info">{metrics.paybackPeriod} months</span>
                        ) : (
                          <span className="text-muted">Calculate</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          riskLevel === 'Low' ? 'bg-success' :
                          riskLevel === 'Medium' ? 'bg-warning' : 'bg-danger'
                        }`}>
                          {riskLevel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};