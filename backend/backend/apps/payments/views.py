"""
Payment Views for InvoiceIN
REST API endpoints for payment processing and history
"""

import logging
from decimal import Decimal
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Q
from django.utils import timezone

from .models import PaymentRecord
from .serializers import PaymentRecordSerializer, PaymentCreateSerializer
from .services import PaymentService, PaymentError
from apps.invoices.models import Invoice

logger = logging.getLogger(__name__)


class PaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing payments.
    Integrates with Razorpay and tracks payment history.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentRecordSerializer

    def get_queryset(self):
        """Get payments filtered by authenticated user."""
        return PaymentRecord.objects.filter(
            user=self.request.user
        ).select_related('invoice', 'invoice__client').order_by('-created_at')

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return PaymentCreateSerializer
        return PaymentRecordSerializer

    def perform_create(self, serializer):
        """Create payment record with user association."""
        payment = serializer.save(user=self.request.user)
        logger.info(f"Payment record created by user {self.request.user.id}: {payment.id}")

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """
        Verify payment signature from Razorpay.
        """
        payment = self.get_object()
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_signature = request.data.get('razorpay_signature')

        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            return Response(
                {'error': 'Missing payment verification data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_valid = PaymentService.verify_payment_signature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        )

        if is_valid:
            payment.is_verified = True
            payment.save()
            return Response({'verified': True, 'payment_id': payment.id})

        return Response(
            {'error': 'Invalid payment signature'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['get'])
    def invoice_payments(self, request):
        """
        Get all payments for a specific invoice.
        """
        invoice_id = request.query_params.get('invoice_id')
        if not invoice_id:
            return Response(
                {'error': 'invoice_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        payments = PaymentRecord.objects.filter(
            user=request.user,
            invoice_id=invoice_id
        ).order_by('-created_at')

        serializer = PaymentRecordSerializer(payments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def create_payment_link(self, request):
        """
        Create a Razorpay payment link for an invoice.
        """
        invoice_id = request.data.get('invoice_id')
        amount = request.data.get('amount')

        if not invoice_id:
            return Response(
                {'error': 'invoice_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            invoice = Invoice.objects.get(
                id=invoice_id,
                user=request.user
            )
        except Invoice.DoesNotExist:
            return Response(
                {'error': 'Invoice not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not amount:
            amount = invoice.total

        try:
            result = PaymentService.get_payment_link(
                invoice=invoice,
                amount=Decimal(str(amount)),
                purpose=f"Invoice Payment - {invoice.invoice_number}"
            )

            # Create payment record
            payment = PaymentRecord.objects.create(
                user=request.user,
                invoice=invoice,
                amount=Decimal(str(amount)),
                payment_method='online',
                razorpay_payment_link_id=result.get('payment_link_id'),
                status='pending'
            )

            return Response({
                'payment_id': payment.id,
                'payment_link_id': result.get('payment_link_id'),
                'short_url': result.get('short_url'),
                'amount': result.get('amount'),
                'status': result.get('status')
            })

        except PaymentError as e:
            logger.error(f"Payment link creation failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def process_webhook(self, request):
        """
        Process Razorpay webhook payload.
        """
        try:
            result = PaymentService.process_webhook(request.data)

            if result.get('processed'):
                # Update invoice status based on webhook event
                event = result.get('event')
                if event == 'payment.captured':
                    # Find and update the invoice
                    order_id = result.get('order_id')
                    # Additional processing would go here

                    return Response({
                        'success': True,
                        'action': result.get('action'),
                        'payment_id': result.get('payment_id')
                    })

            return Response({
                'success': True,
                'event': result.get('event'),
                'processed': result.get('processed')
            })

        except Exception as e:
            logger.error(f"Webhook processing failed: {str(e)}")
            return Response(
                {'error': 'Webhook processing failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        """
        Initiate a refund for a payment.
        """
        payment = self.get_object()
        amount = request.data.get('amount')

        if payment.status != 'completed':
            return Response(
                {'error': 'Only completed payments can be refunded'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            refund_amount = Decimal(str(amount)) if amount else payment.amount
            result = PaymentService.refund_payment(
                payment_id=payment.razorpay_payment_id,
                amount=refund_amount,
                speed=request.data.get('speed', 'normal')
            )

            payment.refund_id = result.get('refund_id')
            payment.refund_amount = Decimal(str(result.get('amount', 0))) / Decimal('100')
            payment.refund_status = result.get('status')
            payment.save()

            return Response({
                'refund_id': result.get('refund_id'),
                'amount': result.get('amount'),
                'status': result.get('status'),
                'speed': result.get('speed')
            })

        except PaymentError as e:
            logger.error(f"Refund failed: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
