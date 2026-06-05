"""
Payment Service for InvoiceIN
Razorpay integration for accepting online payments
"""

import logging
import hashlib
import hmac
from decimal import Decimal
from typing import Dict, Optional, Any
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class PaymentError(Exception):
    """Custom exception for payment errors."""
    pass


class PaymentService:
    """
    Service layer for payment processing.
    Supports Razorpay integration with webhook handling.
    """
    
    @classmethod
    def initialize_razorpay(cls):
        """Initialize Razorpay client."""
        try:
            import razorpay
            return razorpay.Client(
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
            )
        except ImportError:
            logger.warning("Razorpay SDK not installed")
            return None
    
    @classmethod
    def create_order(
        cls,
        invoice,
        amount: Decimal,
        currency: str = 'INR',
        receipt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a Razorpay order for an invoice.
        
        Args:
            invoice: Invoice instance
            amount: Amount in INR (will be converted to paise)
            currency: Currency code (default INR)
            receipt: Receipt number
            
        Returns:
            Dictionary with order details
        """
        logger.info(f"Creating Razorpay order for invoice {invoice.invoice_number}")
        
        client = cls.initialize_razorpay()
        if not client:
            raise PaymentError("Payment gateway not configured")
        
        try:
            # Convert to paise (Razorpay uses smallest currency unit)
            amount_paise = int(float(amount) * 100)
            
            data = {
                'amount': amount_paise,
                'currency': currency,
                'receipt': receipt or invoice.invoice_number,
                'notes': {
                    'invoice_number': invoice.invoice_number,
                    'invoice_id': str(invoice.id),
                    'client_name': invoice.client.name
                }
            }
            
            order = client.order.create(data=data)
            
            logger.info(f"Razorpay order created: {order['id']}")
            
            return {
                'order_id': order['id'],
                'amount': amount_paise,
                'currency': currency,
                'status': 'created'
            }
            
        except Exception as e:
            logger.error(f"Failed to create Razorpay order: {str(e)}")
            raise PaymentError(f"Failed to create payment order: {str(e)}")
    
    @classmethod
    def get_payment_link(
        cls,
        invoice,
        amount: Decimal,
        purpose: str = 'Invoice Payment'
    ) -> Dict[str, Any]:
        """
        Generate a payment link for the invoice.
        
        Args:
            invoice: Invoice instance
            amount: Amount in INR
            purpose: Purpose description
            
        Returns:
            Dictionary with payment link details
        """
        logger.info(f"Generating payment link for invoice {invoice.invoice_number}")
        
        client = cls.initialize_razorpay()
        if not client:
            raise PaymentError("Payment gateway not configured")
        
        try:
            amount_paise = int(float(amount) * 100)
            
            data = {
                'amount': amount_paise,
                'currency': 'INR',
                'purpose': purpose,
                'description': f'Payment for Invoice {invoice.invoice_number}',
                'receipt': invoice.invoice_number,
                'notes': {
                    'invoice_number': invoice.invoice_number,
                    'client_name': invoice.client.name,
                    'due_date': str(invoice.due_date)
                }
            }
            
            payment_link = client.payment_link.create(data=data)
            
            logger.info(f"Payment link created: {payment_link['id']}")
            
            return {
                'payment_link_id': payment_link['id'],
                'short_url': payment_link['short_url'],
                'amount': amount_paise,
                'status': payment_link['status']
            }
            
        except Exception as e:
            logger.error(f"Failed to create payment link: {str(e)}")
            raise PaymentError(f"Failed to create payment link: {str(e)}")
    
    @classmethod
    def verify_payment_signature(
        cls,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str
    ) -> bool:
        """
        Verify Razorpay payment signature.
        
        Args:
            razorpay_order_id: Order ID from Razorpay
            razorpay_payment_id: Payment ID from Razorpay
            razorpay_signature: Signature from Razorpay
            
        Returns:
            True if signature is valid
        """
        try:
            payload = f"{razorpay_order_id}|{razorpay_payment_id}"
            expected_signature = hmac.new(
                settings.RAZORPAY_KEY_SECRET.encode(),
                payload.encode(),
                hashlib.sha256
            ).hexdigest()
            
            is_valid = hmac.compare_digest(expected_signature, razorpay_signature)
            
            if not is_valid:
                logger.warning(f"Invalid payment signature for order {razorpay_order_id}")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"Signature verification failed: {str(e)}")
            return False
    
    @classmethod
    def process_webhook(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process Razorpay webhook payload.
        
        Args:
            payload: Webhook payload from Razorpay
            
        Returns:
            Dictionary with processed webhook data
        """
        event = payload.get('event')
        entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
        
        logger.info(f"Processing webhook event: {event}")
        
        result = {
            'event': event,
            'processed': False,
            'payment_id': entity.get('id'),
            'order_id': entity.get('order_id'),
            'amount': entity.get('amount'),
            'status': entity.get('status')
        }
        
        if event == 'payment.captured':
            result['processed'] = True
            result['action'] = 'payment_captured'
            logger.info(f"Payment captured: {result['payment_id']}")
            
        elif event == 'payment.failed':
            result['processed'] = True
            result['action'] = 'payment_failed'
            result['error_code'] = entity.get('error_code')
            result['error_description'] = entity.get('error_description')
            logger.warning(f"Payment failed: {result['error_description']}")
            
        elif event == 'order.paid':
            result['processed'] = True
            result['action'] = 'order_paid'
            logger.info(f"Order paid: {result['order_id']}")
        
        return result
    
    @classmethod
    def refund_payment(
        cls,
        payment_id: str,
        amount: Optional[Decimal] = None,
        speed: str = 'normal'
    ) -> Dict[str, Any]:
        """
        Initiate a refund for a payment.
        
        Args:
            payment_id: Razorpay payment ID
            amount: Amount to refund (None for full refund)
            speed: Refund speed ('normal' or 'optimum')
            
        Returns:
            Dictionary with refund details
        """
        logger.info(f"Processing refund for payment {payment_id}")
        
        client = cls.initialize_razorpay()
        if not client:
            raise PaymentError("Payment gateway not configured")
        
        try:
            data = {'speed': speed}
            if amount:
                data['amount'] = int(float(amount) * 100)
            
            refund = client.payment.refund(payment_id, data)
            
            logger.info(f"Refund initiated: {refund['id']}")
            
            return {
                'refund_id': refund['id'],
                'payment_id': payment_id,
                'amount': refund['amount'],
                'status': refund['status'],
                'speed': refund['speed']
            }
            
        except Exception as e:
            logger.error(f"Refund failed: {str(e)}")
            raise PaymentError(f"Failed to process refund: {str(e)}")
    
    @classmethod
    def get_payment_details(cls, payment_id: str) -> Dict[str, Any]:
        """
        Get details of a payment.
        
        Args:
            payment_id: Razorpay payment ID
            
        Returns:
            Dictionary with payment details
        """
        client = cls.initialize_razorpay()
        if not client:
            raise PaymentError("Payment gateway not configured")
        
        try:
            payment = client.payment.fetch(payment_id)
            
            return {
                'payment_id': payment['id'],
                'order_id': payment['order_id'],
                'amount': payment['amount'],
                'currency': payment['currency'],
                'status': payment['status'],
                'method': payment['method'],
                'description': payment.get('description'),
                'email': payment.get('email'),
                'contact': payment.get('contact'),
                'created_at': payment['created_at']
            }
            
        except Exception as e:
            logger.error(f"Failed to fetch payment details: {str(e)}")
            raise PaymentError(f"Failed to get payment details: {str(e)}")


class QRCodeService:
    """
    Service for generating UPI QR codes for payments.
    """
    
    @classmethod
    def generate_upi_qr_data(
        cls,
        upi_id: str,
        amount: Decimal,
        name: str,
        invoice_number: str
    ) -> str:
        """
        Generate UPI QR code data string.
        
        Args:
            upi_id: UPI ID for receiving payments
            amount: Amount to collect
            name: Merchant name
            invoice_number: Invoice reference
            
        Returns:
            UPI QR code data string
        """
        # UPI QR format: upi://pay?pa=<upi_id>&pn=<name>&am=<amount>&cu=INR&tr=<ref>
        qr_data = (
            f"upi://pay?"
            f"pa={upi_id}"
            f"&pn={name}"
            f"&am={amount}"
            f"&cu=INR"
            f"&tr={invoice_number}"
            f"&tn=Payment+for+Invoice+{invoice_number}"
        )
        
        return qr_data
    
    @classmethod
    def generate_qr_image(cls, qr_data: str) -> bytes:
        """
        Generate QR code image from data.
        
        Args:
            qr_data: QR code data string
            
        Returns:
            PNG image bytes
        """
        try:
            import qrcode
            from io import BytesIO
            
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(qr_data)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            return buffer.getvalue()
            
        except ImportError:
            logger.warning("qrcode library not installed")
            raise PaymentError("QR code generation requires qrcode library")
