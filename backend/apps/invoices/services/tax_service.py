"""
Tax Service for InvoiceIN
Handles all GST-related calculations with CGST/SGST vs IGST intelligence
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Tuple, Optional

logger = logging.getLogger(__name__)


class TaxCalculationError(Exception):
    """Custom exception for tax calculation errors"""
    pass


class TaxService:
    """
    Service layer for GST tax calculations.
    Implements intelligent GST detection based on inter-state vs intra-state supply.
    """
    
    # Standard GST rates
    GST_RATES = {
        0: 'exempt',
        5: '5%',
        12: '12%',
        18: '18%',
        28: '28%',
    }
    
    # HSN/SAC codes for common services
    HSN_SAC_MAPPING = {
        'software': '9984',
        'consulting': '9982',
        'professional': '9982',
        'training': '9992',
        'rental': '9973',
        'transport': '9964',
    }
    
    # Indian states for GST
    UNION_TERRITORIES = [
        'ANDAMAN AND NICOBAR ISLANDS',
        'CHANDIGARH',
        'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
        'DELHI',
        'JAMMU AND KASHMIR',
        'LADAKH',
        'LAKSHADWEEP',
    ]
    
    @classmethod
    def is_union_territory(cls, state: str) -> bool:
        """Check if the state is a Union Territory"""
        return state.upper() in cls.UNION_TERRITORIES
    
    @classmethod
    def is_inter_state(cls, seller_state: str, buyer_state: str) -> bool:
        """
        Determine if the transaction is inter-state.
        
        Args:
            seller_state: Seller's state
            buyer_state: Buyer's state
            
        Returns:
            True if inter-state, False if intra-state
        """
        seller_state = seller_state.upper().strip()
        buyer_state = buyer_state.upper().strip()
        
        if seller_state != buyer_state:
            return True
        
        # Check for Union Territories with different codes
        seller_is_ut = cls.is_union_territory(seller_state)
        buyer_is_ut = cls.is_union_territory(buyer_state)
        
        if seller_is_ut and buyer_is_ut:
            # Both are UTs but different ones
            return seller_state != buyer_state
        
        return False
    
    @classmethod
    def calculate_gst(
        cls,
        taxable_amount: Decimal,
        seller_state: str,
        buyer_state: str,
        gst_rate: Decimal = Decimal('18')
    ) -> Dict[str, Decimal]:
        """
        Calculate GST amounts based on inter-state or intra-state supply.
        
        Args:
            taxable_amount: The taxable value
            seller_state: Seller's state
            buyer_state: Buyer's state
            gst_rate: GST rate percentage (default 18%)
            
        Returns:
            Dictionary with cgst_amount, sgst_amount, igst_amount, total_tax
        """
        if taxable_amount < 0:
            raise TaxCalculationError("Taxable amount cannot be negative")
        
        if gst_rate < 0 or gst_rate > 100:
            raise TaxCalculationError("GST rate must be between 0 and 100")
        
        is_inter = cls.is_inter_state(seller_state, buyer_state)
        
        result = {
            'is_inter_state': is_inter,
            'gst_rate': gst_rate,
            'cgst_amount': Decimal('0'),
            'sgst_amount': Decimal('0'),
            'igst_amount': Decimal('0'),
            'total_tax': Decimal('0'),
        }
        
        if is_inter:
            # Inter-state: Apply IGST
            igst = (taxable_amount * gst_rate / Decimal('100')).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            result['igst_amount'] = igst
            result['total_tax'] = igst
            logger.info(f"Inter-state GST calculated: IGST = {igst}")
        else:
            # Intra-state: Apply CGST + SGST (50% each)
            half_rate = gst_rate / Decimal('2')
            cgst = (taxable_amount * half_rate / Decimal('100')).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            sgst = cgst  # SGST equals CGST
            result['cgst_amount'] = cgst
            result['sgst_amount'] = sgst
            result['total_tax'] = cgst + sgst
            logger.info(f"Intra-state GST calculated: CGST = {cgst}, SGST = {sgst}")
        
        return result
    
    @classmethod
    def calculate_tds(
        cls,
        amount: Decimal,
        tds_percent: Decimal,
        is_resident: bool = True
    ) -> Dict[str, Decimal]:
        """
        Calculate TDS (Tax Deducted at Source).
        
        Args:
            amount: The amount subject to TDS
            tds_percent: TDS percentage
            is_resident: Whether the payee is a resident
            
        Returns:
            Dictionary with tds_amount
        """
        if amount < 0:
            raise TaxCalculationError("Amount cannot be negative for TDS calculation")
        
        if tds_percent < 0 or tds_percent > 100:
            raise TaxCalculationError("TDS rate must be between 0 and 100")
        
        tds_amount = (amount * tds_percent / Decimal('100')).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        return {
            'tds_amount': tds_amount,
            'tds_percent': tds_percent,
            'is_resident': is_resident,
        }
    
    @classmethod
    def calculate_line_item_totals(
        cls,
        quantity: Decimal,
        rate: Decimal,
        discount_percent: Decimal = Decimal('0'),
        tax_percent: Decimal = Decimal('18')
    ) -> Dict[str, Decimal]:
        """
        Calculate line item totals including discounts and tax.
        
        Args:
            quantity: Item quantity
            rate: Unit rate
            discount_percent: Discount percentage (0-100)
            tax_percent: Tax rate percentage
            
        Returns:
            Dictionary with subtotal, discount_amount, taxable_amount, tax_amount, total
        """
        if quantity < 0:
            raise TaxCalculationError("Quantity cannot be negative")
        
        if rate < 0:
            raise TaxCalculationError("Rate cannot be negative")
        
        # Calculate base amount
        base_amount = quantity * rate
        
        # Calculate discount
        discount_amount = (base_amount * discount_percent / Decimal('100')).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # Calculate taxable amount (after discount)
        taxable_amount = base_amount - discount_amount
        
        # Calculate tax
        tax_amount = (taxable_amount * tax_percent / Decimal('100')).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # Calculate total
        total = taxable_amount + tax_amount
        
        return {
            'base_amount': base_amount.quantize(Decimal('0.01')),
            'discount_percent': discount_percent,
            'discount_amount': discount_amount,
            'taxable_amount': taxable_amount,
            'tax_percent': tax_percent,
            'tax_amount': tax_amount,
            'total': total,
        }
    
    @classmethod
    def round_currency(cls, amount: Decimal) -> Decimal:
        """
        Round amount to 2 decimal places for currency.
        
        Args:
            amount: Amount to round
            
        Returns:
            Rounded amount
        """
        return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    @classmethod
    def validate_gstin(cls, gstin: str) -> Tuple[bool, Optional[str]]:
        """
        Validate GSTIN format.
        
        Args:
            gstin: GSTIN to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not gstin:
            return True, None  # GSTIN is optional for some businesses
        
        gstin = gstin.upper()
        
        # Length check
        if len(gstin) != 15:
            return False, "GSTIN must be 15 characters"
        
        # Pattern check (15 characters: 2 digits + 10 chars + 1 char + 1 char + 1 char + 3 chars)
        import re
        pattern = r'^[0-9]{2}[A-Z]{10}[0-9]{1}[Z]{1}[0-9]{1}$'
        if not re.match(pattern, gstin):
            return False, "Invalid GSTIN format"
        
        return True, None
    
    @classmethod
    def get_hsn_sac_code(cls, description: str) -> str:
        """
        Suggest HSN/SAC code based on item description.
        
        Args:
            description: Item or service description
            
        Returns:
            Suggested HSN/SAC code
        """
        description_lower = description.lower()
        
        for key, code in cls.HSN_SAC_MAPPING.items():
            if key in description_lower:
                return code
        
        return '9999'  # General category
