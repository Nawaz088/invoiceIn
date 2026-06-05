# InvoiceIN

> A modern GST-compliant invoicing and business management platform built for freelancers, startups, agencies, and small businesses.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB)
![Django](https://img.shields.io/badge/Backend-Django%20REST%20Framework-092E20)
![Python](https://img.shields.io/badge/Python-3.12+-3776AB)

---

## ✨ Overview

InvoiceIN is a full-stack invoicing application designed to simplify the process of creating, managing, and tracking invoices while remaining compliant with Indian GST regulations.

The platform provides an intuitive dashboard for managing:

* 👥 Clients
* 📄 Invoices
* 💰 Expenses
* 📊 Financial Reports
* 📑 PDF Invoice Generation
* 🔐 User Authentication
* 🏢 Business Profiles

Built with a modern React frontend and Django REST backend, InvoiceIN follows a clean service-layer architecture for maintainability and scalability.

---

## 🚀 Features

### Client Management

* Create and manage clients
* GSTIN and PAN validation
* Indian state validation
* Contact and address management
* Client invoice history

### Invoice Management

* Draft invoices
* Send invoices
* Mark invoices as paid
* Invoice duplication
* Automatic invoice numbering
* GST and TDS calculations
* PDF invoice generation
* Activity tracking and audit logs

### Expense Tracking

* Categorized expenses
* GST expense tracking
* Multiple payment methods
* Vendor management

### Dashboard

* Monthly revenue overview
* Outstanding payments
* Overdue invoice tracking
* GST liability summary
* Business analytics

### Authentication

* JWT Authentication
* User-specific data isolation
* Secure API endpoints

---

## 🏗️ Tech Stack

### Frontend

* React
* Vite
* React Router
* Context API
* Tailwind CSS
* Lucide Icons

### Backend

* Python 3.12+
* Django
* Django REST Framework
* JWT Authentication
* SQLite (Development)
* PostgreSQL (Production Ready)

---

## 📂 Project Structure

```text
InvoiceIN/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── apps/
│   │   ├── users/
│   │   ├── clients/
│   │   ├── invoices/
│   │   ├── expenses/
│   │   ├── payments/
│   │   └── reports/
│   │
│   ├── backend/
│   ├── manage.py
│   └── requirements.txt
│
└── README.md
```

---

## ⚙️ Installation

### Clone the repository

```bash
git clone https://github.com/yourusername/invoicein.git

cd invoicein
```

---

### Backend Setup

```bash
cd backend/backend

python -m venv venv

source venv/bin/activate      # Linux / macOS

venv\Scripts\activate         # Windows

pip install -r requirements.txt

python manage.py migrate

python manage.py createsuperuser

python manage.py runserver
```

Backend runs on:

```
http://localhost:8000
```

---

### Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend runs on:

```
http://localhost:5173
```

---

## 🔑 Environment Variables

### Backend (.env)

```env
SECRET_KEY=your-secret-key

DEBUG=True

ALLOWED_HOSTS=localhost,127.0.0.1

DATABASE_URL=sqlite:///db.sqlite3
```

### Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## 📡 API Endpoints

### Authentication

```
POST   /api/auth/register/
POST   /api/auth/login/
POST   /api/auth/refresh/
```

### Clients

```
GET    /api/clients/
POST   /api/clients/
GET    /api/clients/{id}/
PATCH  /api/clients/{id}/
DELETE /api/clients/{id}/
```

### Invoices

```
GET    /api/invoices/
POST   /api/invoices/
GET    /api/invoices/{id}/
PATCH  /api/invoices/{id}/
DELETE /api/invoices/{id}/

POST   /api/invoices/{id}/send/
POST   /api/invoices/{id}/mark_paid/
POST   /api/invoices/{id}/duplicate/
GET    /api/invoices/{id}/pdf/
```

### Expenses

```
GET    /api/expenses/
POST   /api/expenses/
PATCH  /api/expenses/{id}/
DELETE /api/expenses/{id}/
```

---

## 🔒 Security

* JWT Authentication
* User-level data isolation
* Protected API routes
* Input validation
* GST/PAN format validation
* Service-layer architecture

---

## 📈 Future Roadmap

* Email invoice delivery
* WhatsApp integration
* Stripe / Razorpay payments
* Recurring invoices
* Multi-company support
* Inventory management
* Customer portal
* Docker deployment
* PostgreSQL production setup
* Multi-currency support

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome.

Feel free to fork the repository and submit a pull request.

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Abdul Muqeet Munshi**

Mechanical Engineer • Full Stack Developer • React & Django Enthusiast

GitHub: https://github.com/yourusername

---

> Built with ❤️ to simplify invoicing for modern businesses.
