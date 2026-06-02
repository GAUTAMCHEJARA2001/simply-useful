/** 
 * Feature Flags to govern the progressive deployment of the 
 * upgraded Zoho/Tally-grade PDF rendering module.
 */
export const pdfFlags = {
  /** Enables modular, styled PDF templates for Sales/Purchase Orders */
  enableEnterpriseInvoices: true,
  
  /** Enables high-density modular ledger templates for stock ledgers */
  enableEnterpriseLedger: true,
  
  /** Enables print-ready work center tables for raw material batch sheets */
  enableEnterpriseProduction: true,
  
  /** Experimental SaaS dynamic multi-tenant custom presets feature toggle */
  enableExperimentalLayouts: false
};
