#!/usr/bin/env python3
"""
ACSO Integration Test Runner

Comprehensive test runner for all ACSO integration tests including
end-to-end workflows, cross-agent communication, and human approval workflows.
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
from test_end_to_end_workflows import run_integration_tests as run_e2e_tests
from test_cross_agent_communication import run_communication_tests
from test_human_approval_workflows import run_human_approval_tests


class IntegrationTestRunner:
    """Main integration test runner."""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.test_results = {}
        self.start_time = None
        self.end_time = None
        
    async def run_all_tests(self, test_filter: Optional[str] = None) -> Dict[str, Any]:
        """Run all integration tests."""
        print("🚀 Starting ACSO Integration Test Suite")
        print("=" * 60)
        
        self.start_time = time.time()
        
        # Define test suites
        test_suites = {
            "end_to_end": {
                "name": "End-to-End Workflow Tests",
                "runner": run_e2e_tests,
                "description": "Complete workflow testing from threat detection to resolution"
            },
            "communication": {
                "name": "Cross-Agent Communication Tests", 
                "runner": run_communication_tests,
                "description": "Message passing and coordination between agents"
            },
            "human_approval": {
                "name": "Human Approval Workflow Tests",
                "runner": run_human_approval_tests,
                "description": "Human-in-the-loop approval and escalation workflows"
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
            print(f"\n🧪 Running {suite_info['name']}")
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
        print("📊 INTEGRATION TEST SUMMARY")
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
            print("\n🎉 All integration tests passed!")
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
        
    async def run_smoke_tests(self) -> Dict[str, Any]:
        """Run quick smoke tests to verify basic functionality."""
        print("💨 Running Integration Smoke Tests")
        print("-" * 40)
        
        smoke_tests = [
            self._test_message_bus_connectivity,
            self._test_agent_initialization,
            self._test_basic_workflow_creation,
            self._test_human_interface_connectivity
        ]
        
        passed_tests = 0
        total_tests = len(smoke_tests)
        
        for test in smoke_tests:
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
        print(f"\n📊 Smoke Test Results: {passed_tests}/{total_tests} passed ({success_rate:.1f}%)")
        
        return {
            "success": passed_tests == total_tests,
            "passed": passed_tests,
            "total": total_tests,
            "success_rate": success_rate
        }
        
    async def _test_message_bus_connectivity(self) -> bool:
        """Test message bus basic connectivity."""
        from src.shared.communication import MessageBus
        
        try:
            message_bus = MessageBus()
            await message_bus.initialize()
            
            # Test basic operations
            is_healthy = await message_bus.health_check()
            
            await message_bus.shutdown()
            return is_healthy
        except Exception:
            return False
            
    async def _test_agent_initialization(self) -> bool:
        """Test basic agent initialization."""
        from src.agents.supervisor_agent import SupervisorAgent
        
        try:
            supervisor = SupervisorAgent()
            await supervisor.start()
            
            # Test basic agent functionality
            is_running = supervisor.is_running()
            
            await supervisor.stop()
            return is_running
        except Exception:
            return False
            
    async def _test_basic_workflow_creation(self) -> bool:
        """Test basic workflow creation."""
        from src.shared.coordination import WorkflowCoordinator
        from src.shared.communication import MessageBus
        
        try:
            message_bus = MessageBus()
            await message_bus.initialize()
            
            coordinator = WorkflowCoordinator()
            await coordinator.initialize(message_bus)
            
            # Create test workflow
            workflow_id = await coordinator.create_workflow("test_workflow")
            
            # Verify workflow exists
            workflow_exists = await coordinator.workflow_exists(workflow_id)
            
            await coordinator.shutdown()
            await message_bus.shutdown()
            
            return workflow_exists
        except Exception:
            return False
            
    async def _test_human_interface_connectivity(self) -> bool:
        """Test human interface basic connectivity."""
        from src.shared.human_interface import HumanApprovalInterface
        
        try:
            human_interface = HumanApprovalInterface()
            await human_interface.initialize()
            
            # Test basic operations
            is_healthy = await human_interface.health_check()
            
            await human_interface.shutdown()
            return is_healthy
        except Exception:
            return False
            
    def generate_report(self, output_file: Optional[str] = None) -> Dict[str, Any]:
        """Generate detailed test report."""
        report = {
            "test_run": {
                "timestamp": datetime.utcnow().isoformat(),
                "duration": self.end_time - self.start_time if self.end_time else 0,
                "environment": "integration_test"
            },
            "summary": {
                "total_suites": len(self.test_results),
                "passed_suites": sum(1 for r in self.test_results.values() if r['success']),
                "failed_suites": sum(1 for r in self.test_results.values() if not r['success']),
                "overall_success": all(r['success'] for r in self.test_results.values())
            },
            "results": self.test_results,
            "configuration": self.config
        }
        
        if output_file:
            with open(output_file, 'w') as f:
                json.dump(report, f, indent=2)
            print(f"📄 Test report saved to {output_file}")
            
        return report


async def main():
    """Main entry point for integration test runner."""
    parser = argparse.ArgumentParser(description="ACSO Integration Test Runner")
    parser.add_argument(
        "--filter", 
        choices=["end_to_end", "communication", "human_approval"],
        help="Run specific test suite only"
    )
    parser.add_argument(
        "--smoke-only",
        action="store_true",
        help="Run only smoke tests"
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
    runner = IntegrationTestRunner(config)
    
    try:
        if args.smoke_only:
            # Run smoke tests only
            results = await runner.run_smoke_tests()
        else:
            # Run full integration tests
            results = await runner.run_all_tests(args.filter)
            
        # Generate report
        if args.output:
            runner.generate_report(args.output)
            
        # Return appropriate exit code
        return 0 if results['success'] else 1
        
    except KeyboardInterrupt:
        print("\n⚠️  Test run interrupted by user")
        return 130
    except Exception as e:
        print(f"💥 Test runner crashed: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))