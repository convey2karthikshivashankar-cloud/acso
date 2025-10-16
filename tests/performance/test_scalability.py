#!/usr/bin/env python3
"""
ACSO Scalability Testing

Tests for system scalability, resource utilization patterns,
and performance characteristics under varying load conditions.
"""

import asyncio
import json
import time
import uuid
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from test_load_scenarios import (
    PerformanceTestFramework, LoadTestConfig, PerformanceMetrics, SystemMonitor
)


@dataclass
class ScalabilityTestResult:
    """Scalability test result data structure."""
    load_level: int
    concurrent_users: int
    operations_per_second: float
    throughput: float
    response_time: float
    success_rate: float
    cpu_utilization: float
    memory_utilization: float
    error_rate: float
    saturation_point: bool


class ScalabilityTestRunner:
    """Runner for scalability tests."""
    
    def __init__(self):
        self.framework = PerformanceTestFramework()
        self.results = []
        
    async def run_scalability_tests(self) -> Dict[str, Any]:
        """Run comprehensive scalability tests."""
        print("📈 Starting ACSO Scalability Tests")
        print("=" * 50)
        
        await self.framework.setup_test_environment()
        
        try:
            # Test different load levels
            load_levels = [
                {"users": 5, "ops": 2.0, "duration": 60},
                {"users": 10, "ops": 5.0, "duration": 60},
                {"users": 25, "ops": 12.0, "duration": 90},
                {"users": 50, "ops": 25.0, "duration": 90},
                {"users": 100, "ops": 50.0, "duration": 120},
                {"users": 200, "ops": 100.0, "duration": 120},
                {"users": 500, "ops": 200.0, "duration": 180},
                {"users": 1000, "ops": 400.0, "duration": 180}
            ]
            
            for i, level in enumerate(load_levels, 1):
                print(f"\n🧪 Load Level {i}/{len(load_levels)}")
                print(f"   Users: {level['users']}, Target OPS: {level['ops']}")
                
                config = LoadTestConfig(
                    concurrent_users=level["users"],
                    test_duration=level["duration"],
                    ramp_up_time=min(30, level["duration"] // 4),
                    operations_per_second=level["ops"],
                    scenario_type="mixed_workload",
                    data_size="medium",
                    complexity_level="medium"
                )
                
                try:
                    metrics = await self.framework.run_load_test(config)
                    
                    # Convert to scalability result
                    result = ScalabilityTestResult(
                        load_level=i,
                        concurrent_users=level["users"],
                        operations_per_second=level["ops"],
                        throughput=metrics.throughput,
                        response_time=metrics.avg_response_time,
                        success_rate=metrics.success_rate,
                        cpu_utilization=metrics.cpu_usage.get('avg_percent', 0),
                        memory_utilization=metrics.memory_usage.get('avg_percent', 0),
                        error_rate=100 - metrics.success_rate,
                        saturation_point=self._detect_saturation(metrics, level["ops"])
                    )
                    
                    self.results.append(result)
                    
                    print(f"   ✅ Throughput: {result.throughput:.2f} ops/sec")
                    print(f"   ⏱️  Response Time: {result.response_time:.3f}s")
                    print(f"   📊 Success Rate: {result.success_rate:.1f}%")
                    print(f"   🖥️  CPU: {result.cpu_utilization:.1f}%")
                    
                    # Check if we've hit saturation
                    if result.saturation_point:
                        print(f"   ⚠️  Saturation point detected!")
                        
                except Exception as e:
                    print(f"   ❌ Load level failed: {e}")
                    
                # Cool down between tests
                if i < len(load_levels):
                    await asyncio.sleep(15)
                    
            return self._analyze_scalability_results()
            
        finally:
            await self.framework.teardown_test_environment()
            
    def _detect_saturation(self, metrics: PerformanceMetrics, target_ops: float) -> bool:
        """Detect if system has reached saturation point."""
        # Saturation indicators
        throughput_ratio = metrics.throughput / target_ops if target_ops > 0 else 0
        high_response_time = metrics.avg_response_time > 5.0
        high_error_rate = metrics.success_rate < 90
        high_cpu = metrics.cpu_usage.get('avg_percent', 0) > 90
        high_memory = metrics.memory_usage.get('avg_percent', 0) > 90
        
        # System is saturated if multiple indicators are triggered
        saturation_indicators = sum([
            throughput_ratio < 0.7,  # Throughput significantly below target
            high_response_time,
            high_error_rate,
            high_cpu,
            high_memory
        ])
        
        return saturation_indicators >= 2
        
    def _analyze_scalability_results(self) -> Dict[str, Any]:
        """Analyze scalability test results."""
        if not self.results:
            return {"error": "No scalability results available"}
            
        # Find scalability characteristics
        max_throughput = max(r.throughput for r in self.results)
        max_throughput_result = next(r for r in self.results if r.throughput == max_throughput)
        
        # Find saturation point
        saturation_results = [r for r in self.results if r.saturation_point]
        saturation_point = saturation_results[0] if saturation_results else None
        
        # Calculate scalability metrics
        linear_scalability = self._calculate_linear_scalability()
        efficiency_curve = self._calculate_efficiency_curve()
        
        analysis = {
            "scalability_summary": {
                "max_throughput": max_throughput,
                "max_throughput_users": max_throughput_result.concurrent_users,
                "saturation_point_users": saturation_point.concurrent_users if saturation_point else None,
                "linear_scalability_score": linear_scalability,
                "efficiency_at_max_load": efficiency_curve[-1] if efficiency_curve else 0
            },
            "performance_characteristics": {
                "throughput_curve": [r.throughput for r in self.results],
                "response_time_curve": [r.response_time for r in self.results],
                "success_rate_curve": [r.success_rate for r in self.results],
                "cpu_utilization_curve": [r.cpu_utilization for r in self.results],
                "memory_utilization_curve": [r.memory_utilization for r in self.results]
            },
            "load_levels": [r.concurrent_users for r in self.results],
            "efficiency_curve": efficiency_curve,
            "bottleneck_analysis": self._analyze_bottlenecks(),
            "scaling_recommendations": self._generate_scaling_recommendations()
        }
        
        return analysis
        
    def _calculate_linear_scalability(self) -> float:
        """Calculate linear scalability score (0-100)."""
        if len(self.results) < 2:
            return 0
            
        # Compare actual throughput increase vs ideal linear increase
        first_result = self.results[0]
        last_result = self.results[-1]
        
        user_ratio = last_result.concurrent_users / first_result.concurrent_users
        throughput_ratio = last_result.throughput / first_result.throughput
        
        # Perfect linear scalability would have throughput_ratio == user_ratio
        scalability_score = min(100, (throughput_ratio / user_ratio) * 100)
        
        return scalability_score
        
    def _calculate_efficiency_curve(self) -> List[float]:
        """Calculate efficiency curve (throughput per user)."""
        return [r.throughput / r.concurrent_users for r in self.results]
        
    def _analyze_bottlenecks(self) -> Dict[str, Any]:
        """Analyze system bottlenecks from scalability results."""
        bottlenecks = {
            "cpu_bottleneck": False,
            "memory_bottleneck": False,
            "io_bottleneck": False,
            "application_bottleneck": False
        }
        
        # Analyze resource utilization patterns
        high_cpu_results = [r for r in self.results if r.cpu_utilization > 80]
        high_memory_results = [r for r in self.results if r.memory_utilization > 80]
        
        if high_cpu_results:
            bottlenecks["cpu_bottleneck"] = True
            bottlenecks["cpu_bottleneck_at_users"] = high_cpu_results[0].concurrent_users
            
        if high_memory_results:
            bottlenecks["memory_bottleneck"] = True
            bottlenecks["memory_bottleneck_at_users"] = high_memory_results[0].concurrent_users
            
        # Check for application-level bottlenecks
        degrading_response_time = any(
            self.results[i].response_time > self.results[i-1].response_time * 2
            for i in range(1, len(self.results))
        )
        
        if degrading_response_time:
            bottlenecks["application_bottleneck"] = True
            
        return bottlenecks
        
    def _generate_scaling_recommendations(self) -> List[str]:
        """Generate scaling recommendations based on results."""
        recommendations = []
        
        if not self.results:
            return ["No data available for recommendations"]
            
        bottlenecks = self._analyze_bottlenecks()
        max_cpu = max(r.cpu_utilization for r in self.results)
        max_memory = max(r.memory_utilization for r in self.results)
        
        # CPU recommendations
        if bottlenecks["cpu_bottleneck"]:
            recommendations.append(
                f"CPU bottleneck detected at {bottlenecks['cpu_bottleneck_at_users']} users - "
                "consider vertical scaling (more CPU cores) or horizontal scaling (more instances)"
            )
        elif max_cpu > 60:
            recommendations.append(
                "CPU utilization approaching limits - monitor and prepare for scaling"
            )
            
        # Memory recommendations
        if bottlenecks["memory_bottleneck"]:
            recommendations.append(
                f"Memory bottleneck detected at {bottlenecks['memory_bottleneck_at_users']} users - "
                "increase memory allocation or optimize memory usage"
            )
        elif max_memory > 60:
            recommendations.append(
                "Memory utilization increasing - monitor for memory leaks and optimize allocation"
            )
            
        # Application-level recommendations
        if bottlenecks["application_bottleneck"]:
            recommendations.append(
                "Application-level bottleneck detected - optimize algorithms, add caching, "
                "or implement connection pooling"
            )
            
        # Scalability recommendations
        linear_scalability = self._calculate_linear_scalability()
        if linear_scalability < 70:
            recommendations.append(
                f"Poor linear scalability ({linear_scalability:.1f}%) - "
                "investigate synchronization bottlenecks and shared resource contention"
            )
            
        # Throughput recommendations
        max_throughput = max(r.throughput for r in self.results)
        if max_throughput < 50:
            recommendations.append(
                "Low maximum throughput - optimize message processing and workflow coordination"
            )
            
        if not recommendations:
            recommendations.append("System shows good scalability characteristics")
            
        return recommendations
        
    def generate_scalability_report(self, output_file: Optional[str] = None) -> Dict[str, Any]:
        """Generate detailed scalability report."""
        analysis = self._analyze_scalability_results()
        
        report = {
            "test_metadata": {
                "timestamp": datetime.utcnow().isoformat(),
                "test_type": "scalability",
                "total_load_levels": len(self.results)
            },
            "scalability_analysis": analysis,
            "detailed_results": [
                {
                    "load_level": r.load_level,
                    "concurrent_users": r.concurrent_users,
                    "target_ops": r.operations_per_second,
                    "actual_throughput": r.throughput,
                    "response_time": r.response_time,
                    "success_rate": r.success_rate,
                    "cpu_utilization": r.cpu_utilization,
                    "memory_utilization": r.memory_utilization,
                    "saturation_point": r.saturation_point
                }
                for r in self.results
            ]
        }
        
        if output_file:
            with open(output_file, 'w') as f:
                json.dump(report, f, indent=2)
            print(f"📄 Scalability report saved to {output_file}")
            
        return report


class StressTestRunner:
    """Runner for stress tests to find system breaking points."""
    
    def __init__(self):
        self.framework = PerformanceTestFramework()
        self.stress_results = []
        
    async def run_stress_tests(self) -> Dict[str, Any]:
        """Run stress tests to find system limits."""
        print("💥 Starting ACSO Stress Tests")
        print("=" * 40)
        
        await self.framework.setup_test_environment()
        
        try:
            # Gradually increase load until system breaks
            current_users = 50
            max_users = 2000
            increment = 50
            
            while current_users <= max_users:
                print(f"\n🔥 Stress Test - {current_users} concurrent users")
                
                config = LoadTestConfig(
                    concurrent_users=current_users,
                    test_duration=120,  # 2 minutes
                    ramp_up_time=30,
                    operations_per_second=current_users * 0.5,  # 0.5 ops per user
                    scenario_type="mixed_workload",
                    data_size="large",
                    complexity_level="complex"
                )
                
                try:
                    metrics = await self.framework.run_load_test(config)
                    
                    stress_result = {
                        "concurrent_users": current_users,
                        "throughput": metrics.throughput,
                        "response_time": metrics.avg_response_time,
                        "success_rate": metrics.success_rate,
                        "cpu_utilization": metrics.cpu_usage.get('avg_percent', 0),
                        "memory_utilization": metrics.memory_usage.get('avg_percent', 0),
                        "system_stable": metrics.success_rate > 80 and metrics.avg_response_time < 10
                    }
                    
                    self.stress_results.append(stress_result)
                    
                    print(f"   📊 Success Rate: {stress_result['success_rate']:.1f}%")
                    print(f"   ⏱️  Response Time: {stress_result['response_time']:.3f}s")
                    print(f"   🖥️  CPU: {stress_result['cpu_utilization']:.1f}%")
                    
                    # Check if system is breaking down
                    if not stress_result["system_stable"]:
                        print(f"   ⚠️  System instability detected at {current_users} users")
                        break
                        
                except Exception as e:
                    print(f"   💥 System failure at {current_users} users: {e}")
                    break
                    
                current_users += increment
                await asyncio.sleep(10)  # Brief recovery time
                
            return self._analyze_stress_results()
            
        finally:
            await self.framework.teardown_test_environment()
            
    def _analyze_stress_results(self) -> Dict[str, Any]:
        """Analyze stress test results."""
        if not self.stress_results:
            return {"error": "No stress test results available"}
            
        # Find breaking point
        stable_results = [r for r in self.stress_results if r["system_stable"]]
        max_stable_users = max(r["concurrent_users"] for r in stable_results) if stable_results else 0
        
        # Find performance degradation points
        degradation_points = []
        for i in range(1, len(self.stress_results)):
            prev_result = self.stress_results[i-1]
            curr_result = self.stress_results[i]
            
            # Check for significant performance degradation
            response_time_increase = (
                curr_result["response_time"] / prev_result["response_time"] 
                if prev_result["response_time"] > 0 else 1
            )
            
            success_rate_decrease = prev_result["success_rate"] - curr_result["success_rate"]
            
            if response_time_increase > 2.0 or success_rate_decrease > 10:
                degradation_points.append({
                    "users": curr_result["concurrent_users"],
                    "response_time_increase": response_time_increase,
                    "success_rate_decrease": success_rate_decrease
                })
                
        return {
            "stress_summary": {
                "max_stable_users": max_stable_users,
                "total_test_levels": len(self.stress_results),
                "breaking_point_found": len(stable_results) < len(self.stress_results),
                "degradation_points": len(degradation_points)
            },
            "performance_degradation": degradation_points,
            "stress_curve": {
                "users": [r["concurrent_users"] for r in self.stress_results],
                "throughput": [r["throughput"] for r in self.stress_results],
                "response_time": [r["response_time"] for r in self.stress_results],
                "success_rate": [r["success_rate"] for r in self.stress_results]
            },
            "resource_limits": {
                "max_cpu": max(r["cpu_utilization"] for r in self.stress_results),
                "max_memory": max(r["memory_utilization"] for r in self.stress_results)
            },
            "stress_recommendations": self._generate_stress_recommendations()
        }
        
    def _generate_stress_recommendations(self) -> List[str]:
        """Generate recommendations based on stress test results."""
        recommendations = []
        
        if not self.stress_results:
            return ["No stress test data available"]
            
        stable_results = [r for r in self.stress_results if r["system_stable"]]
        max_stable_users = max(r["concurrent_users"] for r in stable_results) if stable_results else 0
        
        if max_stable_users < 100:
            recommendations.append(
                f"Low user capacity ({max_stable_users} users) - significant scaling improvements needed"
            )
        elif max_stable_users < 500:
            recommendations.append(
                f"Moderate user capacity ({max_stable_users} users) - consider optimization for higher loads"
            )
        else:
            recommendations.append(
                f"Good user capacity ({max_stable_users} users) - system handles load well"
            )
            
        # Resource-based recommendations
        max_cpu = max(r["cpu_utilization"] for r in self.stress_results)
        max_memory = max(r["memory_utilization"] for r in self.stress_results)
        
        if max_cpu > 95:
            recommendations.append("CPU exhaustion detected - add more CPU cores or optimize processing")
        if max_memory > 95:
            recommendations.append("Memory exhaustion detected - increase memory or optimize usage")
            
        return recommendations


# Test runner and utilities
async def run_scalability_tests():
    """Run all scalability and stress tests."""
    print("📈 Starting ACSO Scalability and Stress Tests...")
    
    # Run scalability tests
    scalability_runner = ScalabilityTestRunner()
    scalability_results = await scalability_runner.run_scalability_tests()
    
    # Generate scalability report
    scalability_report = scalability_runner.generate_scalability_report("scalability_report.json")
    
    # Run stress tests
    stress_runner = StressTestRunner()
    stress_results = await stress_runner.run_stress_tests()
    
    # Print combined summary
    print("\n" + "=" * 60)
    print("📊 SCALABILITY & STRESS TEST SUMMARY")
    print("=" * 60)
    
    # Scalability summary
    scalability_summary = scalability_results.get("scalability_summary", {})
    print(f"Max Throughput: {scalability_summary.get('max_throughput', 0):.2f} ops/sec")
    print(f"Max Throughput Users: {scalability_summary.get('max_throughput_users', 0)}")
    print(f"Linear Scalability Score: {scalability_summary.get('linear_scalability_score', 0):.1f}%")
    
    # Stress test summary
    stress_summary = stress_results.get("stress_summary", {})
    print(f"Max Stable Users: {stress_summary.get('max_stable_users', 0)}")
    print(f"Breaking Point Found: {stress_summary.get('breaking_point_found', False)}")
    
    # Combined recommendations
    scalability_recs = scalability_results.get("scaling_recommendations", [])
    stress_recs = stress_results.get("stress_recommendations", [])
    
    all_recommendations = scalability_recs + stress_recs
    if all_recommendations:
        print(f"\n💡 Recommendations:")
        for i, rec in enumerate(set(all_recommendations), 1):  # Remove duplicates
            print(f"  {i}. {rec}")
            
    # Determine overall success
    max_throughput = scalability_summary.get('max_throughput', 0)
    max_users = stress_summary.get('max_stable_users', 0)
    
    if max_throughput >= 50 and max_users >= 200:
        print("\n🎉 Scalability tests completed successfully!")
        return True
    else:
        print(f"\n⚠️  Scalability tests show limitations (Throughput: {max_throughput:.1f}, Users: {max_users})")
        return False


if __name__ == "__main__":
    import sys
    
    # Run the scalability tests
    success = asyncio.run(run_scalability_tests())
    sys.exit(0 if success else 1)