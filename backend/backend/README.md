# InvoiceIN Backend - Production Deployment Guide

## Quick Start

### Prerequisites
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+
- Python 3.12+ (for local development)

## Environment Setup

### 1. Clone and Configure

```bash
# Clone repository
git clone <repository-url>
cd invoicein-backend

# Copy environment files
cp .env.example .env
cp .env.production .env  # For production
```

### 2. Update Environment Variables

Edit `.env` with your actual credentials:

```env
# Generate a strong secret key
DJANGO_SECRET_KEY=your-generated-secret-key

# Database credentials
DB_USER=your_db_user
DB_PASSWORD=your_strong_password

# Razorpay credentials
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_secret

# Other API keys as needed
```

## Docker Deployment (Recommended for Production)

### Build and Start

```bash
# Build and start all services
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f app

# Check health
curl http://localhost/health/
```

### Stop Services

```bash
docker-compose down
```

## Manual Deployment (Alternative)

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Database Setup

```bash
# Create PostgreSQL database
psql -U postgres -c "CREATE DATABASE invoicein_db;"
psql -U postgres -c "CREATE USER invoicein_user WITH PASSWORD 'password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE invoicein_db TO invoicein_user;"
```

### 3. Run Migrations

```bash
python manage.py migrate
python manage.py createsuperuser
```

### 4. Start Server

```bash
# Development
python manage.py runserver 0.0.0.0:8000

# Production (with Gunicorn)
gunicorn invoicein.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --threads 2 \
    --timeout 120
```

## API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login and get tokens
- `POST /api/auth/refresh/` - Refresh access token
- `GET /api/auth/profile/` - Get user profile

### Invoices
- `GET /api/invoices/` - List invoices
- `POST /api/invoices/` - Create invoice
- `GET /api/invoices/{id}/` - Get invoice detail
- `PUT /api/invoices/{id}/` - Update invoice
- `DELETE /api/invoices/{id}/` - Delete invoice
- `POST /api/invoices/{id}/send/` - Send invoice
- `POST /api/invoices/{id}/mark-paid/` - Mark as paid

### Clients
- `GET /api/clients/` - List clients
- `POST /api/clients/` - Create client
- `GET /api/clients/{id}/` - Get client detail
- `PUT /api/clients/{id}/` - Update client
- `GET /api/clients/{id}/invoices/` - Client's invoices

### Expenses
- `GET /api/expenses/` - List expenses
- `POST /api/expenses/` - Create expense
- `GET /api/expenses/summary/` - Expense summary
- `GET /api/expenses/itc_report/` - ITC report

### Reports
- `GET /api/reports/dashboard/` - Dashboard data
- `GET /api/reports/revenue/` - Revenue report
- `GET /api/reports/gstr1/` - GSTR-1 report
- `GET /api/reports/gstr3b/` - GSTR-3B report
- `GET /api/reports/tds/` - TDS report
- `GET /api/reports/itr/` - ITR summary
- `GET /api/reports/profit-loss/` - Profit & Loss

### Payments
- `GET /api/payments/` - List payments
- `POST /api/payments/` - Create payment
- `POST /api/payments/create_payment_link/` - Create Razorpay link
- `POST /api/payments/process_webhook/` - Process webhook

## Health Check

```bash
curl http://localhost:8000/health/
```

Response:
```json
{
    "status": "healthy",
    "service": "InvoiceIN API",
    "version": "1.0.0"
}
```

## Troubleshooting

### Database Issues
```bash
# Check database connection
python manage.py dbshell

# Reset migrations
python manage.py migrate --fake zero
python manage.py migrate
```

### Clear Cache
```bash
# Clear Redis cache
redis-cli FLUSHALL

# Or restart container
docker-compose restart app
```

### View Logs
```bash
# Docker logs
docker-compose logs -f app

# Application logs
tail -f logs/invoicein.log
```

## SSL/HTTPS Setup

For production HTTPS, configure nginx with SSL certificates:

1. Obtain SSL certificate (Let's Encrypt recommended)
2. Update `nginx.conf` with SSL configuration
3. Enable HTTPS redirect in nginx

## Backup

### Database Backup
```bash
pg_dump -U invoicein_user invoicein_db > backup.sql
```

### Restore
```bash
psql -U invoicein_user invoicein_db < backup.sql
```

## Security Checklist

- [ ] Update `DJANGO_SECRET_KEY` to a strong random value
- [ ] Set `DEBUG=False` in production
- [ ] Configure `ALLOWED_HOSTS` with your domain
- [ ] Use HTTPS (SSL/TLS)
- [ ] Set strong database passwords
- [ ] Enable CSRF protection
- [ ] Configure Redis authentication
- [ ] Regular security updates