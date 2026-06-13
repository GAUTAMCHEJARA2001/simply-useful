import React from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Settings, Shield, CreditCard, Bell, Building2, Save, Download, Upload, Database } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';

const SettingsPage: React.FC = () => {
    const { settings, updateSetting } = useData();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const bulkFileInputRef = React.useRef<HTMLInputElement>(null);
    const [bulkType, setBulkType] = React.useState('products');
    const [bulkFile, setBulkFile] = React.useState<File | null>(null);

    const settingsItems = [
        {
            key: 'allow_price_edit_sales',
            title: 'Sales Price Editing',
            description: 'Allow Sales Officers to edit the product rates during order placement.',
            icon: Shield,
        },
        {
            key: 'show_credit_warnings',
            title: 'Credit Limit Warnings',
            description: 'Show alerts when a dealer or distributor exceeds their credit limit.',
            icon: CreditCard,
        },
        {
            key: 'order_approval_required',
            title: 'Order Approval Workflow',
            description: 'Require Admin approval for all new sales orders before they are processed.',
            icon: Bell,
        },
    ];

    const [companyDetails, setCompanyDetails] = React.useState({
        company_name: settings.company_name || 'KAMLA INDUSTRIES',
        company_address: settings.company_address || 'Phase-1, Industrial Area, Rajasthan, India',
        company_gst: settings.company_gst || '08ABCDE1234F1Z5',
        company_phone: settings.company_phone || '+91 98765 43210',
        company_email: settings.company_email || 'office@kamlaerl.com',
        company_logo: settings.company_logo || '',
        company_bank_name: settings.company_bank_name || '',
        company_bank_account: settings.company_bank_account || '',
        company_bank_ifsc: settings.company_bank_ifsc || '',
        company_bank_branch: settings.company_bank_branch || '',
    });

    React.useEffect(() => {
        if (settings.company_name) {
            setCompanyDetails({
                company_name: settings.company_name || '',
                company_address: settings.company_address || '',
                company_gst: settings.company_gst || '',
                company_phone: settings.company_phone || '',
                company_email: settings.company_email || '',
                company_logo: settings.company_logo || '',
                company_bank_name: settings.company_bank_name || '',
                company_bank_account: settings.company_bank_account || '',
                company_bank_ifsc: settings.company_bank_ifsc || '',
                company_bank_branch: settings.company_bank_branch || '',
            });
        }
    }, [settings]);

    const [isSaving, setIsSaving] = React.useState(false);

    const handleSaveCompany = async () => {
        setIsSaving(true);
        try {
            // Save one by one to avoid parallel request issues with large payloads
            await updateSetting('company_name', companyDetails.company_name);
            await updateSetting('company_address', companyDetails.company_address);
            await updateSetting('company_gst', companyDetails.company_gst);
            await updateSetting('company_phone', companyDetails.company_phone);
            await updateSetting('company_email', companyDetails.company_email);
            await updateSetting('company_logo', companyDetails.company_logo);
            await updateSetting('company_bank_name', companyDetails.company_bank_name);
            await updateSetting('company_bank_account', companyDetails.company_bank_account);
            await updateSetting('company_bank_ifsc', companyDetails.company_bank_ifsc);
            await updateSetting('company_bank_branch', companyDetails.company_bank_branch);
            
            toast.success('Company details updated successfully');
        } catch (error) {
            console.error('Save Settings Error:', error);
            toast.error('Failed to update company details');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit for Base64 storage
                toast.error('Image is too large. Please select a file smaller than 5MB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setCompanyDetails({
                    ...companyDetails,
                    company_logo: reader.result as string,
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const handleTemplateDownload = async (type: string) => {
        try {
            const res = await api.get(`/bulk/${type}/template`, { responseType: 'blob' });
            downloadBlob(res.data, `${type}_template.csv`);
        } catch {
            toast.error('Template download failed');
        }
    };

    const handleBulkImport = async () => {
        if (!bulkFile) {
            toast.error('Please select a CSV file first');
            return;
        }
        const payload = new FormData();
        payload.append('file', bulkFile);
        try {
            const res = await api.post(`/bulk/${bulkType}/import`, payload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const data = res.data?.data || {};
            toast.success(`Import complete: ${data.created || 0} created, ${data.updated || 0} updated`);
            setBulkFile(null);
            if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Import failed');
        }
    };

    const handleDatabaseExport = async (format: 'json' | 'sqlite' = 'json') => {
        try {
            const url = `/system/database-export${format === 'sqlite' ? '?db_format=sqlite' : ''}`;
            const res = await api.get(url, { responseType: 'blob' });
            downloadBlob(res.data, format === 'sqlite' ? 'db.sqlite3' : 'simply-useful-database-export.json');
            toast.success(`${format === 'sqlite' ? 'SQLite Database' : 'Database JSON backup'} downloaded successfully`);
        } catch {
            toast.error('Database export failed');
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="page-header">System Settings</h1>
                <p className="page-subheader">Derived configuration for all users and features</p>
            </div>

            <div className="grid gap-6">
                {settingsItems.map((item, idx) => (
                    <motion.div
                        key={item.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <Card>
                            <CardContent className="flex items-center justify-between p-6">
                                <div className="flex items-start space-x-4">
                                    <div className="mt-1 bg-primary/10 p-2 rounded-lg">
                                        <item.icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-base font-bold">{item.title}</Label>
                                        <CardDescription>{item.description}</CardDescription>
                                    </div>
                                </div>
                                <Switch
                                    checked={settings[item.key] === true || settings[item.key] === 'true'}
                                    onCheckedChange={(checked) => updateSetting(item.key, checked)}
                                />

                            </CardContent>
                        </Card>
                    </motion.div>
                ))}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="flex items-center text-lg">
                                <Building2 className="w-5 h-5 mr-2 text-primary" />
                                Company Profile
                            </CardTitle>
                            <CardDescription> These details will appear on all generated PDF documents </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="company_name">Company Name</Label>
                                    <Input 
                                        id="company_name" 
                                        value={companyDetails.company_name} 
                                        onChange={(e) => setCompanyDetails({...companyDetails, company_name: e.target.value})}
                                        placeholder="Enter company name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="company_gst">GST Number</Label>
                                    <Input 
                                        id="company_gst" 
                                        value={companyDetails.company_gst} 
                                        onChange={(e) => setCompanyDetails({...companyDetails, company_gst: e.target.value})}
                                        placeholder="e.g. 08ABCDE1234F1Z5"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="company_address">Registered Address</Label>
                                <Textarea 
                                    id="company_address" 
                                    value={companyDetails.company_address} 
                                    onChange={(e) => setCompanyDetails({...companyDetails, company_address: e.target.value})}
                                    placeholder="Enter full address"
                                    className="resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="company_phone">Contact Phone</Label>
                                    <Input 
                                        id="company_phone" 
                                        value={companyDetails.company_phone} 
                                        onChange={(e) => setCompanyDetails({...companyDetails, company_phone: e.target.value})}
                                        placeholder="e.g. +91 98765 43210"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="company_email">Official Email</Label>
                                    <Input 
                                        id="company_email" 
                                        type="email"
                                        value={companyDetails.company_email} 
                                        onChange={(e) => setCompanyDetails({...companyDetails, company_email: e.target.value})}
                                        placeholder="e.g. office@domain.com"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 mt-4 border-t space-y-4">
                                <h3 className="text-sm font-semibold flex items-center">
                                    <CreditCard className="w-4 h-4 mr-2 text-primary" />
                                    Bank Details (Electronic Transfer)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="company_bank_name">Bank Name</Label>
                                        <Input 
                                            id="company_bank_name" 
                                            value={companyDetails.company_bank_name} 
                                            onChange={(e) => setCompanyDetails({...companyDetails, company_bank_name: e.target.value})}
                                            placeholder="e.g. State Bank of India"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="company_bank_account">Account Number</Label>
                                        <Input 
                                            id="company_bank_account" 
                                            value={companyDetails.company_bank_account} 
                                            onChange={(e) => setCompanyDetails({...companyDetails, company_bank_account: e.target.value})}
                                            placeholder="e.g. 31234567890"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="company_bank_ifsc">IFSC Code</Label>
                                        <Input 
                                            id="company_bank_ifsc" 
                                            value={companyDetails.company_bank_ifsc} 
                                            onChange={(e) => setCompanyDetails({...companyDetails, company_bank_ifsc: e.target.value})}
                                            placeholder="e.g. SBIN0001234"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="company_bank_branch">Branch Name</Label>
                                        <Input 
                                            id="company_bank_branch" 
                                            value={companyDetails.company_bank_branch} 
                                            onChange={(e) => setCompanyDetails({...companyDetails, company_bank_branch: e.target.value})}
                                            placeholder="e.g. Main Branch"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Company Logo (Max 5MB)</Label>
                                <div className="flex items-center gap-6">
                                    <div className="w-24 h-24 border-2 border-dashed rounded-lg bg-muted/20 flex items-center justify-center overflow-hidden">
                                        {companyDetails.company_logo ? (
                                            <img src={companyDetails.company_logo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <Building2 className="w-8 h-8 text-muted-foreground/40" />
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={handleFileChange} 
                                            accept="image/*" 
                                            className="hidden" 
                                        />
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                                {companyDetails.company_logo ? 'Change Logo' : 'Upload Logo'}
                                            </Button>
                                            {companyDetails.company_logo && (
                                                <Button variant="ghost" size="sm" className="text-destructive h-8" onClick={() => setCompanyDetails({...companyDetails, company_logo: ''})}>
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">Select a file from your system (PNG or JPG recommended, max 1MB).</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t bg-muted/10 p-4 flex justify-end">
                            <Button onClick={handleSaveCompany} size="sm" disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 mr-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Company Details
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="flex items-center text-lg">
                                <Upload className="w-5 h-5 mr-2 text-primary" />
                                Bulk Import & Backup
                            </CardTitle>
                            <CardDescription>Use Excel-compatible CSV sheets for products, dealers, distributors, and recipes.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    { id: 'products', label: 'Product Template' },
                                    { id: 'dealers', label: 'Dealer Template' },
                                    { id: 'distributors', label: 'Distributor Template' },
                                    { id: 'recipes', label: 'Recipe Template' },
                                    { id: 'leads', label: 'Lead Template' },
                                ].map(item => (
                                    <Button key={item.id} variant="outline" onClick={() => handleTemplateDownload(item.id)} className="justify-start">
                                        <Download className="w-4 h-4 mr-2" /> {item.label}
                                    </Button>
                                ))}
                            </div>

                            <div className="rounded-lg border border-border p-4 space-y-3">
                                <Label className="font-bold">Upload Filled Sheet</Label>
                                <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3">
                                    <select
                                        value={bulkType}
                                        onChange={(e) => setBulkType(e.target.value)}
                                        className="border border-border rounded-lg px-3 py-2 bg-background text-sm"
                                    >
                                        <option value="products">Products</option>
                                        <option value="dealers">Dealers</option>
                                        <option value="distributors">Distributors</option>
                                        <option value="recipes">Recipes</option>
                                        <option value="leads">Leads</option>
                                    </select>
                                    <Input
                                        ref={bulkFileInputRef}
                                        type="file"
                                        accept=".csv,text/csv"
                                        onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={handleBulkImport}>
                                        <Upload className="w-4 h-4 mr-2" /> Import Sheet
                                    </Button>
                                </div>
                            </div>

                            <div className="rounded-lg border border-border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <Label className="font-bold flex items-center gap-2"><Database className="w-4 h-4" /> Full Database Export</Label>
                                    <p className="text-xs text-muted-foreground mt-1">Download all company data as JSON backup or the raw SQLite database file.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" onClick={() => handleDatabaseExport('json')}>
                                        <Download className="w-4 h-4 mr-2" /> Export JSON
                                    </Button>
                                    <Button variant="outline" onClick={() => handleDatabaseExport('sqlite')}>
                                        <Download className="w-4 h-4 mr-2" /> Export SQLite DB
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <Card className="bg-secondary/30 border-dashed">
                <CardHeader>
                    <CardTitle className="text-sm flex items-center">
                        <Settings className="w-4 h-4 mr-2" /> Note
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-muted-foreground">
                        These settings are global and affect all Sales Officers and specific application behaviors.
                        Changes are applied in real-time without requiring individual code updates for users like SO1 or TEST1SALES.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default SettingsPage;
