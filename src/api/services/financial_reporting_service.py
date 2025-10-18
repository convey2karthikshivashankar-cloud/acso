"""Financial reporting and export service."""

import uuid
import csv
import json
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Union
from decimal import Decimal
from io import StringIO, BytesIO
import base64

from ..models.financial import (
    FinancialReport, ReportTemplate, ReportSchedule, ExportFormat,
    ReportSection, ChartData, ReportMetrics
)
from ..websocket.manager import websocket_manager


class FinancialReportingService:
    """Service for financial reporting and data export."""
    
    def __init__(self):
        self.reports: Dict[str, FinancialReport] = {}
        self.templates: Dict[str, ReportTemplate] = {}
        self.schedules: Dict[str, ReportSchedule] = {}
        
        # Initialize with sample data
        self._initialize_sample_data()
    
    def _initialize_sample_data(self):
        """Initialize with sample reporting data."""
        # Sample report template
        template_id = str(uuid.uuid4())
        self.templates[template_id] = ReportTemplate(
            id=template_id,
            name="Monthly Financial Summary",
            description="Comprehensive monthly financial performance report",
            report_type="financial_summary",
            sections=[
                {
                    "id": "executive_summary",
                    "title": "Executive Summary",
                    "type": "summary",
                    "content_type": "metrics",
                    "configuration": {
                        "metrics": ["total_cost", "budget_utilization", "cost_trend"],
                        "period": "monthly"
                    }
                },
                {
                    "id": "cost_breakdown",
                    "title": "Cost Breakdown",
                    "type": "analysis",
                    "content_type": "chart",
                    "configuration": {
                        "chart_type": "pie",
                        "data_source": "cost_by_service",
                        "period": "monthly"
                    }
                },
                {
                    "id": "budget_performance",
                    "title": "Budget Performance",
                    "type": "analysis",
                    "content_type": "table",
                    "configuration": {
                        "columns": ["budget_name", "allocated", "spent", "remaining", "utilization"],
                        "sort_by": "utilization",
                        "sort_order": "desc"
                    }
                }
            ],
            parameters={
                "include_forecasts": True,
                "include_comparisons": True,
                "detail_level": "summary"
            },
            created_at=datetime.utcnow()
        )
    
    async def create_report_template(
        self,
        name: str,
        description: str,
        report_type: str,
        sections: List[Dict[str, Any]],
        parameters: Dict[str, Any],
        user_id: str
    ) -> ReportTemplate:
        """Create a new report template."""
        template_id = str(uuid.uuid4())
        
        template = ReportTemplate(
            id=template_id,
            name=name,
            description=description,
            report_type=report_type,
            sections=sections,
            parameters=parameters,
            created_by=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.templates[template_id] = template
        return template
    
    async def generate_report(
        self,
        template_id: str,
        period_start: date,
        period_end: date,
        filters: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None
    ) -> FinancialReport:
        """Generate a financial report using a template."""
        template = self.templates.get(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")
        
        report_id = str(uuid.uuid4())
        
        # Generate report sections
        sections = []
        for section_config in template.sections:
            section = await self._generate_report_section(
                section_config, period_start, period_end, filters
            )
            sections.append(section)
        
        # Calculate report metrics
        metrics = await self._calculate_report_metrics(period_start, period_end, filters)
        
        # Generate charts
        charts = await self._generate_report_charts(template, period_start, period_end, filters)
        
        report = FinancialReport(
            id=report_id,
            template_id=template_id,
            title=f"{template.name} - {period_start} to {period_end}",
            report_type=template.report_type,
            period_start=period_start,
            period_end=period_end,
            sections=sections,
            charts=charts,
            metrics=metrics,
            filters=filters or {},
            generated_by=user_id,
            generated_at=datetime.utcnow()
        )
        
        self.reports[report_id] = report
        
        # Notify about report generation
        await websocket_manager.broadcast_to_topic(
            "financial_reports",
            {
                "type": "report_generated",
                "report_id": report_id,
                "template_name": template.name,
                "generated_by": user_id
            }
        )
        
        return report
    
    async def _generate_report_section(
        self,
        section_config: Dict[str, Any],
        period_start: date,
        period_end: date,
        filters: Optional[Dict[str, Any]]
    ) -> ReportSection:
        """Generate a single report section."""
        section_id = section_config["id"]
        section_title = section_config["title"]
        content_type = section_config["content_type"]
        configuration = section_config.get("configuration", {})
        
        if content_type == "metrics":
            content = await self._generate_metrics_content(configuration, period_start, period_end, filters)
        elif content_type == "chart":
            content = await self._generate_chart_content(configuration, period_start, period_end, filters)
        elif content_type == "table":
            content = await self._generate_table_content(configuration, period_start, period_end, filters)
        elif content_type == "text":
            content = await self._generate_text_content(configuration, period_start, period_end, filters)
        else:
            content = {"error": f"Unknown content type: {content_type}"}
        
        return ReportSection(
            id=section_id,
            title=section_title,
            content_type=content_type,
            content=content,
            generated_at=datetime.utcnow()
        )
    
    async def _generate_metrics_content(
        self,
        config: Dict[str, Any],
        period_start: date,
        period_end: date,
        filters: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate metrics content for a report section."""
        metrics = config.get("metrics", [])
        
        content = {}
        
        for metric in metrics:
            if metric == "total_cost":
                content["total_cost"] = {
                    "value": 125000.50,
                    "currency": "USD",
                    "period": f"{period_start} to {period_end}",
                    "change_from_previous": 5.2,
                    "trend": "increasing"
                }
            elif metric == "budget_utilization":
                content["budget_utilization"] = {
                    "value": 78.5,
                    "unit": "percentage",
                    "status": "on_track",
                    "target": 85.0
                }
            elif metric == "cost_trend":
                content["cost_trend"] = {
                    "direction": "increasing",
                    "rate": 3.2,
                    "unit": "percentage_monthly",
                    "confidence": 0.85
                }
            elif metric == "roi":
                content["roi"] = {
                    "value": 24.8,
                    "unit": "percentage",
                    "period": "annual",
                    "status": "positive"
                }
        
        return content
    
    async def _generate_chart_content(
        self,
        config: Dict[str, Any],
        period_start: date,
        period_end: date,
        filters: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate chart content for a report section."""
        chart_type = config.get("chart_type", "line")
        data_source = config.get("data_source", "cost_over_time")
        
        if data_source == "cost_by_service":
            data = [
                {"label": "Compute", "value": 45000, "percentage": 36},
                {"label": "Storage", "value": 28000, "percentage": 22.4},
                {"label": "Network", "value": 22000, "percentage": 17.6},
                {"label": "Security", "value": 18000, "percentage": 14.4},
                {"label": "Other", "value": 12000, "percentage": 9.6}
            ]
        elif data_source == "cost_over_time":
            # Generate time series data
            data = []
            current_date = period_start
            base_cost = 10000
            
            while current_date <= period_end:
                # Add some variation
                variation = (hash(str(current_date)) % 2000) - 1000
                data.append({
                    "date": current_date.isoformat(),
                    "value": base_cost + variation,
                    "label": current_date.strftime("%Y-%m")
                })
                
                # Move to next month
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
        else:
            data = []
        
        return {
            "chart_type": chart_type,
            "data": data,
            "configuration": config
        }
    
    async def _generate_table_content(
        self,
        config: Dict[str, Any],
        period_start: date,
        period_end: date,
        filters: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate table content for a report section."""
        columns = config.get("columns", [])
        
        # Sample table data
        rows = [
            {
                "budget_name": "Security Operations",
                "allocated": 50000,
                "spent": 42000,
                "remaining": 8000,
                "utilization": 84.0
            },
            {
                "budget_name": "Infrastructure",
                "allocated": 75000,
                "spent": 68000,
                "remaining": 7000,
                "utilization": 90.7
            },
            {
                "budget_name": "Development",
                "allocated": 30000,
                "spent": 22000,
                "remaining": 8000,
                "utilization": 73.3
            }
        ]
        
        # Apply sorting if specified
        sort_by = config.get("sort_by")
        sort_order = config.get("sort_order", "asc")
        
        if sort_by and sort_by in columns:
            reverse = sort_order == "desc"
            rows.sort(key=lambda x: x.get(sort_by, 0), reverse=reverse)
        
        return {
            "columns": columns,
            "rows": rows,
            "total_rows": len(rows)
        }
    
    async def _generate_text_content(
        self,
        config: Dict[str, Any],
        period_start: date,
        period_end: date,
        filters: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate text content for a report section."""
        content_template = config.get("template", "")
        
        # Simple template substitution
        content = content_template.format(
            period_start=period_start,
            period_end=period_end,
            total_days=(period_end - period_start).days
        )
        
        return {
            "text": content,
            "format": config.get("format", "plain")
        }
    
    async def _calculate_report_metrics(
        self,
        period_start: date,
        period_end: date,
        filters: Optional[Dict[str, Any]]
    ) -> ReportMetrics:
        """Calculate key metrics for the report."""
        # Sample metrics calculation
        return ReportMetrics(
            total_cost=Decimal("125000.50"),
            average_daily_cost=Decimal("4032.27"),
            cost_trend_percentage=3.2,
            budget_utilization_percentage=78.5,
            top_cost_categories=[
                {"category": "Compute", "amount": 45000, "percentage": 36},
                {"category": "Storage", "amount": 28000, "percentage": 22.4},
                {"category": "Network", "amount": 22000, "percentage": 17.6}
            ],
            period_comparison={
                "previous_period_cost": 118500.25,
                "change_amount": 6500.25,
                "change_percentage": 5.49
            }
        )
    
    async def _generate_report_charts(
        self,
        template: ReportTemplate,
        period_start: date,
        period_end: date,
        filters: Optional[Dict[str, Any]]
    ) -> List[ChartData]:
        """Generate charts for the report."""
        charts = []
        
        # Cost trend chart
        charts.append(ChartData(
            id="cost_trend",
            title="Cost Trend Over Time",
            chart_type="line",
            data=[
                {"x": "2024-01", "y": 10500},
                {"x": "2024-02", "y": 11200},
                {"x": "2024-03", "y": 10800},
                {"x": "2024-04", "y": 12100}
            ],
            configuration={
                "x_axis": "Month",
                "y_axis": "Cost (USD)",
                "color_scheme": "blue"
            }
        ))
        
        # Budget utilization chart
        charts.append(ChartData(
            id="budget_utilization",
            title="Budget Utilization by Department",
            chart_type="bar",
            data=[
                {"x": "Security", "y": 84.0},
                {"x": "Infrastructure", "y": 90.7},
                {"x": "Development", "y": 73.3}
            ],
            configuration={
                "x_axis": "Department",
                "y_axis": "Utilization (%)",
                "color_scheme": "green"
            }
        ))
        
        return charts
    
    async def export_report(
        self,
        report_id: str,
        export_format: ExportFormat,
        include_charts: bool = True
    ) -> Dict[str, Any]:
        """Export a report in the specified format."""
        report = self.reports.get(report_id)
        if not report:
            raise ValueError(f"Report {report_id} not found")
        
        if export_format == ExportFormat.JSON:
            return await self._export_json(report, include_charts)
        elif export_format == ExportFormat.CSV:
            return await self._export_csv(report)
        elif export_format == ExportFormat.PDF:
            return await self._export_pdf(report, include_charts)
        elif export_format == ExportFormat.EXCEL:
            return await self._export_excel(report, include_charts)
        else:
            raise ValueError(f"Unsupported export format: {export_format}")
    
    async def _export_json(self, report: FinancialReport, include_charts: bool) -> Dict[str, Any]:
        """Export report as JSON."""
        export_data = {
            "report_id": report.id,
            "title": report.title,
            "report_type": report.report_type,
            "period_start": report.period_start.isoformat(),
            "period_end": report.period_end.isoformat(),
            "generated_at": report.generated_at.isoformat(),
            "sections": [
                {
                    "id": section.id,
                    "title": section.title,
                    "content_type": section.content_type,
                    "content": section.content
                }
                for section in report.sections
            ],
            "metrics": {
                "total_cost": float(report.metrics.total_cost),
                "average_daily_cost": float(report.metrics.average_daily_cost),
                "cost_trend_percentage": report.metrics.cost_trend_percentage,
                "budget_utilization_percentage": report.metrics.budget_utilization_percentage
            }
        }
        
        if include_charts:
            export_data["charts"] = [
                {
                    "id": chart.id,
                    "title": chart.title,
                    "chart_type": chart.chart_type,
                    "data": chart.data,
                    "configuration": chart.configuration
                }
                for chart in report.charts
            ]
        
        return {
            "format": "json",
            "data": export_data,
            "filename": f"financial_report_{report.id}.json",
            "mime_type": "application/json"
        }
    
    async def _export_csv(self, report: FinancialReport) -> Dict[str, Any]:
        """Export report as CSV."""
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(["Report Title", report.title])
        writer.writerow(["Period", f"{report.period_start} to {report.period_end}"])
        writer.writerow(["Generated At", report.generated_at.isoformat()])
        writer.writerow([])  # Empty row
        
        # Write metrics
        writer.writerow(["Metrics"])
        writer.writerow(["Total Cost", float(report.metrics.total_cost)])
        writer.writerow(["Average Daily Cost", float(report.metrics.average_daily_cost)])
        writer.writerow(["Cost Trend %", report.metrics.cost_trend_percentage])
        writer.writerow(["Budget Utilization %", report.metrics.budget_utilization_percentage])
        writer.writerow([])  # Empty row
        
        # Write section data (simplified)
        for section in report.sections:
            writer.writerow([f"Section: {section.title}"])
            if section.content_type == "table" and "rows" in section.content:
                # Write table data
                columns = section.content.get("columns", [])
                if columns:
                    writer.writerow(columns)
                    for row in section.content["rows"]:
                        writer.writerow([row.get(col, "") for col in columns])
            writer.writerow([])  # Empty row
        
        csv_content = output.getvalue()
        output.close()
        
        return {
            "format": "csv",
            "data": csv_content,
            "filename": f"financial_report_{report.id}.csv",
            "mime_type": "text/csv"
        }
    
    async def _export_pdf(self, report: FinancialReport, include_charts: bool) -> Dict[str, Any]:
        """Export report as PDF (simplified implementation)."""
        # In a real implementation, you would use a library like ReportLab
        # For now, we'll return a placeholder
        
        pdf_content = f"""
        Financial Report: {report.title}
        Period: {report.period_start} to {report.period_end}
        Generated: {report.generated_at}
        
        Metrics:
        - Total Cost: ${report.metrics.total_cost}
        - Average Daily Cost: ${report.metrics.average_daily_cost}
        - Cost Trend: {report.metrics.cost_trend_percentage}%
        - Budget Utilization: {report.metrics.budget_utilization_percentage}%
        
        [PDF content would be generated here using a proper PDF library]
        """
        
        # Encode as base64 for transport
        pdf_bytes = pdf_content.encode('utf-8')
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        return {
            "format": "pdf",
            "data": pdf_base64,
            "filename": f"financial_report_{report.id}.pdf",
            "mime_type": "application/pdf"
        }
    
    async def _export_excel(self, report: FinancialReport, include_charts: bool) -> Dict[str, Any]:
        """Export report as Excel (simplified implementation)."""
        # In a real implementation, you would use openpyxl or xlsxwriter
        # For now, we'll return a placeholder similar to CSV but with Excel format indication
        
        excel_data = {
            "worksheets": [
                {
                    "name": "Summary",
                    "data": [
                        ["Report Title", report.title],
                        ["Period", f"{report.period_start} to {report.period_end}"],
                        ["Generated At", report.generated_at.isoformat()],
                        [],
                        ["Metrics"],
                        ["Total Cost", float(report.metrics.total_cost)],
                        ["Average Daily Cost", float(report.metrics.average_daily_cost)],
                        ["Cost Trend %", report.metrics.cost_trend_percentage],
                        ["Budget Utilization %", report.metrics.budget_utilization_percentage]
                    ]
                }
            ]
        }
        
        # Add section worksheets
        for section in report.sections:
            if section.content_type == "table" and "rows" in section.content:
                worksheet_data = []
                columns = section.content.get("columns", [])
                if columns:
                    worksheet_data.append(columns)
                    for row in section.content["rows"]:
                        worksheet_data.append([row.get(col, "") for col in columns])
                
                excel_data["worksheets"].append({
                    "name": section.title[:31],  # Excel worksheet name limit
                    "data": worksheet_data
                })
        
        return {
            "format": "excel",
            "data": excel_data,
            "filename": f"financial_report_{report.id}.xlsx",
            "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
    
    async def schedule_report(
        self,
        template_id: str,
        schedule_name: str,
        cron_expression: str,
        recipients: List[str],
        export_format: ExportFormat,
        filters: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None
    ) -> ReportSchedule:
        """Schedule a report for automatic generation."""
        schedule_id = str(uuid.uuid4())
        
        schedule = ReportSchedule(
            id=schedule_id,
            template_id=template_id,
            name=schedule_name,
            cron_expression=cron_expression,
            recipients=recipients,
            export_format=export_format,
            filters=filters or {},
            is_active=True,
            created_by=user_id,
            created_at=datetime.utcnow(),
            next_run_at=self._calculate_next_run(cron_expression)
        )
        
        self.schedules[schedule_id] = schedule
        return schedule
    
    def _calculate_next_run(self, cron_expression: str) -> datetime:
        """Calculate next run time from cron expression (simplified)."""
        # This is a simplified implementation
        # In production, you would use a proper cron parser like croniter
        
        if cron_expression == "0 9 1 * *":  # Monthly on 1st at 9 AM
            now = datetime.utcnow()
            if now.day == 1 and now.hour < 9:
                return now.replace(hour=9, minute=0, second=0, microsecond=0)
            else:
                # Next month
                if now.month == 12:
                    next_month = now.replace(year=now.year + 1, month=1, day=1, hour=9, minute=0, second=0, microsecond=0)
                else:
                    next_month = now.replace(month=now.month + 1, day=1, hour=9, minute=0, second=0, microsecond=0)
                return next_month
        
        # Default to next day at 9 AM
        return datetime.utcnow().replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=1)
    
    async def get_report_list(
        self,
        user_id: Optional[str] = None,
        report_type: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get list of generated reports."""
        reports = list(self.reports.values())
        
        # Filter by user if specified
        if user_id:
            reports = [r for r in reports if getattr(r, 'generated_by', None) == user_id]
        
        # Filter by type if specified
        if report_type:
            reports = [r for r in reports if r.report_type == report_type]
        
        # Sort by generation date (newest first)
        reports.sort(key=lambda x: x.generated_at, reverse=True)
        
        # Limit results
        reports = reports[:limit]
        
        return [
            {
                "id": report.id,
                "title": report.title,
                "report_type": report.report_type,
                "period_start": report.period_start.isoformat(),
                "period_end": report.period_end.isoformat(),
                "generated_at": report.generated_at.isoformat(),
                "generated_by": getattr(report, 'generated_by', None),
                "sections_count": len(report.sections),
                "charts_count": len(report.charts)
            }
            for report in reports
        ]
    
    async def delete_report(self, report_id: str, user_id: str) -> bool:
        """Delete a generated report."""
        report = self.reports.get(report_id)
        if not report:
            return False
        
        # Check permissions (simplified)
        if hasattr(report, 'generated_by') and report.generated_by != user_id:
            return False
        
        del self.reports[report_id]
        
        # Notify about deletion
        await websocket_manager.broadcast_to_topic(
            "financial_reports",
            {
                "type": "report_deleted",
                "report_id": report_id,
                "deleted_by": user_id
            }
        )
        
        return True


# Global financial reporting service instance
financial_reporting_service = FinancialReportingService()