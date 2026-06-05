from django.urls import path
from .views import (
    DashboardReportView,
    RevenueReportView,
    GSTR1ReportView,
    GSTR3BReportView,
    TDSReportView,
    ITRSummaryView,
    ProfitLossReportView
)

urlpatterns = [
    path('dashboard/', DashboardReportView.as_view(), name='dashboard'),
    path('revenue/', RevenueReportView.as_view(), name='revenue'),
    path('gstr1/', GSTR1ReportView.as_view(), name='gstr1'),
    path('gstr3b/', GSTR3BReportView.as_view(), name='gstr3b'),
    path('tds/', TDSReportView.as_view(), name='tds'),
    path('itr/', ITRSummaryView.as_view(), name='itr'),
    path('profit-loss/', ProfitLossReportView.as_view(), name='profit-loss'),
]
