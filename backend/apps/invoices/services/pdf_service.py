"""
PDF Generation Service for InvoiceIN
Generates professional invoice PDFs with GST compliance
"""

import logging
import io
from decimal import Decimal
from typing import Optional
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)


class PDFGenerationError(Exception):
    """Custom exception for PDF generation errors"""
    pass


class PDFService:
    """
    Service layer for generating invoice PDFs.
    Supports WeasyPrint and ReportLab backends.
    """
    
    @classmethod
    def generate_invoice_pdf(cls, invoice, output_format: str = 'html') -> bytes:
        """
        Generate a PDF for an invoice.
        
        Args:
            invoice: Invoice instance to generate PDF for
            output_format: 'pdf' for binary PDF, 'html' for HTML (for preview)
            
        Returns:
            PDF bytes or HTML string
        """
        logger.info(f"Generating PDF for invoice {invoice.invoice_number}")
        
        try:
            # Prepare context for template
            context = cls._prepare_invoice_context(invoice)
            
            if output_format == 'html':
                return cls._render_html(context)
            else:
                return cls._render_pdf(context)
                
        except Exception as e:
            logger.error(f"PDF generation failed for {invoice.invoice_number}: {str(e)}")
            raise PDFGenerationError(f"Failed to generate PDF: {str(e)}")
    
    @classmethod
    def _prepare_invoice_context(cls, invoice) -> dict:
        """Prepare context dictionary for invoice PDF template."""
        
        # Get user and client details
        user = invoice.user
        client = invoice.client
        
        # Format amounts
        def format_currency(amount):
            if isinstance(amount, Decimal):
                return f"₹{amount:,.2f}"
            return f"₹{float(amount):,.2f}"
        
        # Build line items list
        line_items = []
        for item in invoice.line_items.all().order_by('order'):
            line_items.append({
                'description': item.description,
                'hsn_sac': item.hsn_sac,
                'quantity': float(item.quantity),
                'rate': format_currency(item.rate),
                'discount_percent': float(item.discount_percent),
                'discount_amount': format_currency(item.discount_amount),
                'tax_amount': format_currency(item.tax_amount),
                'total': format_currency(item.total),
            })
        
        context = {
            'invoice': invoice,
            'invoice_number': invoice.invoice_number,
            'issue_date': invoice.issue_date.strftime('%d/%m/%Y'),
            'due_date': invoice.due_date.strftime('%d/%m/%Y'),
            'paid_date': invoice.paid_at.strftime('%d/%m/%Y') if invoice.paid_at else None,
            
            # Seller (User) Details
            'seller': {
                'name': user.business_name or user.get_full_name(),
                'address': getattr(user, 'address', ''),
                'city': getattr(user, 'city', ''),
                'state': user.state,
                'pincode': getattr(user, 'pincode', ''),
                'gstin': user.gstin,
                'pan': user.pan,
                'email': user.email,
                'phone': user.phone,
            },
            
            # Buyer (Client) Details
            'buyer': {
                'name': client.name,
                'address': client.address,
                'city': client.city,
                'state': client.state,
                'pincode': client.pincode,
                'gstin': client.gstin,
                'pan': client.pan,
                'email': client.email,
                'phone': client.phone,
            },
            
            # Financial Summary
            'subtotal': format_currency(invoice.subtotal),
            'discount_percent': float(invoice.discount_percent),
            'discount_amount': format_currency(invoice.discount_amount),
            'taxable_amount': format_currency(invoice.taxable_amount),
            
            # Tax Breakdown
            'is_inter_state': invoice.is_inter_state,
            'cgst_amount': format_currency(invoice.cgst_amount),
            'sgst_amount': format_currency(invoice.sgst_amount),
            'igst_amount': format_currency(invoice.igst_amount),
            'total_tax': format_currency(invoice.total_tax),
            
            # TDS
            'tds_applicable': invoice.tds_applicable,
            'tds_percent': float(invoice.tds_percent) if invoice.tds_percent else 0,
            'tds_amount': format_currency(invoice.tds_amount),
            'tds_section': invoice.tds_section,
            
            # Grand Total
            'total': format_currency(invoice.total),
            'amount_in_words': cls._number_to_words(float(invoice.total)),
            
            # Status
            'status': invoice.get_status_display(),
            
            # Notes and Terms
            'notes': invoice.notes,
            'terms': invoice.terms,
            
            # Line Items
            'line_items': line_items,
            
            # QR Code / IRN
            'irn': invoice.irn,
            'place_of_supply': invoice.place_of_supply,
            
            # Generation Info
            'generated_at': timezone.now().strftime('%d/%m/%Y %H:%M'),
            
            # Company Branding
            'brand_color': getattr(user, 'brand_color', '#E07A29'),
            'logo_url': cls._get_logo_url(user),
        }
        
        return context
    
    @classmethod
    def _render_html(cls, context: dict) -> str:
        """Render invoice as HTML for preview."""
        # Use a simple template-based approach
        # In production, use proper Django templates
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice {context['invoice_number']}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 14px;
            color: #333;
            margin: 0;
            padding: 0;
        }}
        .invoice-header {{ display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid {context['brand_color']}; padding-bottom: 20px; }}
        .company-info h1 {{ color: {context['brand_color']}; font-size: 28px; }}
        .invoice-title {{ font-size: 36px; color: #333; font-weight: bold; }}
        .invoice-meta {{ text-align: right; }}
        .invoice-meta p {{ margin: 5px 0; }}
        .addresses {{ display: flex; gap: 40px; margin-bottom: 30px; }}
        .address-box {{ flex: 1; }}
        .address-box h3 {{ color: {context['brand_color']}; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }}
        .address-box p {{ margin: 3px 0; }}
        table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; }}
        th {{ background: {context['brand_color']}; color: white; padding: 12px; text-align: left; }}
        td {{ padding: 12px; border-bottom: 1px solid #eee; }}
        .text-right {{ text-align: right; }}
        .totals {{ width: 300px; margin-left: auto; }}
        .totals-row {{
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #eee;
    flex-wrap: wrap;
}}

.totals-row span:last-child {{
    max-width: 180px;
    text-align: right;
    word-break: break-word;
}}
        .notes {{ margin-top: 40px; padding: 20px; background: #f9f9f9; border-radius: 8px; }}
        .notes h4 {{ color: {context['brand_color']}; margin-bottom: 10px; }}
        .footer {{ margin-top: 40px; text-align: center; color: #888; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="invoice-header">
        <div class="company-info">
            <h1>{context['seller']['name']}</h1>
            <p>{context['seller']['address']}</p>
            <p>{context['seller']['city']}, {context['seller']['state']} - {context['seller']['pincode']}</p>
            <p>GSTIN: {context['seller']['gstin']}</p>
            <p>PAN: {context['seller']['pan']}</p>
        </div>
        <div class="invoice-meta">
            <h2 class="invoice-title">INVOICE</h2>
            <p><strong>Invoice No:</strong> {context['invoice_number']}</p>
            <p><strong>Date:</strong> {context['issue_date']}</p>
            <p><strong>Due Date:</strong> {context['due_date']}</p>
            <p><strong>Status:</strong> {context['status']}</p>
        </div>
    </div>
    
    <div class="addresses">
        <div class="address-box">
            <h3>Billed To</h3>
            <p><strong>{context['buyer']['name']}</strong></p>
            <p>{context['buyer']['address']}</p>
            <p>{context['buyer']['city']}, {context['buyer']['state']} - {context['buyer']['pincode']}</p>
            <p>GSTIN: {context['buyer']['gstin']}</p>
        </div>
        <div class="address-box">
            <h3>Place of Supply</h3>
            <p>{context['place_of_supply']}</p>
            <p style="margin-top: 20px;"><strong>Payment Terms:</strong> {context['invoice'].client.payment_terms} days</p>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Description</th>
                <th>HSN/SAC</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Discount</th>
                <th class="text-right">Tax</th>
                <th class="text-right">Amount</th>
            </tr>
        </thead>
        <tbody>
            {"".join(f"""
            <tr>
                <td>{idx + 1}</td>
                <td>{item['description']}</td>
                <td>{item['hsn_sac']}</td>
                <td class="text-right">{item['quantity']}</td>
                <td class="text-right">{item['rate']}</td>
                <td class="text-right">{item['discount_amount']}</td>
                <td class="text-right">{item['tax_amount']}</td>
                <td class="text-right">{item['total']}</td>
            </tr>
            """ for idx, item in enumerate(context['line_items']))}
        </tbody>
    </table>
    
    <div class="totals">
        <div class="totals-row">
            <span>Subtotal</span>
            <span>{context['subtotal']}</span>
        </div>
        <div class="totals-row">
            <span>Discount ({context['discount_percent']}%)</span>
            <span>-{context['discount_amount']}</span>
        </div>
        <div class="totals-row">
            <span>Taxable Value</span>
            <span>{context['taxable_amount']}</span>
        </div>
        {"<div class='totals-row'><span>CGST</span><span>" + context['cgst_amount'] + "</span></div>" if float(context['invoice'].cgst_amount or 0) > 0 else ""}
        {"<div class='totals-row'><span>SGST</span><span>" + context['sgst_amount'] + "</span></div>" if float(context['invoice'].sgst_amount or 0) > 0 else ""}
        {"<div class='totals-row'><span>IGST</span><span>" + context['igst_amount'] + "</span></div>" if float(context['invoice'].igst_amount or 0) > 0 else ""}
        {"<div class='totals-row'><span>TDS ({context['tds_section'] or 'N/A'})</span><span>-{context['tds_amount']}</span></div>" if context['tds_applicable'] else ""}
        <div class="totals-row total">
            <span>Total</span>
            <span>{context['total']}</span>
        </div>
        <div class="totals-row" style="font-style: italic; color: #666;">
            <span>Amount in Words</span>
            <span>{context['amount_in_words']}</span>
        </div>
    </div>
    
    {"<div class='notes'><h4>Notes</h4><p>" + context['notes'] + "</p></div>" if context['notes'] else ""}
    {"<div class='notes'><h4>Terms & Conditions</h4><p>" + context['terms'] + "</p></div>" if context['terms'] else ""}
    
    <div class="footer">
        {"<p>IRN: " + context['irn'] + "</p>" if context['irn'] else ""}
        <p>Generated on {context['generated_at']}</p>
        <p>Thank you for your business!</p>
    </div>
</body>
</html>
        """
        return html
    
    @classmethod
    def _render_pdf(cls, context: dict) -> bytes:
        """
        Render invoice as PDF using WeasyPrint.
        
        Args:
            context: Invoice context dictionary
            
        Returns:
            PDF bytes
        """
        # For production, use WeasyPrint
        try:
            from weasyprint import HTML, CSS
            
            html_content = cls._render_html(context)
            
            # Custom CSS for print
            print_css = CSS(string="""
                @page {
                    size: A4;
                    margin: 15mm;
                }

                html, body {
                    margin: 0;
                    padding: 0;
                }

                .footer {
                    margin-top: 20px;
                }
            """)
            
            html = HTML(string=html_content)
            pdf_buffer = io.BytesIO()
            html.write_pdf(pdf_buffer, stylesheets=[print_css])
            pdf_buffer.seek(0)
            
            return pdf_buffer.getvalue()
            
        except ImportError:
            logger.warning("WeasyPrint not installed, falling back to HTML")
            # Fallback to HTML if WeasyPrint not available
            raise PDFGenerationError(
                "PDF generation requires WeasyPrint. Install with: pip install weasyprint"
            )
    
    @classmethod
    def _get_logo_url(cls, user) -> Optional[str]:
        """Get the logo URL for a user."""
        if user.logo:
            return user.logo.url
        return None
    
    @classmethod
    def _number_to_words(cls, num: float) -> str:
        """Convert number to Indian currency words."""
        if num == 0:
            return "Zero Rupees"
        
        num = int(num)
        if num < 0:
            return "Minus " + cls._convert_to_words(abs(num)) + " Rupees"
        
        ones = [
            "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
            "Seventeen", "Eighteen", "Nineteen"
        ]
        tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
        
        def convert_hundreds(n):
            if n < 20:
                return ones[n]
            elif n < 100:
                return tens[n // 10] + (" " + ones[n % 10] if n % 10 else "")
            else:
                return ones[n // 100] + " Hundred" + (" " + convert_hundreds(n % 100) if n % 100 else "")
        
        def convert_thousands(n):
            if n < 1000:
                return convert_hundreds(n)
            elif n < 100000:
                return convert_hundreds(n // 1000) + " Thousand" + (" " + convert_hundreds(n % 1000) if n % 1000 else "")
            elif n < 10000000:
                return convert_hundreds(n // 100000) + " Lakh" + (" " + convert_thousands(n % 100000) if n % 100000 else "")
            else:
                return convert_hundreds(n // 10000000) + " Crore" + (" " + convert_thousands(n % 10000000) if n % 10000000 else "")
        
        rupees = convert_thousands(num)
        return f"{rupees} Rupees"
