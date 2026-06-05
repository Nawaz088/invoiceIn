"""
Expense Views for InvoiceIN
REST API endpoints with proper permissions and user isolation
"""

import logging
from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, F
from django.db.models.functions import TruncMonth
from django.utils import timezone

from .models import Expense
from .serializers import (
    ExpenseSerializer,
    ExpenseCreateSerializer,
    ExpenseUpdateSerializer
)

logger = logging.getLogger(__name__)


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing expenses with complete user isolation.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ExpenseSerializer
    
    def get_queryset(self):
        """
        Get expenses filtered by authenticated user.
        Ensures complete user data isolation.
        """
        queryset = Expense.objects.filter(
            user=self.request.user
        ).order_by('-invoice_date')
        
        # Apply filters from query params
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        payment_mode = self.request.query_params.get('payment_mode')
        if payment_mode:
            queryset = queryset.filter(payment_mode=payment_mode)
        
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(invoice_date__gte=date_from)
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(invoice_date__lte=date_to)
        
        vendor = self.request.query_params.get('vendor')
        if vendor:
            queryset = queryset.filter(vendor_name__icontains=vendor)
        
        return queryset
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return ExpenseCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ExpenseUpdateSerializer
        return ExpenseSerializer
    
    def perform_create(self, serializer):
        """Create expense with user association."""
        serializer.save(user=self.request.user)
        logger.info(f"Expense created by user {self.request.user.id}")
    
    def perform_update(self, serializer):
        """Update expense."""
        serializer.save()
        logger.info(f"Expense updated by user {self.request.user.id}")
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get comprehensive expense summary.
        Includes totals, ITC eligibility, and category breakdown.
        """
        today = timezone.now().date()
        year_start = today.replace(month=1, day=1)
        
        date_from = request.query_params.get('date_from', year_start)
        date_to = request.query_params.get('date_to', today)
        
        expenses = self.get_queryset().filter(
            invoice_date__gte=date_from,
            invoice_date__lte=date_to
        )
        
        # Calculate totals
        total_amount = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        total_gst = expenses.aggregate(total=Sum('gst_amount'))['total'] or Decimal('0')
        
        # ITC eligible categories
        itc_eligible_categories = ['software', 'equipment', 'professional', 'rent', 'utilities']
        itc_amount = expenses.filter(
            category__in=itc_eligible_categories
        ).aggregate(total=Sum('gst_amount'))['total'] or Decimal('0')
        
        # By category
        by_category = expenses.values('category').annotate(
            total=Sum('amount'),
            gst=Sum('gst_amount'),
            count=Count('id')
        ).order_by('-total')
        
        # By payment mode
        by_payment_mode = expenses.values('payment_mode').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        # Monthly trend
        monthly_trend = expenses.annotate(
            month=TruncMonth('invoice_date')
        ).values('month').annotate(
            total=Sum('amount'),
            gst=Sum('gst_amount')
        ).order_by('month')
        
        return Response({
            'date_range': {
                'from': date_from,
                'to': date_to
            },
            'total_expenses': float(total_amount),
            'total_gst': float(total_gst),
            'total_itc': float(itc_amount),
            'expense_count': expenses.count(),
            'by_category': [
                {
                    'category': item['category'],
                    'category_display': dict(Expense.Category.choices).get(item['category'], item['category']),
                    'total': float(item['total']),
                    'gst': float(item['gst']),
                    'count': item['count']
                }
                for item in by_category
            ],
            'by_payment_mode': [
                {
                    'payment_mode': item['payment_mode'],
                    'payment_mode_display': dict(Expense.PaymentMode.choices).get(item['payment_mode'], item['payment_mode']),
                    'total': float(item['total']),
                    'count': item['count']
                }
                for item in by_payment_mode
            ],
            'monthly_trend': [
                {
                    'month': item['month'].strftime('%Y-%m') if item['month'] else None,
                    'total': float(item['total']),
                    'gst': float(item['gst'])
                }
                for item in monthly_trend
            ]
        })
    
    @action(detail=False, methods=['get'])
    def itc_report(self, request):
        """
        Get Input Tax Credit (ITC) report.
        Shows ITC eligible and ineligible expenses.
        """
        today = timezone.now().date()
        year_start = today.replace(month=1, day=1)
        
        date_from = request.query_params.get('date_from', year_start)
        date_to = request.query_params.get('date_to', today)
        
        expenses = self.get_queryset().filter(
            invoice_date__gte=date_from,
            invoice_date__lte=date_to
        )
        
        itc_eligible_categories = ['software', 'equipment', 'professional', 'rent', 'utilities']
        
        eligible = expenses.filter(category__in=itc_eligible_categories)
        ineligible = expenses.exclude(category__in=itc_eligible_categories)
        
        return Response({
            'date_range': {
                'from': date_from,
                'to': date_to
            },
            'itc_eligible': {
                'count': eligible.count(),
                'total_amount': float(eligible.aggregate(total=Sum('amount'))['total'] or 0),
                'total_gst': float(eligible.aggregate(total=Sum('gst_amount'))['total'] or 0)
            },
            'itc_ineligible': {
                'count': ineligible.count(),
                'total_amount': float(ineligible.aggregate(total=Sum('amount'))['total'] or 0),
                'total_gst': 0
            },
            'total_itc_available': float(
                eligible.aggregate(total=Sum('gst_amount'))['total'] or 0
            )
        })
    
    @action(detail=False, methods=['get'])
    def profit_impact(self, request):
        """
        Get profit impact analysis.
        Compares expenses against revenue.
        """
        from apps.invoices.models import Invoice
        
        today = timezone.now().date()
        year_start = today.replace(month=1, day=1)
        
        date_from = request.query_params.get('date_from', year_start)
        date_to = request.query_params.get('date_to', today)
        
        # Get revenue (paid invoices)
        revenue = Invoice.objects.filter(
            user=request.user,
            paid_at__gte=date_from,
            paid_at__lte=date_to,
            status='paid'
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        # Get expenses
        expenses = self.get_queryset().filter(
            invoice_date__gte=date_from,
            invoice_date__lte=date_to
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        profit = revenue - expenses
        profit_margin = (profit / revenue * 100) if revenue > 0 else Decimal('0')
        
        return Response({
            'date_range': {
                'from': date_from,
                'to': date_to
            },
            'revenue': float(revenue),
            'expenses': float(expenses),
            'profit': float(profit),
            'profit_margin_percent': float(profit_margin)
        })
