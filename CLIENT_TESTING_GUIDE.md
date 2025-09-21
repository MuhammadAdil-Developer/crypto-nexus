# CryptoNexus Platform - Testing Guide & Credentials
**Date:** September 16, 2025

---

## 🔐 **ACCOUNT CREDENTIALS**

### **1. Buyer Account**
**URL:** http://94.130.201.44:5000/sign-in
- **Username:** `crypto_buyer`
- **Password:** `Test@123`

### **2. Vendor Account**
**URL:** http://94.130.201.44:5000/sign-in
- **Username:** `crypto_buyer_2`
- **Password:** `Test@123`

### **3. Admin Account**
**URL:** http://94.130.201.44:5000/admin-sign-in
- **Username:** `crypto_admin`
- **Password:** `Test@123`

### **4. BTCPay Server Dashboard**
**URL:** http://94.130.201.44:23000/stores/AKwDcGXvXRfKkVD3uTD7cK2Yv3jbnidDhwihfxBGyUN3
- **Email:** `developer.adil9@gmail.com`
- **Password:** `Adil599$`

---

## 🧪 **TESTING INSTRUCTIONS**

### **Step 1: Test Product Purchase & Payment**

1. **Login as Buyer**
   - Go to: http://94.130.201.44:5000/sign-in
   - Use buyer credentials: `crypto_buyer` / `Test@123`

2. **Browse Products**
   - Navigate to: http://94.130.201.44:5000/buyer/listings
   - Select any product you want to purchase

3. **Generate Invoice**
   - Click "Buy Now" on any product
   - This will automatically generate a BTCPay invoice
   - You'll get a Bitcoin testnet address for payment

4. **Get Testnet Coins**
   - Visit: https://bitcoinfaucet.uo1.net/
   - Enter your generated Bitcoin address
   - Request testnet coins (free)

5. **Complete Payment**
   - Send the testnet coins to your generated address
   - The invoice will automatically be marked as "Paid" in BTCPay
   - The system will also update the order status

### **Step 2: Monitor Payment Process**

1. **BTCPay Server Monitoring**
   - Login to BTCPay: http://94.130.201.44:23000/stores/AKwDcGXvXRfKkVD3uTD7cK2Yv3jbnidDhwihfxBGyUN3
   - Check invoice status in real-time
   - See payment confirmations

2. **System Integration**
   - Payment status updates automatically
   - Webhook integration working perfectly


