#!/usr/bin/env python3
"""
ACSO Demo Presentation Utilities

Utilities for creating engaging and professional demo presentations.
"""

import asyncio
from typing import List, Optional


class DemoPresentation:
    """Handles demo presentation formatting and flow."""
    
    def __init__(self):
        self.colors = {
            'header': '\033[95m',
            'blue': '\033[94m',
            'cyan': '\033[96m',
            'green': '\033[92m',
            'yellow': '\033[93m',
            'red': '\033[91m',
            'bold': '\033[1m',
            'underline': '\033[4m',
            'end': '\033[0m'
        }
        
    async def show_title(self, title: str):
        """Display a formatted title."""
        print("\n" + "=" * 60)
        print(f"{self.colors['bold']}{self.colors['cyan']}{title.center(60)}{self.colors['end']}")
        print("=" * 60)
        
    async def show_intro(self, description: str, features: List[str]):
        """Display introduction with features."""
        print(f"\n{self.colors['blue']}{description}{self.colors['end']}")
        print(f"\n{self.colors['bold']}Key Capabilities:{self.colors['end']}")
        for feature in features:
            print(f"   • {feature}")
        print()
        
    async def show_scenario_header(self, scenario_title: str, description: str):
        """Display scenario header."""
        print(f"\n{self.colors['bold']}{self.colors['yellow']}{scenario_title}{self.colors['end']}")
        print(f"{self.colors['cyan']}{description}{self.colors['end']}")
        print("-" * 60)
        
    async def show_summary(self, title: str, achievements: List[str]):
        """Display demo summary."""
        print(f"\n{self.colors['bold']}{self.colors['green']}{title}{self.colors['end']}")
        print(f"\n{self.colors['bold']}Achievements:{self.colors['end']}")
        for achievement in achievements:
            print(f"   {achievement}")
        print()
        
    async def show_progress_bar(self, current: int, total: int, description: str = ""):
        """Display a progress bar."""
        percentage = (current / total) * 100
        filled = int(percentage / 2)  # 50 chars max
        bar = "█" * filled + "░" * (50 - filled)
        
        print(f"\r{description} [{bar}] {percentage:.1f}%", end="", flush=True)
        if current == total:
            print()  # New line when complete
            
    async def show_agent_status(self, agent_name: str, status: str, details: Optional[str] = None):
        """Display agent status update."""
        status_colors = {
            'active': self.colors['green'],
            'processing': self.colors['yellow'],
            'completed': self.colors['green'],
            'error': self.colors['red'],
            'waiting': self.colors['cyan']
        }
        
        color = status_colors.get(status.lower(), self.colors['blue'])
        status_display = f"{color}{status.upper()}{self.colors['end']}"
        
        if details:
            print(f"   🤖 {agent_name}: {status_display} - {details}")
        else:
            print(f"   🤖 {agent_name}: {status_display}")
            
    async def show_workflow_step(self, step_number: int, total_steps: int, description: str, duration: float = 0.5):
        """Display workflow step with animation."""
        print(f"   Step {step_number}/{total_steps}: {description}...")
        await asyncio.sleep(duration)
        print(f"   ✅ Step {step_number}/{total_steps}: {description} - COMPLETED")
        
    async def show_metrics_table(self, title: str, metrics: List[tuple]):
        """Display metrics in a formatted table."""
        print(f"\n{self.colors['bold']}{title}{self.colors['end']}")
        print("-" * 50)
        
        for metric_name, value, unit in metrics:
            print(f"   {metric_name:30} {value:>10} {unit}")
            
    async def show_decision_tree(self, decision_point: str, options: List[tuple]):
        """Display decision tree visualization."""
        print(f"\n🤔 {self.colors['bold']}{decision_point}{self.colors['end']}")
        
        for i, (option, outcome) in enumerate(options, 1):
            print(f"   {i}. {option}")
            print(f"      → {outcome}")
            
    async def show_timeline(self, events: List[tuple]):
        """Display timeline of events."""
        print(f"\n{self.colors['bold']}Timeline:{self.colors['end']}")
        
        for timestamp, event, status in events:
            status_symbol = "✅" if status == "completed" else "🔄" if status == "in_progress" else "⏸️"
            print(f"   {timestamp} | {status_symbol} {event}")
            
    async def show_comparison_table(self, title: str, before_after: List[tuple]):
        """Display before/after comparison."""
        print(f"\n{self.colors['bold']}{title}{self.colors['end']}")
        print(f"{'Metric':<25} {'Before':<15} {'After':<15} {'Improvement':<15}")
        print("-" * 70)
        
        for metric, before, after, improvement in before_after:
            print(f"{metric:<25} {before:<15} {after:<15} {improvement:<15}")
            
    async def show_alert(self, alert_type: str, message: str):
        """Display alert message."""
        alert_symbols = {
            'info': 'ℹ️',
            'warning': '⚠️',
            'error': '❌',
            'success': '✅',
            'critical': '🚨'
        }
        
        alert_colors = {
            'info': self.colors['blue'],
            'warning': self.colors['yellow'],
            'error': self.colors['red'],
            'success': self.colors['green'],
            'critical': self.colors['red'] + self.colors['bold']
        }
        
        symbol = alert_symbols.get(alert_type, 'ℹ️')
        color = alert_colors.get(alert_type, self.colors['blue'])
        
        print(f"\n{symbol} {color}{message}{self.colors['end']}")
        
    async def show_loading_animation(self, message: str, duration: float = 2.0):
        """Display loading animation."""
        frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
        end_time = asyncio.get_event_loop().time() + duration
        
        while asyncio.get_event_loop().time() < end_time:
            for frame in frames:
                if asyncio.get_event_loop().time() >= end_time:
                    break
                print(f"\r{frame} {message}", end="", flush=True)
                await asyncio.sleep(0.1)
                
        print(f"\r✅ {message} - COMPLETED")
        
    async def show_network_diagram(self, title: str, connections: List[tuple]):
        """Display simple network diagram."""
        print(f"\n{self.colors['bold']}{title}{self.colors['end']}")
        
        for source, destination, connection_type in connections:
            arrow = "→" if connection_type == "sends" else "↔" if connection_type == "syncs" else "⟶"
            print(f"   {source} {arrow} {destination}")
            
    async def show_cost_breakdown(self, title: str, costs: List[tuple]):
        """Display cost breakdown visualization."""
        print(f"\n{self.colors['bold']}{title}{self.colors['end']}")
        
        total_cost = sum(cost for _, cost in costs)
        
        for category, cost in costs:
            percentage = (cost / total_cost) * 100
            bar_length = int(percentage / 2)  # Scale to 50 chars
            bar = "█" * bar_length + "░" * (50 - bar_length)
            
            print(f"   {category:<20} ${cost:>8,} [{bar}] {percentage:5.1f}%")
            
    async def show_roi_chart(self, title: str, years: List[int], values: List[float]):
        """Display simple ROI chart."""
        print(f"\n{self.colors['bold']}{title}{self.colors['end']}")
        
        max_value = max(values)
        
        for year, value in zip(years, values):
            bar_length = int((value / max_value) * 40) if max_value > 0 else 0
            bar = "█" * bar_length
            
            print(f"   Year {year}: ${value:>8,.0f} {bar}")
            
    async def pause_for_effect(self, duration: float = 1.0):
        """Pause for dramatic effect."""
        await asyncio.sleep(duration)
        
    async def clear_screen(self):
        """Clear the screen (cross-platform)."""
        import os
        os.system('cls' if os.name == 'nt' else 'clear')
        
    def format_currency(self, amount: float) -> str:
        """Format currency for display."""
        if amount >= 1000000:
            return f"${amount/1000000:.1f}M"
        elif amount >= 1000:
            return f"${amount/1000:.0f}K"
        else:
            return f"${amount:.0f}"
            
    def format_percentage(self, value: float) -> str:
        """Format percentage for display."""
        return f"{value:.1f}%"
        
    def format_duration(self, seconds: float) -> str:
        """Format duration for display."""
        if seconds >= 3600:
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            return f"{hours}h {minutes}m"
        elif seconds >= 60:
            minutes = int(seconds // 60)
            secs = int(seconds % 60)
            return f"{minutes}m {secs}s"
        else:
            return f"{seconds:.0f}s"