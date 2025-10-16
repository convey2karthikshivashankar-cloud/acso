#!/usr/bin/env python3
"""
ACSO Performance Test Runner

Comprehensive performance test runner that orchestrates load testing,
scalability testing, and stress testing for the ACSO system.
"""

import asyncio
import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

# Import test modules
from test_load_scenarios import run_performance_tests as run_load_tests
from test_scalability import run_scalability_tests


class PerformanceTestSuite:
    """Main performance test suite runner."""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.test_results = {}
        self.start_time = None
        self.end_time = None
        
    async def run_all_performance_tests(self, test_filter: Optional[str] = None) -> Dict[str, Any]:
        """Run all performance tests."""
        print("⚡ Starting ACSO Performance Test Suite")
        print("=" * 60)
        
        self.start_time = time.time()
        
        # Define test suites
        test_suites = {
            "load": {
                "name": "Load and Performance Tests",
                "runner": run_load_tests,
                "description": "High-volume operations and performance validation"
            },
            "scalability": {
                "name": "Scalability and Stress Tests", 
                "runner": run_scalability_tests,
                "description": "System scalability and breaking point analysis"
            }
        }
        
        # Filter tests if specified
        if test_filter:
            if test_filter in test_suites:
                test_suites = {test_filter: test_suites[test_filter]}
            else:
                print(f"❌ Unknown test filter: {test_filter}")
                print(f"Available filters: {', '.join(test_suites.keys())}")
                return {"success": False, "error": "Invalid test filter"}
        
        # Run test suites
        total_suites = len(test_suites)
        passed_suites = 0
        
        for suite_key, suite_info in test_suites.items():
            print(f"\n⚡ Running {suite_info['name']}")
            print(f"📝 {suite_info['description']}")
            print("-" * 50)
            
            suite_start_time = time.time()
            
            try:
                success = await suite_info['runner']()
                suite_end_time = time.time()
                suite_duration = suite_end_time - suite_start_time
                
                self.test_results[suite_key] = {
                    "name": suite_info['name'],
                    "success": success,
                    "duration": suite_duration,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                if success:
                    passed_suites += 1
                    print(f"✅ {suite_info['name']} completed successfully ({suite_duration:.2f}s)")
                else:
                    print(f"❌ {suite_info['name']} failed ({suite_duration:.2f}s)")
                    
            except Exception as e:
                suite_end_time = time.time()
                suite_duration = suite_end_time - suite_start_time
                
                self.test_results[suite_key] = {
                    "name": suite_info['name'],
                    "success": False,
                    "error": str(e),
                    "duration": suite_duration,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
                print(f"💥 {suite_info['name']} crashed: {e} ({suite_duration:.2f}s)")
        
        self.end_time = time.time()
        total_duration = self.end_time - self.start_time
        
        # Generate summary
        print("\n" + "=" * 60)
        print("📊 PERFORMANCE TEST SUMMARY")
        print("=" * 60)
        print(f"Total Test Suites: {total_suites}")
        print(f"Passed: {passed_suites}")
        print(f"Failed: {total_suites - passed_suites}")
        print(f"Success Rate: {(passed_suites/total_suites)*100:.1f}%")
        print(f"Total Duration: {total_duration:.2f} seconds")
        
        # Detailed results
        for suite_key, result in self.test_results.items():
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            print(f"  {status} {result['name']} ({result['duration']:.2f}s)")
            if 'error' in result:
                print(f"    Error: {result['error']}")
        
        overall_success = passed_suites == total_suites
        
        if overall_success:
            print("\n🎉 All performance tests passed!")
        else:
            print(f"\n⚠️  {total_suites - passed_suites} test suite(s) failed!")
            
        return {
            "success": overall_success,
            "total_suites": total_suites,
            "passed_suites": passed_suites,
            "failed_suites": total_suites - passed_suites,
            "duration": total_duration,
            "results": self.test_results
        }
        
    async def run_quick_performance_check(self) -> Dict[str, Any]:
        """Run quick performance validation tests."""
        print("🚀 Running Quick Performance Check")
        print("-" * 40)
        
        quick_tests = [
            self._test_basic_throughput,
            self._test_response_time_baseline,
            self._test_resource_utilization,
            self._test_concurrent_user_handling
        ]
        
        passed_tests = 0
        total_tests = len(quick_tests)
        
        for test in quick_tests:
            try:
                test_name = test.__name__.replace('_test_', '').replace('_', ' ').title()
                print(f"  Running {test_name}...")
                
                success = await test()
                if success:
                    passed_tests += 1
                    print(f"  ✅ {test_name} passed")
                else:
                    print(f"  ❌ {test_name} failed")
                    
            except Exception as e:
                print(f"  💥 {test_name} crashed: {e}")
                
        success_rate = (passed_tests / total_tests) * 100
        print(f"\n📊 Quick Check Results: {passed_tests}/{total_tests} passed ({success_rate:.1f}%)")
        
        return {
            "success": passed_tests == total_tests,
            "passed": passed_tests,
            "total": total_tests,
            "success_rate": success_rate
        }
        
    async def _test_basic_throughput(self) -> bool:
        """Test basic system throughput."""
        from test_load_scenarios import PerformanceTestFramework, LoadTestConfig
        
        try:
            framework = PerformanceTestFramework()
            await framework.setup_test_environment()
            
            # Quick throughput test
            config = LoadTestConfig(
                concurrent_users=10,
                test_duration=30,
                ramp_up_time=5,
                operations_per_second=5.0,
                scenario_type="threat_detection",
                data_size="small",
                complexity_level="simple"
            )
            
            metrics = await framework.run_load_test(config)
            
            # Validate throughput meets minimum requirements
            throughput_ok = metrics.throughput >= 3.0  # At least 3 ops/sec
            success_rate_ok = metrics.success_rate >= 90  # At least 90% success
            
            await framework.teardown_test_environment()
            
            return throughput_ok and success_rate_ok
            
        except Exception:
            return False
            
    async def _test_response_time_baseline(self) -> bool:
        """Test response time baseline."""
        from test_load_scenarios import PerformanceTestFramework, LoadTestConfig
        
        try:
            framework = PerformanceTestFramework()
            await framework.setup_test_environment()
            
            # Response time test
            config = LoadTestConfig(
                concurrent_users=5,
                test_duration=30,
                ramp_up_time=5,
                operations_per_second=2.0,
                scenario_type="service_orchestration",
                data_size="small",
                complexity_level="simple"
            )
            
            metrics = await framework.run_load_test(config)
            
            # Validate response times
            avg_response_ok = metrics.avg_response_time <= 5.0  # Under 5 seconds
            p95_response_ok = metrics.p95_response_time <= 10.0  # P95 under 10 seconds
            
            await framework.teardown_test_environment()
            
            return avg_response_ok and p95_response_ok
            
        except Exception:
            return False
            
    async def _test_resource_utilization(self) -> bool:
        """Test resource utilization patterns."""
        from test_load_scenarios import PerformanceTestFramework, LoadTestConfig
        
        try:
            framework = PerformanceTestFramework()
            await framework.setup_test_environment()
            
            # Resource utilization test
            config = LoadTestConfig(
                concurrent_users=20,
                test_duration=45,
                ramp_up_time=10,
                operations_per_second=8.0,
                scenario_type="mixed_workload",
                data_size="medium",
                complexity_level="medium"
            )
            
            metrics = await framework.run_load_test(config)
            
            # Validate resource usage is reasonable
            cpu_ok = metrics.cpu_usage.get('avg_percent', 0) <= 80  # Under 80% CPU
            memory_ok = metrics.memory_usage.get('avg_percent', 0) <= 80  # Under 80% memory
            
            await framework.teardown_test_environment()
            
            return cpu_ok and memory_ok
            
        except Exception:
            return False
            
    async def _test_concurrent_user_handling(self) -> bool:
        """Test concurrent user handling capability."""
        from test_load_scenarios import PerformanceTestFramework, LoadTestConfig
        
        try:
            framework = PerformanceTestFramework()
            await framework.setup_test_environment()
            
            # Concurrent user test
            config = LoadTestConfig(
                concurrent_users=50,
                test_duration=60,
                ramp_up_time=15,
                operations_per_second=20.0,
                scenario_type="threat_detection",
                data_size="medium",
                complexity_level="medium"
            )
            
            metrics = await framework.run_load_test(config)
            
            # Validate system handles concurrent users well
            success_rate_ok = metrics.success_rate >= 85  # At least 85% success
            throughput_ok = metrics.throughput >= 15.0  # At least 15 ops/sec
            
            await framework.teardown_test_environment()
            
            return success_rate_ok and throughput_ok
            
        except Exception:
            return False
            
    def generate_performance_report(self, output_file: Optional[str] = None) -> Dict[str, Any]:
        """Generate comprehensive performance report."""
        report = {
            "test_run": {
                "timestamp": datetime.utcnow().isoformat(),
                "duration": self.end_time - self.start_time if self.end_time else 0,
                "environment": "performance_test"
            },
            "summary": {
                "total_suites": len(self.test_results),
                "passed_suites": sum(1 for r in self.test_results.values() if r['success']),
                "failed_suites": sum(1 for r in self.test_results.values() if not r['success']),
                "overall_success": all(r['success'] for r in self.test_results.values())
            },
            "results": self.test_results,
            "configuration": self.config,
            "performance_analysis": self._analyze_performance_trends(),
            "recommendations": self._generate_performance_recommendations()
        }
        
        if output_file:
            with open(output_file, 'w') as f:
                json.dump(report, f, indent=2)
            print(f"📄 Performance report saved to {output_file}")
            
        return report
        
    def _analyze_performance_trends(self) -> Dict[str, Any]:
        """Analyze performance trends across test suites."""
        # This would analyze trends if we had historical data
        return {
            "trend_analysis": "Performance trend analysis requires historical data",
            "current_status": "baseline_established" if all(r['success'] for r in self.test_results.values()) else "issues_detected"
        }
        
    def _generate_performance_recommendations(self) -> List[str]:
        """Generate performance optimization recommendations."""
        recommendations = []
        
        failed_suites = [r for r in self.test_results.values() if not r['success']]
        
        if not failed_suites:
            recommendations.append("All performance tests passed - system performance is acceptable")
        else:
            for suite in failed_suites:
                if "load" in suite['name'].lower():
                    recommendations.append("Load test failures detected - optimize throughput and response times")
                if "scalability" in suite['name'].lower():
                    recommendations.append("Scalability issues detected - investigate resource bottlenecks and scaling limits")
                    
        # General recommendations
        recommendations.extend([
            "Monitor performance metrics in production",
            "Set up automated performance regression testing",
            "Establish performance baselines for future comparisons",
            "Consider implementing performance budgets for CI/CD pipeline"
        ])
        
        return recommendations


async def main():
    """Main entry point for performance test runner."""
    parser = argparse.ArgumentParser(description="ACSO Performance Test Runner")
    parser.add_argument(
        "--filter", 
        choices=["load", "scalability"],
        help="Run specific test suite only"
    )
    parser.add_argument(
        "--quick-check",
        action="store_true",
        help="Run only quick performance validation tests"
    )
    parser.add_argument(
        "--output",
        help="Output file for test results (JSON format)"
    )
    parser.add_argument(
        "--config",
        help="Configuration file for test runner"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    
    args = parser.parse_args()
    
    # Load configuration if provided
    config = {}
    if args.config:
        try:
            with open(args.config, 'r') as f:
                config = json.load(f)
        except Exception as e:
            print(f"❌ Failed to load config file: {e}")
            return 1
    
    # Create test runner
    runner = PerformanceTestSuite(config)
    
    try:
        if args.quick_check:
            # Run quick performance check
            results = await runner.run_quick_performance_check()
        else:
            # Run full performance tests
            results = await runner.run_all_performance_tests(args.filter)
            
        # Generate report
        if args.output:
            runner.generate_performance_report(args.output)
            
        # Return appropriate exit code
        return 0 if results['success'] else 1
        
    except KeyboardInterrupt:
        print("\n⚠️  Performance test run interrupted by user")
        return 130
    except Exception as e:
        print(f"💥 Performance test runner crashed: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))