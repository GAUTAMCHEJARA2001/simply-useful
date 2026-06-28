# 🗺️ Simply Useful — Project Roadmap (ROADMAP.md)

This document outlines the planned feature additions, enhancements, and technology upgrades for the Simply Useful ERP platform.

---

## 📱 1. Mobile App for Field Operations
* **Goal:** Build a native React Native application for Sales Officers (SOs) working in areas with poor internet connectivity.
* **Key Capabilities:**
  * Offline-first order draft creation.
  * Local caching of the assigned dealer directory and inventory catalogs.
  * Auto-syncing once an internet connection is established.
  * GPS tracking for field visit logs.

---

## 🔮 2. Advanced Machine Learning Predictions
* **Goal:** Upgrade the predictive model in [predictions.py](file:///D:/cost%202/simply-useful/simply-useful/simply-useful/backend/api/services/predictions.py) to forecast stock demands and client churn risks.
* **Planned Upgrades:**
  * Integrate Prophet or LSTM neural network models.
  * Auto-adjust safety inventory limits based on seasonal demand trends.
  * Predict potential order cancellations based on past dealer profiles and delivery latency.

---

## 🚪 3. Supplier Extranet Portal
* **Goal:** Create a portal interface for raw material suppliers to coordinate stock delivery schedules directly.
* **Key Capabilities:**
  * Suppliers log in to view pending Purchase Orders.
  * Confirm delivery dates and upload invoices directly.
  * Live status tracking of warehouse goods receipt and quality inspections.

---

## 📜 4. Automated E-Way Bill Integration
* **Goal:** Integrate with the Indian GST network APIs to generate E-Way transport bills automatically when orders are dispatched.
* **Key Capabilities:**
  * Auto-populate transport distance and vehicle information from dispatch logs.
  * Retrieve and store E-Way bill PDFs in the order's history record.

---

## 📷 5. Camera Barcode Scanning
* **Goal:** Integrate mobile camera and browser-based barcode scanning for warehouse inventory managers.
* **Key Capabilities:**
  * Scan barcodes to log stock-in/stock-out transactions.
  * Scan barcodes to verify product codes during order dispatch processes.
