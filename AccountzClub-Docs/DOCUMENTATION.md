# Accountz Club: Enterprise-Grade Technical & User Documentary

## 1. Project Overview
### Purpose and Goals
**Accountz Club** is a state-of-the-art multi-vendor cryptocurrency marketplace. Its primary goal is to provide a highly secure, anonymous, and performant environment for the purchase of digital assets, specifically pre-loaded accounts with balances. The platform eliminates middle-man risk through integrated escrow systems and automated delivery mechanisms.

### Target Audience
*   **Buyers**: High-privacy individuals seeking streaming, gaming, or financial accounts.
*   **Vendors**: Professional digital asset sellers requiring automated inventory management.
*   **Administrators**: Platform owners managing disputes, security, and global site settings.

### Key Features and Functionality
*   **Dynamic Marketplace**: Real-time filtering, search, and adaptive grid/list/table views.

![Homepage Screenshot](https://raw.githubusercontent.com/MuhammadAdil-Developer/crypto-nexus/new-code/screenshots/account-catelog.webp)

*   **Native Crypto Integration**: Native support for Bitcoin (BTC) and Monero (XMR) with automated payment monitoring.
*   **Self-Custody Escrow**: Funds are locked in system-monitored escrow until buyer release or dispute resolution.
*   **Account Economy**: Visual balance badges (BAL: $) with localized tooltips for asset clarity.

![Product Card Screenshot](https://raw.githubusercontent.com/MuhammadAdil-Developer/crypto-nexus/new-code/screenshots/product-card.webp)
*   **Bulk Inventory System**: Vendor-side CSV/bulk upload for thousands of account credentials.
*   **Real-time Messaging**: WebSocket-powered chat with inline product/order context references.

### Scope of Work
*   **Included**: Full-stack application, payment listeners, vendor onboarding, admin dashboard, messaging engine, and responsive UI.
*   **Not Included**: Third-party account provisioning (credentials must be provided by vendors), legal licensing for third-party brand assets, and direct fiat-to-crypto exchange (must be handled externally).

---

## 2. Technical Architecture
### Technology Stack
*   **Programming Languages**: Python 3.11+.
*   **Backend Framework**: Django 4.2 LTS (Enterprise Python Framework).
*   **Frontend Framework**: React 18 (Vite-powered for speed).
*   **State Management & APIs**: Axios (HTTP), React Query (Data Fetching), React Hook Form (Validation).
*   **UI Libraries**: Tailwind CSS (Styling), Radix UI (Primitives), Shadcn UI (Components), Framer Motion (Animations).
*   **Messaging**: Django Channels (WebSockets) with Redis Pub/Sub.

### Hosting Environment Details
*   **Server Hardware**: Intel Core i7-6700 • 64GB RAM • 2x SSD M.2 NVMe 512 GB (Hetzner FSN).
*   **Operating System**: Linux (Ubuntu 22.04 LTS).
*   **Process Management**: PM2 (Process Manager 2) for Node.js and Python.
*   **Web Server**: Nginx (Reverse Proxy).
*   **Database**: PostgreSQL 15+ (Relational).
*   **Caching/Queue**: Redis 7.x (In-memory storage).

### Folder and File Structure Overview
*   `/client/src`: React application source (pages, components, hooks, services).
*   `/backend`: Django project (apps for orders, products, payments, users, messaging).
*   `/scripts`: Python/Shell automation for wallet monitoring and maintenance.
*   `/package.json`: Main entry for PM2 frontend management.

### Third-Party Services and Integrations
*   **Monero RPC**: Local or remote node connection for XMR validation.
*   **BTCPay / BTC RPC**: Transaction monitoring for Bitcoin payments.
*   **Analytics**: Integrated support for Google Analytics or Plausible.

---

## 3. Installation & Deployment
### System Requirements
*   **Hardware**: Intel Core i7-6700, 64GB RAM (Current Config).
*   **Software**: Node.js 20+, Python 3.11+, PostgreSQL 15+, PM2.

### Step-by-Step Installation Instructions
1.  **Setup Codebase**: Clone to the `/var/www/AccountzClub` directory.
2.  **Frontend Build**:
    ```bash
    cd client
    npm install
    npm run build
    ```
3.  **Backend Setup**:
    ```bash
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    python manage.py migrate
    python manage.py collectstatic
    ```

### Launch & Process Management (PM2)
The project is managed via **PM2** to ensure 100% uptime:
```bash
# Start Backend
pm2 start "python manage.py runserver 0.0.0.0:8000" --name "accountz-backend"

# Start Frontend (Node.js Prod Server)
pm2 start "node dist/index.js" --name "accountz-frontend"
```

### Environment Setup
*   **Production**: High-security config, `DEBUG=False`, SSL enforced via Nginx.

---

## 4. Configuration Details
### Environment Variables
*   `SECRET_KEY`: Critical security key for cryptography.
*   `VITE_API_BASE_URL`: Public endpoint for the API gateway.
*   `MONERO_RPC_URL`: Host for XMR payment validation.

### Database Configuration
Postgres is configured via `DATABASE_URL`. It uses connection pooling (via `django-environ`) to handle spikes in marketplace traffic.

### Domain and DNS Setup
*   **A Records**: Point your domain and `api.` subdomain to the server IP.
*   **SSL**: Automatically handled via Nginx-Certbot or Cloudflare.

### Email & CDN
*   SMTP settings are defined in `settings.py` for all outgoing system emails.
*   Caching is handled via Redis for product listings and user sessions to ensure <200ms page loads.

---

## 5. Content Management Guide (Admin Panel)

![Payment Modal Screenshot](https://raw.githubusercontent.com/MuhammadAdil-Developer/crypto-nexus/new-code/screenshots/payment-modal.webp)
### Admin Login
*   **URL**: `https://accountzclub.com/6f2c9b681c3b4cf9a8c4-admin-access-control-panel-login` (High-security path).
*   **Roles**: Superuser (Full control), Staff (Moderator), Payout Manager.

### Management Activities
*   **Add/Edit Listings**: Navigate to 'Products' to approve or hide vendor items.

![admin-product Screenshot](https://raw.githubusercontent.com/MuhammadAdil-Developer/crypto-nexus/new-code/screenshots/admin-product.webp)

*   **Handle Menus**: Navigation paths are managed in the `App.tsx` and sidebar components.
*   **Media Management**: Located in the 'Media' section; supports automated resizing and deletion.
*   **Messaging Management**: Access to chat logs for dispute resolution.

![chat-communication Screenshot](https://raw.githubusercontent.com/MuhammadAdil-Developer/crypto-nexus/new-code/screenshots/chat-communication.webp)

---

## 6. User Roles & Permissions
1.  **Super Admin**: Site branding, financial rates, user bans, logic overrides.
2.  **Moderator**: Dispute resolution, support ticket management, product approval.
3.  **Vendor**: Product listing, inventory tracking, payout requests, buyer messaging.

![Vendor Dashboard - Inventory management and Sales analytics](https://raw.githubusercontent.com/MuhammadAdil-Developer/crypto-nexus/new-code/screenshots/vendor-dashboard.webp)

![Vendor Dashboard - Inventory management and Sales analytics](https://raw.githubusercontent.com/MuhammadAdil-Developer/crypto-nexus/new-code/screenshots/vender-order.webp)

![Vendor Dashboard - Inventory management and Sales analytics](https://raw.githubusercontent.com/MuhammadAdil-Developer/crypto-nexus/new-code/screenshots/vender-analytics.webp)


4.  **Buyer**: Browsing, Cart/Purchase, Wishlist, Order tracking, Feedback.

![Buyer Dashboard - Overview of recent orders and wishlist](https://raw.githubusercontent.com/MuhammadAdil-Developer/crypto-nexus/new-code/screenshots/buyer-dashboard.webp)

![Buyer Dashboard - Overview of recent orders and wishlist](https://raw.githubusercontent.com/MuhammadAdil-Developer/crypto-nexus/new-code/screenshots/buyer-order.webp)

### Instructions for Managing Users
Admins can search users by username in the Admin Panel to reset passwords, change types (Buyer to Vendor), or apply bans.

![admin-user](https://raw.githubusercontent.com/MuhammadAdil-Developer/crypto-nexus/new-code/screenshots/admin-user.webp)
![admin-user-edit](https://raw.githubusercontent.com/MuhammadAdil-Developer/crypto-nexus/new-code/screenshots/admin-user-edit.webp)

---

## 7. Design & UI Documentation
### Style Guide
*   **Colors**: Primary `#0A0A0A`, Accent-Cyan `#22D3EE`, Accent-Red `#EF4444`.
*   **Typography**: `Inter` for data, `Orbitron` for futuristic headings.
*   **Spacing**: Standardized 4px grid (Tailwind spacing scale).

### Browser and Device Compatibility
*   **Desktop**: Chrome, Firefox, Safari, Edge (Latest versions).
*   **Mobile**: iOS Safari, Android Chrome (Fully responsive layout).
*   **Accessibility**: WCAG 2.1 Level AA compliant (High contrast, ARIA labels).

---

## 8. Security Documentation
*   **Authentication**: JWT (JSON Web Tokens) with secure HTTP-only cookies.
*   **Password Policies**: Argon2 hashing, min 8 chars, mix of symbols/numbers.
*   **SSL/TLS**: TLS 1.3 enforced for all API traffic.
*   **Admins Best Practices**: Dual-factor authentication (2FA) is mandatory for all administrative accounts.

---

## 9. SEO & Analytics Setup
*   **Configuration**: Sitemap.xml and Robots.txt generated automatically.
*   **Analytics**: Integrated with Google Tag Manager for conversion tracking (Purchases, Cart Adds).
*   **Event Tracking**: Every purchase triggers a "Conversion" event in the dashboard logs.

---

## 10. Maintenance & Support
### Regular Tasks
*   **Log Monitoring**: Use `pm2 logs` to check real-time service health.
*   **Process Restart**: Use `pm2 restart all` after critical code updates.
*   **Dependency Check**: Run `npm audit fix` and `pip install --upgrade` monthly.

---

## 11. Performance Optimization
*   **Strategy**: Selective Redis caching for Category counts and Trending items.
*   **Image Optimization**: Sharp/Pillow used for automatic WebP conversion and lazy-loading.
*   **Speed Tools**: Tested with Google Lighthouse (Target 90+ Score).

---

## 12. Backup & Recovery
*   **Frequency**: Every 12 hours (High-availability).
*   **What is Backed Up**: Postgres DB, `/media` folder (Images), `.env` configs.
*   **Restore Instructions**:
    1. Restore DB: `psql -U postgres accountz_db < backup.sql`
    2. Sync Media: `rsync -avz backup_media/ backend/media/`

---

## 13. Testing & QA
*   **Manual**: 100% coverage of checkout and messaging flows.
*   **Automated**: Pytest suite for API endpoints; Vitest for UI logic.
*   **Acceptance Criteria**: All payments must be verified on-chain; all credentials delivered < 1s.

[INSERT SCREENSHOT: Dispute Resolution Hub - Admin view of an open dispute between parties]

---

## 15. Credentials & Access
*   **Main Server IP**: `88.99.143.151`
*   **SSH Access**: `root` / `HdkA5%L5L9tMfS`
*   **Admin Page**: `https://accountzclub.com/6f2c9b681c3b4cf9a8c4-admin-access-control-panel-login`
*   **Database**: (Stays local on the host)

---

## 16. Future Enhancements & Recommendations
1.  **GraphQL layer**: To reduce API overhead.
2.  **Native Mobile Apps**: For push notification support.
3.  **AI Moderation**: Automatic flagging of suspicious account descriptions.

---

## 17. Contact & Handover Information
**Lead Developer**: Accountz Club Engineering
**Handover Date**: January 19,2026

---
**END OF DOCUMENTATION V1.0 - CONFIDENTIAL**
