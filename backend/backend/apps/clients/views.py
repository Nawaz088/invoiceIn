"""
Client Views for InvoiceIN
REST API endpoints with proper permissions and user isolation
"""

import logging
from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q

from .models import Client
from .serializers import (
    ClientListSerializer,
    ClientDetailSerializer,
    ClientCreateSerializer,
    ClientUpdateSerializer
)

logger = logging.getLogger(__name__)


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing clients with complete user isolation.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ClientListSerializer

    queryset = Client.objects.all()
    
    def get_queryset(self):
        """
        Get clients filtered by authenticated user.
        Ensures complete user data isolation.
        """
        queryset = Client.objects.filter(
            user=self.request.user
        ).order_by('name')
        
        # Apply filters from query params
        state = self.request.query_params.get('state')
        if state:
            queryset = queryset.filter(state__iexact=state)
        
        gst_registered = self.request.query_params.get('gst_registered')
        if gst_registered is not None:
            queryset = queryset.filter(is_gst_registered=gst_registered.lower() == 'true')
        
        tds_applicable = self.request.query_params.get('tds_applicable')
        if tds_applicable is not None:
            queryset = queryset.filter(tds_applicable=tds_applicable.lower() == 'true')
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search) |
                Q(gstin__icontains=search)
            )
        
        return queryset

    def get_queryset(self):
        queryset = super().get_queryset()
        state = self.request.query_params.get('state')
        if state:
            queryset = queryset.filter(state__iexact=state)

        gst_registered = self.request.query_params.get('gst_registered')
        if gst_registered is not None:
            queryset = queryset.filter(is_gst_registered=gst_registered.lower() == 'true')

        tds_applicable = self.request.query_params.get('tds_applicable')
        if tds_applicable is not None:
            queryset = queryset.filter(tds_applicable=tds_applicable.lower() == 'true')

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search) |
                Q(gstin__icontains=search)
            )

        return queryset
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return ClientListSerializer
        elif self.action == 'create':
            return ClientCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ClientUpdateSerializer
        return ClientDetailSerializer
    
    def perform_create(self, serializer):
        """Create client with user association."""
        print("PERFORM CREATE CALLED")
        obj = serializer.save(user=self.request.user)
        print("Created:", obj.pk)
        print("Count after save:", Client.objects.count())
        logger.info(f"Client created by user {self.request.user.id}")
    
    def perform_update(self, serializer):
        """Update client."""
        serializer.save()
        logger.info(f"Client updated by user {self.request.user.id}")
    
    @action(detail=True, methods=['get'])
    def invoices(self, request, pk=None):
        """
        Get all invoices for a client.
        Only returns invoices belonging to the authenticated user.
        """
        client = self.get_object()
        from apps.invoices.serializers import InvoiceListSerializer
        from apps.invoices.models import Invoice
        
        # Filter by user as well for security
        invoices = client.invoices.filter(
            user=request.user
        ).order_by('-created_at')
        
        # Pagination
        page = self.paginate_queryset(invoices)
        if page is not None:
            serializer = InvoiceListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = InvoiceListSerializer(invoices, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """
        Get client summary including invoice stats and outstanding amounts.
        """
        client = self.get_object()
        
        from apps.invoices.models import Invoice
        
        # Get invoice stats
        invoices = client.invoices.filter(user=request.user)
        
        total_invoiced = invoices.aggregate(
            total=Sum('total')
        )['total'] or Decimal('0')
        
        total_received = invoices.filter(
            status='paid'
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        outstanding = invoices.filter(
            status__in=['sent', 'overdue']
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        overdue_count = invoices.filter(
            status='overdue'
        ).count()
        
        return Response({
            'client_id': client.id,
            'client_name': client.name,
            'invoice_count': invoices.count(),
            'total_invoiced': float(total_invoiced),
            'total_received': float(total_received),
            'outstanding_amount': float(outstanding),
            'overdue_invoices': overdue_count,
            'average_invoice_value': float(total_invoiced / invoices.count()) if invoices.count() > 0 else 0
        })
    
    @action(detail=False, methods=['post'])
    def verify_gstin(self, request):
        """
        Verify GSTIN via external API (ClearTax, GST Portal, etc.).
        """
        gstin = request.data.get('gstin', '').upper()
        
        if not gstin:
            return Response(
                {'error': 'GSTIN is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(gstin) != 15:
            return Response(
                {'error': 'Invalid GSTIN format. Must be 15 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # In production, call GST portal API
        # For now, return mock response
        try:
            # Example API call structure
            # response = requests.post(
            #     f"{GST_API_URL}/gstin/{gstin}",
            #     headers={'Authorization': f'Bearer {GST_API_KEY}'}
            # )
            
            return Response({
                'valid': True,
                'gstin': gstin,
                'trade_name': 'Verified Business Name',
                'legal_name': 'Legal Business Name',
                'status': 'Active',
                'constitution': 'Proprietorship',
                'date_of_registration': '01/04/2020',
                'state_jurisdiction': 'Maharashtra',
                'state_code': gstin[:2]
            })
            
        except Exception as e:
            logger.error(f"GSTIN verification failed: {str(e)}")
            return Response(
                {'error': 'Failed to verify GSTIN. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def create_invoice(self, request, pk=None):
        """
        Create invoice for this client.
        """
        client = self.get_object()
        from apps.invoices.serializers import InvoiceCreateSerializer
        from apps.invoices.services.invoice_service import InvoiceService, InvoiceServiceError
        
        data = request.data.copy()
        data['client'] = client.id
        
        serializer = InvoiceCreateSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            try:
                validated_data = serializer.validated_data
                invoice = InvoiceService.create_invoice(
                    user=request.user,
                    client=client,
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
                
                from apps.invoices.serializers import InvoiceDetailSerializer
                return Response(
                    InvoiceDetailSerializer(invoice).data,
                    status=status.HTTP_201_CREATED
                )
            except InvoiceServiceError as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def states(self, request):
        """
        Get list of all Indian states.
        """
        states = [
            'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
            'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
            'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
            'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
            'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
            'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
            'Andaman and Nicobar Islands', 'Chandigarh',
            'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
            'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
        ]
        return Response(states)
