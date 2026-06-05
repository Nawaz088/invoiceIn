"""
Invoice Service for InvoiceIN
Handles invoice creation, updates, calculations, and workflow orchestration
"""

import logging
from decimal import Decimal
from typing import Dict, List, Optional, Any
from django.db import transaction
from django.utils import timezone
from datetime import datetime, timedelta

from apps.invoices.models import Invoice, LineItem, InvoiceActivity
from apps.clients.models import Client
from apps.users.models import User
from .tax_service import TaxService, TaxCalculationError

logger = logging.getLogger(__name__)


class InvoiceServiceError(Exception):
    """Custom exception for invoice service errors"""
    pass


class InvoiceNumberGenerator:
    """Generate unique invoice numbers with customizable prefix"""
    
    @classmethod
    def generate(
        cls,
        user: User,
        prefix: Optional[str] = None,
        date_prefix: bool = True
    ) -> str:
        """
        Generate a unique invoice number.
        
        Args:
            user: The user creating the invoice
            prefix: Custom prefix (default: 'INV')
            date_prefix: Include year-month in prefix
            
        Returns:
            Generated invoice number
        """
        if prefix is None:
            prefix = 'INV'
        
        now = timezone.now()
        
        if date_prefix:
            prefix = f"{prefix}-{now.year}{str(now.month).zfill(2)}"
        else:
            prefix = f"{prefix}-{now.year}"
        
        # Get the last invoice number for this user
        last_invoice = Invoice.objects.filter(
            user=user,
            invoice_number__startswith=prefix
        ).order_by('-invoice_number').first()
        
        if last_invoice:
            try:
                last_num = int(last_invoice.invoice_number.split('-')[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        
        return f"{prefix}-{str(next_num).zfill(4)}"


class InvoiceService:
    """
    Service layer for invoice operations.
    Provides centralized business logic, transaction safety, and audit trails.
    """
    
    @classmethod
    @transaction.atomic
    def create_invoice(
        cls,
        user: User,
        client: Client,
        line_items: List[Dict[str, Any]],
        issue_date,
        due_date,
        discount_percent: Decimal = Decimal('0'),
        notes: str = '',
        terms: str = '',
        tds_applicable: bool = False,
        tds_percent: Decimal = Decimal('0'),
        tds_section: str = ''
    ) -> Invoice:
        """
        Create a new invoice with line items and proper calculations.
        
        Args:
            user: The user creating the invoice
            client: The client being invoiced
            line_items: List of line item dictionaries
            issue_date: Invoice issue date
            due_date: Payment due date
            discount_percent: Overall discount percentage
            notes: Invoice notes
            terms: Invoice terms and conditions
            tds_applicable: Whether TDS is applicable
            tds_percent: TDS percentage
            tds_section: TDS section (e.g., '194J')
            
        Returns:
            Created Invoice instance
        """
        logger.info(f"Creating invoice for user {user.id}, client {client.id}")
        
        # Validate inputs
        if not line_items:
            raise InvoiceServiceError("At least one line item is required")
        
        if due_date < issue_date:
            raise InvoiceServiceError("Due date cannot be before issue date")
        
        # Generate invoice number
        invoice_number = InvoiceNumberGenerator.generate(user)
        
        # Create invoice instance
        invoice = Invoice.objects.create(
            user=user,
            client=client,
            invoice_number=invoice_number,
            issue_date=issue_date,
            due_date=due_date,
            place_of_supply=client.state,
            discount_percent=discount_percent,
            notes=notes,
            terms=terms,
            tds_applicable=tds_applicable,
            tds_percent=tds_percent,
            tds_section=tds_section,
            status=Invoice.Status.DRAFT
        )
        
        # Create line items and calculate totals
        subtotal = Decimal('0')
        
        for idx, item_data in enumerate(line_items):
            line_item = cls._create_line_item(invoice, item_data, idx)
            subtotal += line_item.total
        
        # Calculate invoice totals
        cls._calculate_invoice_totals(invoice, subtotal)
        
        # Create activity log
        InvoiceActivity.objects.create(
            invoice=invoice,
            activity_type=InvoiceActivity.ActivityType.CREATED,
            description=f"Invoice {invoice_number} created with {len(line_items)} line items"
        )
        
        logger.info(f"Invoice {invoice_number} created successfully")
        return invoice
    
    @classmethod
    @transaction.atomic
    def update_invoice(
        cls,
        invoice: Invoice,
        line_items: List[Dict[str, Any]],
        discount_percent: Optional[Decimal] = None,
        notes: Optional[str] = None,
        terms: Optional[str] = None,
        tds_applicable: Optional[bool] = None,
        tds_percent: Optional[Decimal] = None,
        tds_section: Optional[str] = None
    ) -> Invoice:
        """
        Update an existing invoice.
        
        Args:
            invoice: Invoice to update
            line_items: Updated line items
            Other optional fields
            
        Returns:
            Updated Invoice instance
        """
        logger.info(f"Updating invoice {invoice.invoice_number}")
        
        if invoice.status == Invoice.Status.PAID:
            raise InvoiceServiceError("Cannot update a paid invoice")
        
        # Update optional fields
        if discount_percent is not None:
            invoice.discount_percent = discount_percent
        if notes is not None:
            invoice.notes = notes
        if terms is not None:
            invoice.terms = terms
        if tds_applicable is not None:
            invoice.tds_applicable = tds_applicable
        if tds_percent is not None:
            invoice.tds_percent = tds_percent
        if tds_section is not None:
            invoice.tds_section = tds_section
        
        # Update line items
        invoice.line_items.all().delete()
        subtotal = Decimal('0')
        
        for idx, item_data in enumerate(line_items):
            line_item = cls._create_line_item(invoice, item_data, idx)
            subtotal += line_item.total
        
        # Recalculate totals
        cls._calculate_invoice_totals(invoice, subtotal)
        
        invoice.save()
        
        # Log activity
        InvoiceActivity.objects.create(
            invoice=invoice,
            activity_type=InvoiceActivity.ActivityType.EDITED,
            description=f"Invoice updated with {len(line_items)} line items"
        )
        
        logger.info(f"Invoice {invoice.invoice_number} updated successfully")
        return invoice
    
    @classmethod
    @transaction.atomic
    def send_invoice(cls, invoice: Invoice, method: str = 'email') -> Invoice:
        """
        Send an invoice to the client.
        
        Args:
            invoice: Invoice to send
            method: Sending method ('email', 'whatsapp', 'sms')
            
        Returns:
            Updated Invoice instance
        """
        logger.info(f"Sending invoice {invoice.invoice_number} via {method}")
        
        if invoice.status == Invoice.Status.PAID:
            raise InvoiceServiceError("Cannot send a paid invoice")
        
        if invoice.status == Invoice.Status.DRAFT:
            invoice.status = Invoice.Status.SENT
        
        invoice.sent_at = timezone.now()
        invoice.save()
        
        InvoiceActivity.objects.create(
            invoice=invoice,
            activity_type=InvoiceActivity.ActivityType.SENT,
            description=f"Invoice sent via {method}"
        )
        
        # In production, integrate with email/WhatsApp service here
        
        return invoice
    
    @classmethod
    @transaction.atomic
    def mark_as_paid(
        cls,
        invoice: Invoice,
        payment_reference: str = '',
        payment_date: Optional[datetime] = None
    ) -> Invoice:
        """
        Mark an invoice as paid.
        
        Args:
            invoice: Invoice to mark as paid
            payment_reference: Payment reference/transaction ID
            payment_date: Date of payment (defaults to now)
            
        Returns:
            Updated Invoice instance
        """
        logger.info(f"Marking invoice {invoice.invoice_number} as paid")
        
        if invoice.status == Invoice.Status.PAID:
            raise InvoiceServiceError("Invoice is already paid")
        
        invoice.status = Invoice.Status.PAID
        invoice.paid_at = payment_date or timezone.now()
        invoice.save()
        
        InvoiceActivity.objects.create(
            invoice=invoice,
            activity_type=InvoiceActivity.ActivityType.PAID,
            description=f"Payment received: {payment_reference or 'N/A'}"
        )
        
        return invoice
    
    @classmethod
    @transaction.atomic
    def cancel_invoice(cls, invoice: Invoice, reason: str = '') -> Invoice:
        """
        Cancel an invoice.
        
        Args:
            invoice: Invoice to cancel
            reason: Cancellation reason
            
        Returns:
            Updated Invoice instance
        """
        logger.info(f"Cancelling invoice {invoice.invoice_number}")
        
        if invoice.status == Invoice.Status.PAID:
            raise InvoiceServiceError("Cannot cancel a paid invoice")
        
        old_status = invoice.status
        invoice.status = Invoice.Status.CANCELLED
        invoice.save()
        
        InvoiceActivity.objects.create(
            invoice=invoice,
            activity_type=InvoiceActivity.ActivityType.DELETED,
            description=f"Invoice cancelled: {reason or old_status}"
        )
        
        return invoice
    
    @classmethod
    def _create_line_item(
        cls,
        invoice: Invoice,
        item_data: Dict[str, Any],
        order: int
    ) -> LineItem:
        """
        Create a line item with calculated totals.
        
        Args:
            invoice: Parent invoice
            item_data: Line item data
            order: Sort order
            
        Returns:
            Created LineItem instance
        """
        # Calculate line item totals
        calc_result = TaxService.calculate_line_item_totals(
            quantity=Decimal(str(item_data.get('quantity', 1))),
            rate=Decimal(str(item_data.get('rate', 0))),
            discount_percent=Decimal(str(item_data.get('discount_percent', 0))),
            tax_percent=Decimal(str(item_data.get('tax_percent', 18)))
        )
        
        line_item = LineItem.objects.create(
            invoice=invoice,
            description=item_data.get('description', ''),
            hsn_sac=item_data.get('hsn_sac', '9999'),
            quantity=Decimal(str(item_data.get('quantity', 1))),
            rate=Decimal(str(item_data.get('rate', 0))),
            discount_percent=calc_result['discount_percent'],
            discount_amount=calc_result['discount_amount'],
            tax_percent=calc_result['tax_percent'],
            tax_amount=calc_result['tax_amount'],
            total=calc_result['total'],
            order=order
        )
        
        return line_item
    
    @classmethod
    def _calculate_invoice_totals(cls, invoice: Invoice, subtotal: Decimal) -> None:
        """
        Calculate all invoice totals including GST.
        
        Args:
            invoice: Invoice to calculate
            subtotal: Sum of line item totals
        """
        # Apply invoice-level discount
        discount_amount = (subtotal * invoice.discount_percent / Decimal('100')).quantize(
            Decimal('0.01')
        )
        invoice.discount_amount = discount_amount
        
        # Calculate taxable amount
        taxable_amount = subtotal - discount_amount
        invoice.subtotal = subtotal
        invoice.taxable_amount = taxable_amount
        
        # Get seller state from user
        seller_state = invoice.user.state or 'DELHI'
        
        # Calculate GST
        gst_result = TaxService.calculate_gst(
            taxable_amount=taxable_amount,
            seller_state=seller_state,
            buyer_state=invoice.client.state,
            gst_rate=Decimal('18')  # Standard rate
        )
        
        invoice.is_inter_state = gst_result['is_inter_state']
        invoice.cgst_amount = gst_result['cgst_amount']
        invoice.sgst_amount = gst_result['sgst_amount']
        invoice.igst_amount = gst_result['igst_amount']
        invoice.total_tax = gst_result['total_tax']
        
        # Calculate grand total
        invoice.total = taxable_amount + invoice.total_tax
        
        # Calculate TDS if applicable
        if invoice.tds_applicable and invoice.client.tds_applicable:
            tds_result = TaxService.calculate_tds(
                amount=invoice.total,
                tds_percent=invoice.tds_percent
            )
            invoice.tds_amount = tds_result['tds_amount']
        else:
            invoice.tds_amount = Decimal('0')
    
    @classmethod
    def get_overdue_invoices(cls, user: User) -> List[Invoice]:
        """
        Get all overdue invoices for a user.
        
        Args:
            user: User to check
            
        Returns:
            List of overdue invoices
        """
        today = timezone.now().date()
        return Invoice.objects.filter(
            user=user,
            due_date__lt=today,
            status__in=[Invoice.Status.SENT, Invoice.Status.OVERDUE]
        ).select_related('client')
    
    @classmethod
    def check_overdue_and_update(cls, user: User) -> int:
        """
        Check for overdue invoices and update their status.
        
        Args:
            user: User whose invoices to check
            
        Returns:
            Number of invoices marked as overdue
        """
        today = timezone.now().date()
        overdue_invoices = Invoice.objects.filter(
            user=user,
            due_date__lt=today,
            status=Invoice.Status.SENT
        )
        
        count = overdue_invoices.update(status=Invoice.Status.OVERDUE)
        
        if count > 0:
            logger.info(f"Marked {count} invoices as overdue for user {user.id}")
        
        return count
    
    @classmethod
    def duplicate_invoice(cls, invoice: Invoice) -> Invoice:
        """
        Create a duplicate of an existing invoice with a new number.
        
        Args:
            invoice: Invoice to duplicate
            
        Returns:
            New duplicated invoice
        """
        line_items = []
        for item in invoice.line_items.all():
            line_items.append({
                'description': item.description,
                'hsn_sac': item.hsn_sac,
                'quantity': float(item.quantity),
                'rate': float(item.rate),
                'discount_percent': float(item.discount_percent),
                'tax_percent': float(item.tax_percent)
            })
        
        return cls.create_invoice(
            user=invoice.user,
            client=invoice.client,
            line_items=line_items,
            issue_date=timezone.now().date(),
            due_date=timezone.now().date() + timedelta(days=invoice.client.payment_terms),
            discount_percent=invoice.discount_percent,
            notes=invoice.notes,
            terms=invoice.terms,
            tds_applicable=invoice.tds_applicable,
            tds_percent=invoice.tds_percent,
            tds_section=invoice.tds_section
        )
