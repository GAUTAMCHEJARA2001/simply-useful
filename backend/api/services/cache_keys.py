class CRMCacheKeys:
    @staticmethod
    def dashboard(company_id):
        return f"crm_metrics_{company_id or 'all'}"
