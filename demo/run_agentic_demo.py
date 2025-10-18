#!/usr/bin/env python3
"""
ACSO Agentic Demo Runner

Interactive demonstration runner for ACSO's autonomous AI agents.
Provides a command-line interface to trigger and monitor agent scenarios.
"""

import asyncio
import json
import sys
import time
from datetime import datetime
from typing import Dict, Any

from agentic_scenarios.demo_orchestrator import demo_orchestrator, ScenarioType


class AgenticDemoRunner:
    """Interactive demo runner for ACSO agentic scenarios."""
    
    def __init__(self):
        self.running = True
        self.current_scenario = None
    
    def print_banner(self):
        """Print the demo banner."""
        banner = """
╔══════════════════════════════════════════════════════════════════════════════╗
║                    ACSO Agentic AI Demonstration System                      ║
║                                                                              ║
║  Experience autonomous AI agents working together to handle cybersecurity,   ║
║  cost optimization, and service orchestration challenges in real-time.      ║
╚══════════════════════════════════════════════════════════════════════════════╝
        """
        print(banner)
    
    def print_menu(self):
        """Print the main menu."""
        print("\n" + "="*80)
        print("ACSO AGENTIC DEMO - MAIN MENU")
        print("="*80)
        print("1. View Available Scenarios")
        print("2. View Agent Status")
        print("3. Start Scenario")
        print("4. Monitor Active Scenarios")
        print("5. View Demo Metrics")
        print("6. Generate Sample Data")
        print("7. Reset Demo Environment")
        print("8. Exit")
        print("="*80)
    
    def display_scenarios(self):
        """Display available scenarios."""
        scenarios = demo_orchestrator.get_available_scenarios()
        
        print("\n" + "="*80)
        print("AVAILABLE AGENTIC SCENARIOS")
        print("="*80)
        
        for i, scenario in enumerate(scenarios, 1):
            status_indicator = "🟢" if scenario["status"] == "ready" else "🔴" if scenario["status"] == "running" else "⚪"
            complexity_stars = "⭐" * scenario["complexity_level"]
            
            print(f"\n{i}. {status_indicator} {scenario['name']}")
            print(f"   Type: {scenario['type'].replace('_', ' ').title()}")
            print(f"   Description: {scenario['description']}")
            print(f"   Duration: {scenario['duration_minutes']} minutes")
            print(f"   Complexity: {complexity_stars} ({scenario['complexity_level']}/5)")
            print(f"   Agents Required: {scenario['agents_required']}")
            print(f"   Status: {scenario['status'].title()}")
    
    def display_agents(self):
        """Display agent status."""
        agents = demo_orchestrator.get_all_agents_status()
        
        print("\n" + "="*80)
        print("AI AGENT STATUS")
        print("="*80)
        
        for agent in agents:
            status_emoji = {
                "idle": "😴",
                "active": "🔥", 
                "coordinating": "🤝",
                "waiting_approval": "⏳",
                "learning": "🧠"
            }.get(agent["status"], "❓")
            
            confidence_bar = "█" * int(agent["confidence_level"] * 10) + "░" * (10 - int(agent["confidence_level"] * 10))
            
            print(f"\n{status_emoji} {agent['name']} ({agent['type'].replace('_', ' ').title()})")
            print(f"   Status: {agent['status'].replace('_', ' ').title()}")
            print(f"   Current Task: {agent['current_task'] or 'None'}")
            print(f"   Confidence: [{confidence_bar}] {agent['confidence_level']:.1%}")
            print(f"   Learning Entries: {agent['learning_entries']}")
    
    async def start_scenario_interactive(self):
        """Interactive scenario selection and execution."""
        scenarios = demo_orchestrator.get_available_scenarios()
        ready_scenarios = [s for s in scenarios if s["status"] == "ready"]
        
        if not ready_scenarios:
            print("\n❌ No scenarios are currently available to start.")
            print("   All scenarios may be running or completed. Try resetting the demo environment.")
            return
        
        print("\n" + "="*80)
        print("SELECT SCENARIO TO START")
        print("="*80)
        
        for i, scenario in enumerate(ready_scenarios, 1):
            print(f"{i}. {scenario['name']} ({scenario['duration_minutes']} min)")
        
        try:
            choice = input(f"\nEnter scenario number (1-{len(ready_scenarios)}) or 'back': ").strip()
            
            if choice.lower() == 'back':
                return
            
            scenario_index = int(choice) - 1
            if 0 <= scenario_index < len(ready_scenarios):
                selected_scenario = ready_scenarios[scenario_index]
                
                print(f"\n🚀 Starting scenario: {selected_scenario['name']}")
                print(f"   Expected duration: {selected_scenario['duration_minutes']} minutes")
                print(f"   Complexity level: {selected_scenario['complexity_level']}/5")
                
                result = await demo_orchestrator.start_scenario(selected_scenario['id'])
                
                if "error" not in result:
                    print(f"✅ Scenario started successfully!")
                    print(f"   Scenario ID: {result['scenario_id']}")
                    print(f"   Estimated completion: {result['estimated_completion']}")
                    print(f"   Agents activated: {', '.join(result['agents_activated'])}")
                    
                    self.current_scenario = selected_scenario['id']
                    
                    # Ask if user wants to monitor
                    monitor = input("\nWould you like to monitor this scenario in real-time? (y/n): ").strip().lower()
                    if monitor == 'y':
                        await self.monitor_scenario(selected_scenario['id'])
                else:
                    print(f"❌ Failed to start scenario: {result.get('error', 'Unknown error')}")
            else:
                print("❌ Invalid scenario number.")
                
        except ValueError:
            print("❌ Invalid input. Please enter a number.")
        except Exception as e:
            print(f"❌ Error starting scenario: {str(e)}")
    
    async def monitor_scenario(self, scenario_id: str):
        """Monitor a running scenario in real-time."""
        print(f"\n🔍 Monitoring scenario: {scenario_id}")
        print("   Press Ctrl+C to stop monitoring and return to menu")
        print("="*80)
        
        try:
            while True:
                status = demo_orchestrator.get_scenario_status(scenario_id)
                
                if status.get("status") in ["completed", "failed"]:
                    print(f"\n✅ Scenario {status['status']}: {status['name']}")
                    if status.get("metrics"):
                        print("📊 Final Metrics:")
                        for key, value in status["metrics"].items():
                            print(f"   {key.replace('_', ' ').title()}: {value}")
                    break
                
                # Display current progress
                print(f"\r⏳ Step {status.get('current_step', 0)} - Status: {status.get('status', 'unknown')}", end="", flush=True)
                
                await asyncio.sleep(2)
                
        except KeyboardInterrupt:
            print(f"\n\n⏹️  Stopped monitoring scenario {scenario_id}")
            print("   Scenario continues running in background")
    
    def display_metrics(self):
        """Display demo metrics."""
        metrics = demo_orchestrator.get_demo_metrics()
        
        print("\n" + "="*80)
        print("DEMONSTRATION METRICS")
        print("="*80)
        
        print(f"📊 Scenarios:")
        print(f"   Total Available: {metrics['total_scenarios']}")
        print(f"   Completed: {metrics['completed_scenarios']}")
        print(f"   Currently Active: {metrics['active_scenarios']}")
        
        print(f"\n🤖 Agents:")
        print(f"   Total Agents: {metrics['total_agents']}")
        print(f"   Currently Active: {metrics['active_agents']}")
        
        print(f"\n📈 Performance:")
        print(f"   Success Rate: {metrics['success_rate']:.1%}")
        print(f"   Average Completion Time: {metrics['average_completion_time']:.1f} minutes")
        print(f"   Total Events Logged: {metrics['total_events']}")
    
    async def generate_sample_data(self):
        """Generate sample data for demonstrations."""
        print("\n🔄 Generating sample data for demonstrations...")
        
        # This would integrate with the sample data generator
        from agentic_scenarios.sample_data_generator import generate_demo_data
        
        try:
            data_stats = await generate_demo_data()
            
            print("✅ Sample data generation completed!")
            print(f"   Threats generated: {data_stats.get('threats', 0)}")
            print(f"   Cost scenarios: {data_stats.get('cost_scenarios', 0)}")
            print(f"   Service events: {data_stats.get('service_events', 0)}")
            print(f"   Network topology: {data_stats.get('network_nodes', 0)} nodes")
            
        except ImportError:
            print("⚠️  Sample data generator not yet implemented")
        except Exception as e:
            print(f"❌ Error generating sample data: {str(e)}")
    
    async def reset_environment(self):
        """Reset the demo environment."""
        confirm = input("\n⚠️  Are you sure you want to reset the demo environment? (y/n): ").strip().lower()
        
        if confirm == 'y':
            print("🔄 Resetting demo environment...")
            await demo_orchestrator.reset_demo()
            print("✅ Demo environment reset completed!")
            self.current_scenario = None
        else:
            print("❌ Reset cancelled.")
    
    async def run(self):
        """Run the interactive demo."""
        self.print_banner()
        
        while self.running:
            try:
                self.print_menu()
                choice = input("\nEnter your choice (1-8): ").strip()
                
                if choice == '1':
                    self.display_scenarios()
                elif choice == '2':
                    self.display_agents()
                elif choice == '3':
                    await self.start_scenario_interactive()
                elif choice == '4':
                    if self.current_scenario:
                        await self.monitor_scenario(self.current_scenario)
                    else:
                        print("\n❌ No active scenario to monitor.")
                elif choice == '5':
                    self.display_metrics()
                elif choice == '6':
                    await self.generate_sample_data()
                elif choice == '7':
                    await self.reset_environment()
                elif choice == '8':
                    print("\n👋 Thank you for experiencing ACSO's agentic AI capabilities!")
                    print("   Visit https://github.com/your-org/acso for more information.")
                    self.running = False
                else:
                    print("❌ Invalid choice. Please enter a number between 1-8.")
                
                if self.running and choice != '4':  # Don't pause after monitoring
                    input("\nPress Enter to continue...")
                    
            except KeyboardInterrupt:
                print("\n\n👋 Demo interrupted. Goodbye!")
                self.running = False
            except Exception as e:
                print(f"\n❌ Unexpected error: {str(e)}")
                input("Press Enter to continue...")


async def main():
    """Main entry point for the agentic demo."""
    runner = AgenticDemoRunner()
    await runner.run()


if __name__ == "__main__":
    asyncio.run(main())