"""
Invoice Views for InvoiceIN
REST API endpoints with proper permissions, validation, and service layer integration
"""

import logging
from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import exception_handler
from django.db.models import Sum, Q
from django.utils import timezone
from django.http import HttpResponse

from .models import Invoice, LineItem, InvoiceActivity
from .serializers import (
    InvoiceListSerializer,
    InvoiceDetailSerializer,
    InvoiceCreateSerializer,
    InvoiceUpdateSerializer,
    InvoiceActivitySerializer,
    LineItemSerializer
)
from .services.invoice_service import InvoiceService, InvoiceNumberGenerator, InvoiceServiceError
from .services.pdf_service import PDFService, PDFGenerationError

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """Custom exception handler for better error responses."""
    response = exception_handler(exc, context)
    
    if response is not None:
        response.data = {
            'success': False,
            'error': response.data.get('detail', str(exc)),
            'status_code': response.status_code
        }
        
        # Add field-specific errors
        if hasattr(exc, 'detail') and isinstance(exc.detail, dict):
            response.data['field_errors'] = exc.detail
    
    return response


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing invoices.
    Provides CRUD operations with service layer integration.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = InvoiceListSerializer
    
    def get_queryset(self):
        """
        Get invoices filtered by authenticated user.
        Ensures complete user data isolation.
        """
        queryset = Invoice.objects.filter(
            user=self.request.user
        ).select_related(
            'client', 'user'
        ).prefetch_related('line_items')
        
        # Apply filters from query params
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        client_id = self.request.query_params.get('client')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(issue_date__gte=date_from)
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(issue_date__lte=date_to)
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return InvoiceListSerializer
        elif self.action == 'create':
            return InvoiceCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return InvoiceUpdateSerializer
        return InvoiceDetailSerializer
    
    def perform_create(self, serializer):
        """
        Create invoice using service layer.
        Handles transaction and audit logging.
        """
        try:
            validated_data = serializer.validated_data
            
            invoice = InvoiceService.create_invoice(
                user=self.request.user,
                client=validated_data['client'],
                line_items=validated_data['line_items'],
                issue_date=validated_data['issue_date'],
                due_date=validated_data['due_date'],
                discount_percent=validated_data.get('discount_percent', Decimal('0')),
                notes=validated_data.get('notes', ''),
                terms=validated_data.get('terms', ''),
                tds_applicable=validated_data.get('tds_applicable', False),
                tds_percent=validated_data.get('tds_percent', Decimal('0')),
                tds_section=validated_data.get('tds_section', '')
            )
            
            logger.info(f"Invoice created: {invoice.invoice_number} by user {self.request.user.id}")
            
        except InvoiceServiceError as e:
            logger.error(f"Invoice creation failed: {str(e)}")
            raise
    
    def perform_update(self, serializer):
        """Update invoice using service layer."""
        try:
            invoice = self.get_object()
            validated_data = serializer.validated_data
            
            updated_invoice = InvoiceService.update_invoice(
                invoice=invoice,
                line_items=validated_data['line_items'],
                discount_percent=validated_data.get('discount_percent'),
                notes=validated_data.get('notes'),
                terms=validated_data.get('terms'),
                tds_applicable=validated_data.get('tds_applicable'),
                tds_percent=validated_data.get('tds_percent'),
                tds_section=validated_data.get('tds_section')
            )
            
            logger.info(f"Invoice updated: {updated_invoice.invoice_number}")
            
        except InvoiceServiceError as e:
            logger.error(f"Invoice update failed: {str(e)}")
            raise
    
    def destroy(self, request, *args, **kwargs):
        """
        Override destroy to use service layer cancellation.
        Soft delete by setting status to CANCELLED.
        """
        invoice = self.get_object()
        try:
            InvoiceService.cancel_invoice(invoice, reason="Deleted by user")
            return Response(
                {'status': 'Invoice cancelled successfully'},
                status=status.HTTP_200_OK
            )
        except InvoiceServiceError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """
        Send invoice via email or WhatsApp.
        Integrates with notification service.
        """
        invoice = self.get_object()
        send_method = request.data.get('method', 'email')
        
        try:
            updated_invoice = InvoiceService.send_invoice(invoice, method=send_method)
            
            # In production, trigger actual email/WhatsApp sending here
            
            return Response({
                'success': True,
                'status': 'Invoice sent successfully',
                'invoice_number': updated_invoice.invoice_number,
                'sent_at': updated_invoice.sent_at
            })
            
        except InvoiceServiceError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """
        Mark invoice as paid with payment reference.
        """
        invoice = self.get_object()
        payment_reference = request.data.get('payment_reference', '')
        
        try:
            updated_invoice = InvoiceService.mark_as_paid(
                invoice,
                payment_reference=payment_reference
            )
            
            return Response({
                'success': True,
                'status': 'Invoice marked as paid',
                'invoice_number': updated_invoice.invoice_number,
                'paid_at': updated_invoice.paid_at
            })
            
        except InvoiceServiceError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def send_reminder(self, request, pk=None):
        """
        Send payment reminder for overdue invoice.
        """
        invoice = self.get_object()
        
        if invoice.status not in [Invoice.Status.SENT, Invoice.Status.OVERDUE]:
            return Response(
                {'error': 'Can only send reminders for sent or overdue invoices'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        InvoiceActivity.objects.create(
            invoice=invoice,
            activity_type=InvoiceActivity.ActivityType.REMINDER_SENT,
            description="Payment reminder sent"
        )
        
        # In production, send actual reminder via email/SMS/WhatsApp
        
        return Response({
            'success': True,
            'status': 'Reminder sent successfully'
        })
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """
        Create a duplicate of the invoice with a new number.
        """
        invoice = self.get_object()
        
        try:
            new_invoice = InvoiceService.duplicate_invoice(invoice)
            serializer = InvoiceDetailSerializer(new_invoice)
            
            return Response({
                'success': True,
                'invoice': serializer.data,
                'message': f'Duplicate created: {new_invoice.invoice_number}'
            }, status=status.HTTP_201_CREATED)
            
        except InvoiceServiceError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        """
        Get invoice activity history for audit trail.
        """
        invoice = self.get_object()
        activities = invoice.activities.all().order_by('-created_at')
        serializer = InvoiceActivitySerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """
        Generate and return PDF for invoice.
        Supports both preview (HTML) and download (PDF).
        """
        invoice = self.get_object()
        output_format = request.query_params.get('format', 'pdf')
        
        try:
            if output_format == 'html':
                content = PDFService.generate_invoice_pdf(invoice, output_format='html')
                return HttpResponse(content, content_type='text/html')
            else:
                pdf_content = PDFService.generate_invoice_pdf(invoice, output_format='pdf')
                response = HttpResponse(pdf_content, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="Invoice-{invoice.invoice_number}.pdf"'
                return response
                
        except PDFGenerationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        Get dashboard statistics for the authenticated user.
        Returns invoiced, received, overdue, and GST liability data.
        """
        today = timezone.now().date()
        month_start = today.replace(day=1)
        year_start = today.replace(month=1, day=1)
        
        user = request.user
        
        # Check and update overdue invoices
        InvoiceService.check_overdue_and_update(user)
        
        # Get base queryset
        queryset = self.get_queryset()
        
        # Invoiced this month
        invoiced = queryset.filter(
            issue_date__gte=month_start,
            issue_date__lte=today
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        # Received this month
        received = queryset.filter(
            paid_at__gte=month_start,
            paid_at__lte=today
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        # Overdue amount
        overdue = queryset.filter(
            due_date__lt=today,
            status__in=[Invoice.Status.SENT, Invoice.Status.OVERDUE]
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        # Overdue count
        overdue_count = queryset.filter(
            due_date__lt=today,
            status__in=[Invoice.Status.SENT, Invoice.Status.OVERDUE]
        ).count()
        
        # GST liability for the year
        gst_data = queryset.filter(
            issue_date__gte=year_start,
            issue_date__lte=today
        ).aggregate(
            cgst=Sum('cgst_amount'),
            sgst=Sum('sgst_amount'),
            igst=Sum('igst_amount')
        )
        total_gst = (gst_data['cgst'] or Decimal('0')) + \
                     (gst_data['sgst'] or Decimal('0')) + \
                     (gst_data['igst'] or Decimal('0'))
        
        # Pending invoices count
        pending_count = queryset.filter(
            status__in=[Invoice.Status.DRAFT, Invoice.Status.SENT]
        ).count()
        
        return Response({
            'invoiced_this_month': float(invoiced),
            'received_this_month': float(received),
            'overdue_amount': float(overdue),
            'overdue_count': overdue_count,
            'gst_liability': float(total_gst),
            'pending_invoices': pending_count,
            'total_outstanding': float(invoiced - received + overdue)
        })
    
    @action(detail=False, methods=['post'])
    def generate_number(self, request):
        """
        Generate next invoice number for preview.
        """
        prefix = request.data.get('prefix', 'INV')
        invoice_number = InvoiceNumberGenerator.generate(
            user=request.user,
            prefix=prefix,
            date_prefix=True
        )
        
        return Response({
            'invoice_number': invoice_number
        })
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get invoice summary by status.
        """
        queryset = self.get_queryset()
        
        summary = {}
        for status_choice in Invoice.Status.choices:
            status_value = status_choice[0]
            count = queryset.filter(status=status_value).count()
            total = queryset.filter(status=status_value).aggregate(
                total=Sum('total')
            )['total'] or Decimal('0')
            
            summary[status_value] = {
                'count': count,
                'total': float(total)
            }
        
        return Response(summary)


class LineItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing line items.
    Usually accessed through invoice nested routes.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = LineItemSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']
    
    def get_queryset(self):
        """Get line items for invoices belonging to user."""
        invoice_id = self.kwargs.get('invoice_pk')
        if invoice_id:
            return LineItem.objects.filter(
                invoice__user=self.request.user,
                invoice_id=invoice_id
            ).order_by('order')
        return LineItem.objects.none()
