#!/usr/bin/env python3
"""
ACSO Phase 5 Agentic Demonstration Runner

This script provides an interactive way to run and experience ACSO's
advanced agentic capabilities through various demonstration scenarios.
"""

import asyncio
import sys
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
import argparse
import logging

# Import demo modules
from agentic_scenarios.interactive_demo_interface import demo_interface
from agentic_scenarios.real_time_collaboration import RealTimeCollaborationDemo
from agentic_scenarios.demo_orchestrator import DemoOrchestrator


class Phase5DemoRunner:
    """Main runner for Phase 5 agentic demonstrations."""
    
    def __init__(self):
        self.demo_interface = demo_interface
        self.collaboration_demo = RealTimeCollaborationDemo()
        self.orchestrator = DemoOrchestrator()
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
        # Demo state
        self.active_sessions: Dict[str, Any] = {}
        self.demo_history: List[Dict[str, Any]] = []
    
    async def run_interactive_menu(self):
        """Run the interactive demo menu."""
        print("\n" + "="*60)
        print("🤖 ACSO Phase 5: Agentic Demonstration System")
        print("="*60)
        print("Experience autonomous multi-agent intelligence in action!")
        print()
        
        while True:
            await self._display_main_menu()
            choice = input("\nEnter your choice (1-8): ").strip()
            
            try:
                if choice == '1':
                    await self._run_scenario_demo()
                elif choice == '2':
                    await self._run_collaboration_demo()
                elif choice == '3':
                    await self._view_active_sessions()
                elif choice == '4':
                    await self._view_demo_analytics()
                elif choice == '5':
                    await self._run_custom_scenario()
                elif choice == '6':
                    await self._export_demo_results()
                elif choice == '7':
                    await self._show_help()
                elif choice == '8':
                    print("\n👋 Thank you for exploring ACSO's agentic capabilities!")
                    break
                else:
                    print("❌ Invalid choice. Please try again.")
                    
            except KeyboardInterrupt:
                print("\n\n⚠️  Demo interrupted by user.")
                break
            except Exception as e:
                print(f"\n❌ Error: {e}")
                self.logger.error(f"Demo error: {e}")
    
    async def _display_main_menu(self):
        """Display the main demo menu."""
        print("\n📋 Available Demonstrations:")
        print("1. 🎯 Scenario-Based Demos (Multi-Agent Coordination, Cost Optimization, Threat Response)")
        print("2. 🤝 Real-Time Collaboration Demo")
        print("3. 📊 View Active Demo Sessions")
        print("4. 📈 Demo Analytics & Insights")
        print("5. 🛠️  Custom Scenario Builder")
        print("6. 💾 Export Demo Results")
        print("7. ❓ Help & Documentation")
        print("8. 🚪 Exit")
    
    async def _run_scenario_demo(self):
        """Run a scenario-based demonstration."""
        print("\n🎯 Scenario-Based Demonstrations")
        print("-" * 40)
        
        # Get available scenarios
        scenarios = await self.demo_interface.get_available_scenarios()
        
        print("Available scenarios:")
        for i, scenario in enumerate(scenarios, 1):
            print(f"{i}. {scenario['name']}")
            print(f"   📝 {scenario['description']}")
            print(f"   ⏱️  Duration: ~{scenario['duration_minutes']} minutes")
            print(f"   🎚️  Complexity: {scenario['complexity']}")
            print()
        
        try:
            choice = int(input(f"Select scenario (1-{len(scenarios)}): ")) - 1
            if 0 <= choice < len(scenarios):
                selected_scenario = scenarios[choice]
                await self._execute_scenario_demo(selected_scenario)
            else:
                print("❌ Invalid scenario selection.")
        except ValueError:
            print("❌ Please enter a valid number.")
    
    async def _execute_scenario_demo(self, scenario: Dict[str, Any]):
        """Execute a specific scenario demonstration."""
        print(f"\n🚀 Starting: {scenario['name']}")
        print(f"📝 {scenario['description']}")
        
        # Get participants
        participants = input("\nEnter participant names (comma-separated, or press Enter for default): ").strip()
        if participants:
            participant_list = [p.strip() for p in participants.split(',')]
        else:
            participant_list = ["demo_user"]
        
        try:
            # Start the demo session
            session_id = await self.demo_interface.start_demo_session(
                scenario['type'],
                participant_list
            )
            
            self.active_sessions[session_id] = {
                'scenario': scenario,
                'start_time': datetime.utcnow(),
                'participants': participant_list
            }
            
            print(f"✅ Demo session started: {session_id}")
            
            # Execute demo steps
            await self._run_demo_steps(session_id)
            
        except Exception as e:
            print(f"❌ Failed to start demo: {e}")
    
    async def _run_demo_steps(self, session_id: str):
        """Run through demo steps interactively."""
        print(f"\n🎬 Executing Demo Steps for {session_id}")
        print("Press Enter to advance to the next step, or 'q' to quit")
        
        step_number = 1
        
        while True:
            try:
                # Get current status
                status = await self.demo_interface.get_demo_status(session_id)
                
                if status['session']['status'] == 'completed':
                    print("\n🎉 Demo completed successfully!")
                    await self._show_demo_results(session_id)
                    break
                
                print(f"\n📍 Step {step_number}: {status['session']['scenario_type']}")
                print(f"Status: {status['session']['status']}")
                
                # Show available actions
                if status.get('available_actions'):
                    print("Available actions:")
                    for action in status['available_actions']:
                        print(f"  • {action}")
                
                # Show agent states
                if status.get('agent_states'):
                    print("\n🤖 Agent States:")
                    for agent_id, state in status['agent_states'].items():
                        print(f"  {agent_id}: {state.get('status', 'unknown')}")
                
                user_input = input("\nPress Enter to continue, 'p' to pause, 's' to skip, or 'q' to quit: ").strip().lower()
                
                if user_input == 'q':
                    await self.demo_interface.stop_demo_session(session_id)
                    print("Demo stopped by user.")
                    break
                elif user_input == 'p':
                    await self.demo_interface.pause_demo_session(session_id)
                    print("Demo paused. Press Enter to resume.")
                    input()
                    await self.demo_interface.resume_demo_session(session_id)
                    continue
                elif user_input == 's':
                    step_number += 1
                    continue
                
                # Execute next step
                result = await self.demo_interface.execute_demo_step(session_id)
                
                print(f"✅ Step {result['step_number']} completed")
                if result.get('step_result', {}).get('summary'):
                    print(f"📋 {result['step_result']['summary']}")
                
                step_number = result['step_number'] + 1
                
                # Small delay for better UX
                await asyncio.sleep(1)
                
            except Exception as e:
                print(f"❌ Error in demo step: {e}")
                break
    
    async def _run_collaboration_demo(self):
        """Run the real-time collaboration demonstration."""
        print("\n🤝 Real-Time Collaboration Demo")
        print("-" * 40)
        
        print("Available collaboration scenarios:")
        scenarios = [
            "security_incident_response",
            "cost_optimization_initiative", 
            "multi_domain_analysis"
        ]
        
        for i, scenario in enumerate(scenarios, 1):
            print(f"{i}. {scenario.replace('_', ' ').title()}")
        
        try:
            choice = int(input(f"Select scenario (1-{len(scenarios)}): ")) - 1
            if 0 <= choice < len(scenarios):
                selected_scenario = scenarios[choice]
                
                # Get observers
                observers = input("Enter observer names (comma-separated): ").strip()
                observer_list = [o.strip() for o in observers.split(',')] if observers else ["demo_observer"]
                
                # Start collaboration demo
                demo_id = await self.collaboration_demo.start_collaboration_demo(
                    selected_scenario,
                    observer_list
                )
                
                print(f"✅ Collaboration demo started: {demo_id}")
                
                # Monitor collaboration in real-time
                await self._monitor_collaboration(demo_id)
                
            else:
                print("❌ Invalid scenario selection.")
        except ValueError:
            print("❌ Please enter a valid number.")
    
    async def _monitor_collaboration(self, demo_id: str):
        """Monitor real-time collaboration."""
        print(f"\n👀 Monitoring Collaboration: {demo_id}")
        print("Press 'q' to stop monitoring")
        
        monitoring = True
        last_event_count = 0
        
        while monitoring:
            try:
                status = await self.collaboration_demo.get_collaboration_status()
                
                # Show new events
                recent_events = status.get('recent_events', [])
                if len(recent_events) > last_event_count:
                    new_events = recent_events[last_event_count:]
                    for event in new_events:
                        timestamp = event['timestamp'][:19]  # Remove microseconds
                        print(f"[{timestamp}] {event['source_agent']} → {', '.join(event['target_agents'])}")
                        print(f"  📨 {event['content'].get('message', 'No message')}")
                    
                    last_event_count = len(recent_events)
                
                # Check for user input (non-blocking)
                # In a real implementation, this would use proper async input
                await asyncio.sleep(2)
                
            except KeyboardInterrupt:
                monitoring = False
                print("\n⏹️  Monitoring stopped.")
    
    async def _view_active_sessions(self):
        """View currently active demo sessions."""
        print("\n📊 Active Demo Sessions")
        print("-" * 40)
        
        if not self.active_sessions:
            print("No active demo sessions.")
            return
        
        for session_id, session_info in self.active_sessions.items():
            duration = datetime.utcnow() - session_info['start_time']
            print(f"🎯 {session_id}")
            print(f"   Scenario: {session_info['scenario']['name']}")
            print(f"   Duration: {duration}")
            print(f"   Participants: {', '.join(session_info['participants'])}")
            print()
    
    async def _view_demo_analytics(self):
        """View demo analytics and insights."""
        print("\n📈 Demo Analytics & Insights")
        print("-" * 40)
        
        try:
            analytics = await self.demo_interface.get_demo_analytics()
            
            print(f"Total Sessions: {analytics.get('total_sessions', 0)}")
            print(f"Completed Sessions: {analytics.get('completed_sessions', 0)}")
            print(f"Completion Rate: {analytics.get('completion_rate', 0):.1f}%")
            print(f"Average Duration: {analytics.get('average_session_duration', 0):.1f} minutes")
            
            if analytics.get('scenario_distribution'):
                print("\nScenario Distribution:")
                for scenario, count in analytics['scenario_distribution'].items():
                    print(f"  {scenario}: {count}")
            
            if analytics.get('most_popular_scenario'):
                print(f"\nMost Popular: {analytics['most_popular_scenario']}")
                
        except Exception as e:
            print(f"❌ Error retrieving analytics: {e}")
    
    async def _run_custom_scenario(self):
        """Run a custom scenario builder."""
        print("\n🛠️  Custom Scenario Builder")
        print("-" * 40)
        print("This feature allows you to create custom agentic scenarios.")
        print("(Implementation would include scenario configuration UI)")
        
        # Placeholder for custom scenario functionality
        print("🚧 Custom scenario builder coming soon!")
    
    async def _export_demo_results(self):
        """Export demo results and reports."""
        print("\n💾 Export Demo Results")
        print("-" * 40)
        
        if not self.active_sessions:
            print("No demo sessions to export.")
            return
        
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"acso_demo_results_{timestamp}.json"
        
        export_data = {
            'export_timestamp': datetime.utcnow().isoformat(),
            'active_sessions': len(self.active_sessions),
            'demo_history': self.demo_history,
            'session_summaries': []
        }
        
        for session_id, session_info in self.active_sessions.items():
            try:
                status = await self.demo_interface.get_demo_status(session_id)
                export_data['session_summaries'].append({
                    'session_id': session_id,
                    'scenario': session_info['scenario']['name'],
                    'status': status['session']['status'],
                    'participants': session_info['participants']
                })
            except Exception as e:
                self.logger.error(f"Error exporting session {session_id}: {e}")
        
        try:
            with open(filename, 'w') as f:
                json.dump(export_data, f, indent=2)
            print(f"✅ Demo results exported to: {filename}")
        except Exception as e:
            print(f"❌ Export failed: {e}")
    
    async def _show_demo_results(self, session_id: str):
        """Show results for a completed demo."""
        try:
            analytics = await self.demo_interface.get_demo_analytics(session_id)
            
            print("\n🎉 Demo Results Summary")
            print("-" * 40)
            print(f"Session ID: {session_id}")
            print(f"Duration: {analytics.get('duration_minutes', 0):.1f} minutes")
            print(f"Completion Rate: {analytics.get('completion_rate', 0):.1f}%")
            print(f"User Interactions: {analytics.get('user_interactions', 0)}")
            
            if analytics.get('performance_metrics'):
                print("\nPerformance Metrics:")
                for metric, value in analytics['performance_metrics'].items():
                    print(f"  {metric}: {value}")
                    
        except Exception as e:
            print(f"❌ Error retrieving demo results: {e}")
    
    async def _show_help(self):
        """Show help and documentation."""
        print("\n❓ ACSO Phase 5 Demo Help")
        print("=" * 40)
        print("""
🎯 Scenario Demos:
   Experience pre-built scenarios showcasing multi-agent coordination,
   intelligent cost optimization, and autonomous threat response.

🤝 Collaboration Demo:
   Watch agents collaborate in real-time, sharing information and
   coordinating responses to complex situations.

📊 Analytics:
   View performance metrics, completion rates, and insights from
   your demo sessions.

🛠️  Custom Scenarios:
   Build your own scenarios to test specific agent behaviors
   and coordination patterns.

💡 Tips:
   • Each demo is interactive - you can pause, resume, or stop at any time
   • Agents make autonomous decisions based on their training and objectives
   • Human oversight is available for critical decisions
   • All interactions are logged for analysis and improvement

🔗 For more information, visit the ACSO documentation.
        """)


async def main():
    """Main entry point for the Phase 5 demo runner."""
    parser = argparse.ArgumentParser(description="ACSO Phase 5 Agentic Demonstration Runner")
    parser.add_argument(
        '--scenario',
        choices=['multi_agent_coordination', 'intelligent_cost_optimization', 'autonomous_threat_response'],
        help='Run a specific scenario directly'
    )
    parser.add_argument(
        '--participants',
        nargs='+',
        default=['demo_user'],
        help='List of participant names'
    )
    parser.add_argument(
        '--non-interactive',
        action='store_true',
        help='Run in non-interactive mode'
    )
    
    args = parser.parse_args()
    
    runner = Phase5DemoRunner()
    
    if args.scenario:
        # Run specific scenario directly
        print(f"🚀 Running scenario: {args.scenario}")
        try:
            session_id = await runner.demo_interface.start_demo_session(
                args.scenario,
                args.participants
            )
            
            if not args.non_interactive:
                await runner._run_demo_steps(session_id)
            else:
                print(f"✅ Demo session started: {session_id}")
                
        except Exception as e:
            print(f"❌ Failed to run scenario: {e}")
            sys.exit(1)
    else:
        # Run interactive menu
        await runner.run_interactive_menu()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 Demo interrupted. Goodbye!")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)