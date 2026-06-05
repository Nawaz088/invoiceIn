"""
Reports Views for InvoiceIN
Comprehensive GST reports, revenue analysis, and financial summaries
"""

import logging
from decimal import Decimal
from datetime import datetime, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg, F, Q
from django.db.models.functions import ExtractMonth, ExtractYear, TruncMonth
from django.utils import timezone
from django.shortcuts import get_object_or_404

from apps.invoices.models import Invoice, LineItem
from apps.clients.models import Client
from apps.expenses.models import Expense
from apps.users.models import User

logger = logging.getLogger(__name__)


class BaseReportView(APIView):
    """Base view for all report endpoints."""
    permission_classes = [IsAuthenticated]
    
    def get_date_range(self, request):
        """Extract date range from request query params."""
        today = timezone.now().date()
        
        # Default to current financial year (April to March)
        year = request.query_params.get('year', today.year)
        if request.query_params.get('quarter'):
            quarter = int(request.query_params.get('quarter'))
            month_start = (quarter - 1) * 3 + 4  # April=4, July=7, October=10
            if month_start > 12:
                month_start -= 12
                year = int(year) + 1
            month_end = month_start + 2
            date_from = datetime(int(year), month_start, 1).date()
            date_to = (datetime(int(year), month_end, 1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        else:
            date_from = request.query_params.get('date_from', f'{year}-04-01')
            date_to = request.query_params.get('date_to', today)
        
        return date_from, date_to


class DashboardReportView(BaseReportView):
    """Dashboard summary report."""
    
    def get(self, request):
        """
        Get comprehensive dashboard data.
        Includes revenue, expenses, profit, and tax summaries.
        """
        user = request.user
        today = timezone.now().date()
        month_start = today.replace(day=1)
        year_start = datetime(today.year, 4, 1).date()  # April 1st
        
        # Handle financial year
        if today.month < 4:
            year_start = datetime(today.year - 1, 4, 1).date()
        
        # Get invoice queryset
        invoices = Invoice.objects.filter(user=user)
        expenses = Expense.objects.filter(user=user)
        
        # This month stats
        month_invoiced = invoices.filter(
            issue_date__gte=month_start,
            issue_date__lte=today
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        month_received = invoices.filter(
            paid_at__gte=month_start,
            paid_at__lte=today
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        month_expenses = expenses.filter(
            invoice_date__gte=month_start,
            invoice_date__lte=today
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Year to date stats
        ytd_invoiced = invoices.filter(
            issue_date__gte=year_start,
            issue_date__lte=today
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        ytd_received = invoices.filter(
            paid_at__gte=year_start,
            paid_at__lte=today
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        ytd_expenses = expenses.filter(
            invoice_date__gte=year_start,
            invoice_date__lte=today
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # GST collected
        gst_data = invoices.filter(
            issue_date__gte=year_start,
            issue_date__lte=today
        ).aggregate(
            cgst=Sum('cgst_amount'),
            sgst=Sum('sgst_amount'),
            igst=Sum('igst_amount')
        )
        gst_collected = {
            'cgst': float(gst_data['cgst'] or 0),
            'sgst': float(gst_data['sgst'] or 0),
            'igst': float(gst_data['igst'] or 0),
            'total': float((gst_data['cgst'] or 0) + (gst_data['sgst'] or 0) + (gst_data['igst'] or 0))
        }
        
        # Outstanding amounts
        overdue_invoices = invoices.filter(
            due_date__lt=today,
            status__in=['sent', 'overdue']
        )
        overdue_count = overdue_invoices.count()
        overdue_amount = overdue_invoices.aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        # Client stats
        total_clients = Client.objects.filter(user=user).count()
        active_clients = invoices.filter(
            status='paid'
        ).values('client').distinct().count()
        
        return Response({
            'this_month': {
                'invoiced': float(month_invoiced),
                'received': float(month_received),
                'expenses': float(month_expenses),
                'profit': float(month_received - month_expenses)
            },
            'year_to_date': {
                'invoiced': float(ytd_invoiced),
                'received': float(ytd_received),
                'expenses': float(ytd_expenses),
                'profit': float(ytd_received - ytd_expenses)
            },
            'gst_collected': gst_collected,
            'outstanding': {
                'count': overdue_count,
                'amount': float(overdue_amount)
            },
            'clients': {
                'total': total_clients,
                'active': active_clients
            },
            'invoice_counts': {
                'draft': invoices.filter(status='draft').count(),
                'sent': invoices.filter(status='sent').count(),
                'paid': invoices.filter(status='paid').count(),
                'overdue': overdue_count
            }
        })


class RevenueReportView(BaseReportView):
    """Revenue analysis report with monthly trends."""
    
    def get(self, request):
        """
        Get revenue report with monthly breakdown.
        Supports comparison with previous period.
        """
        user = request.user
        date_from, date_to = self.get_date_range(request)
        
        # Get monthly revenue data
        monthly_data = Invoice.objects.filter(
            user=user,
            issue_date__gte=date_from,
            issue_date__lte=date_to,
            status__in=['sent', 'paid']
        ).annotate(
            month=TruncMonth('issue_date')
        ).values('month').annotate(
            invoiced=Sum('total'),
            count=Count('id')
        ).order_by('month')
        
        # Get monthly receipts (payments received)
        monthly_receipts = Invoice.objects.filter(
            user=user,
            paid_at__gte=date_from,
            paid_at__lte=date_to
        ).annotate(
            month=TruncMonth('paid_at')
        ).values('month').annotate(
            received=Sum('total'),
            count=Count('id')
        ).order_by('month')
        
        # Get top clients by revenue
        top_clients = Invoice.objects.filter(
            user=user,
            issue_date__gte=date_from,
            issue_date__lte=date_to
        ).values(
            'client__name'
        ).annotate(
            total=Sum('total'),
            count=Count('id')
        ).order_by('-total')[:10]
        
        # Revenue by status
        revenue_by_status = Invoice.objects.filter(
            user=user,
            issue_date__gte=date_from,
            issue_date__lte=date_to
        ).values('status').annotate(
            total=Sum('total'),
            count=Count('id')
        ).order_by('status')
        
        return Response({
            'date_range': {
                'from': date_from,
                'to': date_to
            },
            'monthly_revenue': list(monthly_data),
            'monthly_receipts': list(monthly_receipts),
            'top_clients': list(top_clients),
            'revenue_by_status': list(revenue_by_status)
        })


class GSTR1ReportView(BaseReportView):
    """
    GSTR-1 Report (Outward Supplies)
    B2B, B2C, Export, and Nil Rated supplies
    """
    
    def get(self, request):
        """
        Generate GSTR-1 format report.
        Includes B2B, B2C large, B2C small, export, and nil-rated supplies.
        """
        user = request.user
        date_from, date_to = self.get_date_range(request)
        
        # B2B Supplies (Registered recipients - with GSTIN)
        b2b_invoices = Invoice.objects.filter(
            user=user,
            issue_date__gte=date_from,
            issue_date__lte=date_to,
            client__gstin__isnull=False
        ).exclude(
            client__gstin=''
        ).select_related('client').order_by('issue_date')
        
        b2b_data = []
        for invoice in b2b_invoices:
            b2b_data.append({
                'invoice_number': invoice.invoice_number,
                'invoice_date': invoice.issue_date.strftime('%d/%m/%Y'),
                'client_gstin': invoice.client.gstin,
                'client_name': invoice.client.name,
                'invoice_value': float(invoice.total),
                'place_of_supply': invoice.place_of_supply,
                'is_inter_state': invoice.is_inter_state,
                'rate_breakdown': self._get_rate_breakdown(invoice),
                'cess_amount': 0  # Add if applicable
            })
        
        # B2C Supplies (Unregistered recipients - without GSTIN)
        b2c_invoices = Invoice.objects.filter(
            user=user,
            issue_date__gte=date_from,
            issue_date__lte=date_to
        ).filter(
            Q(client__gstin__isnull=True) | Q(client__gstin='')
        ).select_related('client')
        
        # Group by rate and place of supply
        b2c_data = b2c_invoices.values(
            'place_of_supply', 'is_inter_state'
        ).annotate(
            invoice_count=Count('id'),
            total_value=Sum('total'),
            taxable_value=Sum('taxable_amount'),
            rate_5=Sum('taxable_amount') * 0,  # Calculate based on actual rates
            rate_12=Sum('taxable_amount') * 0,
            rate_18=Sum('taxable_amount') * 0,
            rate_28=Sum('taxable_amount') * 0,
            cess=Decimal('0')
        )
        
        # Nil Rated / Exempt supplies
        nil_rated = Invoice.objects.filter(
            user=user,
            issue_date__gte=date_from,
            issue_date__lte=date_to
        ).filter(
            Q(line_items__tax_percent=0) | Q(line_items__isnull=True)
        ).aggregate(
            total_value=Sum('total'),
            count=Count('id')
        )
        
        # Export with LUT/Bond
        export_invoices = Invoice.objects.filter(
            user=user,
            issue_date__gte=date_from,
            issue_date__lte=date_to
        ).filter(
            Q(client__country__isnull=False) | Q(place_of_supply__icontains='outside')
        ).aggregate(
            total_value=Sum('total'),
            count=Count('id')
        )
        
        # Summary
        summary = {
            'b2b_count': b2b_invoices.count(),
            'b2b_value': b2b_invoices.aggregate(total=Sum('total'))['total'] or Decimal('0'),
            'b2c_count': b2c_invoices.count(),
            'b2c_value': b2c_invoices.aggregate(total=Sum('total'))['total'] or Decimal('0'),
            'nil_rated_count': nil_rated['count'] or 0,
            'nil_rated_value': nil_rated['total_value'] or Decimal('0'),
            'export_count': export_invoices['count'] or 0,
            'export_value': export_invoices['total_value'] or Decimal('0')
        }
        
        return Response({
            'report_period': {
                'from': date_from,
                'to': date_to
            },
            'gstin': user.gstin,
            'legal_name': user.business_name,
            'b2b_supplies': b2b_data,
            'b2c_supplies': list(b2c_data),
            'nil_rated_supplies': {
                'count': summary['nil_rated_count'],
                'value': float(summary['nil_rated_value'])
            },
            'exports': {
                'count': summary['export_count'],
                'value': float(summary['export_value'])
            },
            'summary': summary
        })
    
    def _get_rate_breakdown(self, invoice):
        """Get tax breakdown by rate for an invoice."""
        # This would need to be calculated from line items in production
        return {
            '5': 0,
            '12': 0,
            '18': float(invoice.taxable_amount),
            '28': 0,
            'exempt': 0
        }


class GSTR3BReportView(BaseReportView):
    """
    GSTR-3B Summary Report
    Summary of outward supplies with tax liability
    """
    
    def get(self, request):
        """
        Generate GSTR-3B summary format.
        Includes inter-state and intra-state supplies.
        """
        user = request.user
        date_from, date_to = self.get_date_range(request)
        
        invoices = Invoice.objects.filter(
            user=user,
            issue_date__gte=date_from,
            issue_date__lte=date_to
        )
        
        # 3.1 - Details of Outward Supplies
        # 3.1(a) - Inter-State supplies (registered)
        inter_state = invoices.filter(is_inter_state=True).aggregate(
            total=Sum('total'),
            taxable=Sum('taxable_amount'),
            tax=Sum('total_tax')
        )
        
        # 3.1(b) - Intra-State supplies
        intra_state = invoices.filter(is_inter_state=False).aggregate(
            total=Sum('total'),
            taxable=Sum('taxable_amount'),
            tax=Sum('total_tax')
        )
        
        # 3.2 - Out of 3.1, supplies through e-commerce
        # (Would need e-commerce platform tracking)
        
        # ITC Available
        igst_collected = invoices.aggregate(total=Sum('igst_amount'))['total'] or Decimal('0')
        cgst_collected = invoices.aggregate(total=Sum('cgst_amount'))['total'] or Decimal('0')
        sgst_collected = invoices.aggregate(total=Sum('sgst_amount'))['total'] or Decimal('0')
        cess_collected = Decimal('0')  # Add if applicable
        
        return Response({
            'tax_period': {
                'from': date_from,
                'to': date_to
            },
            'gstin': user.gstin,
            'trade_name': user.business_name,
            
            'section_3_1': {
                'inter_state_supplies_to_unregistered': {
                    'taxable_value': float(inter_state['taxable'] or 0),
                    'amount': float(inter_state['total'] or 0),
                    'igst': float(inter_state['tax'] or 0),
                    'cgst': 0,
                    'sgst': 0,
                    'cess': 0
                },
                'inter_state_supplies_to_registered': {
                    'taxable_value': 0,
                    'amount': 0,
                    'igst': 0,
                    'cgst': 0,
                    'sgst': 0,
                    'cess': 0
                },
                'intra_state_supplies': {
                    'taxable_value': float(intra_state['taxable'] or 0),
                    'amount': float(intra_state['total'] or 0),
                    'igst': 0,
                    'cgst': float(cgst_collected),
                    'sgst': float(sgst_collected),
                    'cess': 0
                }
            },
            
            'section_3_2': {
                'through_ecommerce': {
                    'taxable_value': 0,
                    'igst': 0,
                    'cgst': 0,
                    'sgst': 0,
                    'cess': 0
                }
            },
            
            'tax_liability': {
                'igst': float(igst_collected),
                'cgst': float(cgst_collected),
                'sgst': float(sgst_collected),
                'cess': 0,
                'total': float(igst_collected + cgst_collected + sgst_collected)
            }
        })


class TDSReportView(BaseReportView):
    """TDS summary report for deductors."""
    
    def get(self, request):
        """
        Generate TDS summary report.
        Shows all invoices with TDS deductions.
        """
        user = request.user
        date_from, date_to = self.get_date_range(request)
        
        invoices = Invoice.objects.filter(
            user=user,
            issue_date__gte=date_from,
            issue_date__lte=date_to,
            tds_applicable=True
        ).select_related('client')
        
        # Group by TDS section
        by_section = invoices.values(
            'tds_section'
        ).annotate(
            count=Count('id'),
            total_amount=Sum('total'),
            tds_deducted=Sum('tds_amount')
        ).order_by('tds_section')
        
        # Group by client
        by_client = invoices.values(
            'client__name', 'client__pan', 'client__gstin'
        ).annotate(
            count=Count('id'),
            total_amount=Sum('total'),
            tds_deducted=Sum('tds_amount')
        ).order_by('client__name')
        
        total_tds = invoices.aggregate(total=Sum('tds_amount'))['total'] or Decimal('0')
        total_gross = invoices.aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        return Response({
            'report_period': {
                'from': date_from,
                'to': date_to
            },
            'pan': user.pan,
            
            'summary': {
                'total_invoices': invoices.count(),
                'gross_amount': float(total_gross),
                'total_tds_deducted': float(total_tds),
                'net_payment': float(total_gross - total_tds)
            },
            
            'by_section': list(by_section),
            'by_client': list(by_client)
        })


class ITRSummaryView(BaseReportView):
    """Income Tax Return summary report."""
    
    def get(self, request):
        """
        Generate ITR summary for tax filing.
        Shows income, expenses, and profit.
        """
        user = request.user
        date_from, date_to = self.get_date_range(request)
        
        # Get all paid invoices (actual receipts)
        paid_invoices = Invoice.objects.filter(
            user=user,
            paid_at__gte=date_from,
            paid_at__lte=date_to,
            status='paid'
        )
        
        # Calculate gross receipts
        gross_receipts = paid_invoices.aggregate(
            total=Sum('total')
        )['total'] or Decimal('0')
        
        # Get all expenses
        expenses = Expense.objects.filter(
            user=user,
            invoice_date__gte=date_from,
            invoice_date__lte=date_to
        )
        
        total_expenses = expenses.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        
        # Expenses by category
        expenses_by_category = expenses.values(
            'category'
        ).annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        # Calculate GST ITC eligible
        itc_eligible = expenses.filter(
            category__in=['software', 'equipment', 'professional']
        ).aggregate(
            total=Sum('gst_amount')
        )['total'] or Decimal('0')
        
        # Net profit
        net_profit = gross_receipts - total_expenses
        
        # TDS available as credit
        tds_credits = Invoice.objects.filter(
            user=user,
            paid_at__gte=date_from,
            paid_at__lte=date_to,
            tds_applicable=True
        ).aggregate(
            total=Sum('tds_amount')
        )['total'] or Decimal('0')
        
        return Response({
            'financial_year': {
                'from': date_from,
                'to': date_to
            },
            
            'income': {
                'gross_receipts': float(gross_receipts),
                'total_invoices': paid_invoices.count()
            },
            
            'expenses': {
                'total': float(total_expenses),
                'by_category': list(expenses_by_category)
            },
            
            'gst_itc': {
                'eligible': float(itc_eligible)
            },
            
            'profit': {
                'net_profit': float(net_profit),
                'margin_percent': float((net_profit / gross_receipts * 100) if gross_receipts else 0)
            },
            
            'tds_credits': {
                'available': float(tds_credits)
            }
        })


class ProfitLossReportView(BaseReportView):
    """Profit and Loss report."""
    
    def get(self, request):
        """Get detailed P&L report."""
        user = request.user
        date_from, date_to = self.get_date_range(request)
        
        # Income (Paid invoices)
        paid_invoices = Invoice.objects.filter(
            user=user,
            paid_at__gte=date_from,
            paid_at__lte=date_to,
            status='paid'
        )
        
        # Calculate income by service/category
        income_by_hsn = LineItem.objects.filter(
            invoice__user=user,
            invoice__paid_at__gte=date_from,
            invoice__paid_at__lte=date_to,
            invoice__status='paid'
        ).values(
            'hsn_sac'
        ).annotate(
            revenue=Sum('total'),
            taxable=Sum(F('quantity') * F('rate') - F('discount_amount'))
        ).order_by('-revenue')
        
        # Expenses
        expenses = Expense.objects.filter(
            user=user,
            invoice_date__gte=date_from,
            invoice_date__lte=date_to
        )
        
        expenses_by_category = expenses.values(
            'category'
        ).annotate(
            amount=Sum('amount'),
            count=Count('id')
        ).order_by('-amount')
        
        total_income = paid_invoices.aggregate(total=Sum('total'))['total'] or Decimal('0')
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        gross_profit = total_income - total_expenses
        
        # Calculate margins
        operating_margin = (gross_profit / total_income * 100) if total_income else Decimal('0')
        
        return Response({
            'period': {
                'from': date_from,
                'to': date_to
            },
            
            'income': {
                'total': float(total_income),
                'invoice_count': paid_invoices.count(),
                'by_service': list(income_by_hsn)
            },
            
            'expenses': {
                'total': float(total_expenses),
                'by_category': list(expenses_by_category)
            },
            
            'profit': {
                'gross': float(gross_profit),
                'margin_percent': float(operating_margin)
            }
        })
