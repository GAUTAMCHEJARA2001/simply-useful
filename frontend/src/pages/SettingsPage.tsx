import React from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Settings, Shield, CreditCard, Bell, Building2, Save, Download, Upload, Database, Cloud, Clock, HardDrive, FolderOpen, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/api/client';

const SettingsPage: React.FC = () => {
    const { settings, updateSetting } = useData();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const bulkFileInputRef = React.useRef<HTMLInputElement>(null);
    const [bulkType, setBulkType] = React.useState('products');
    const [bulkFile, setBulkFile] = React.useState<File | null>(null);
    const [backupStatus, setBackupStatus] = React.useState<{
        pg_dump_found: boolean;
        pg_dump_path: string;
        local_backup_dir: string;
        local_backup_enabled: boolean;
        local_backup_time: string;
    } | null>(null);
    const [localBackupDir, setLocalBackupDir] = React.useState(settings.local_backup_dir || 'C:\\SimplyUsefulBackups');
    const [isDownloadingDump, setIsDownloadingDump] = React.useState(false);
    const [autoBackupEnabled, setAutoBackupEnabled] = React.useState(settings.local_backup_enabled || false);
    const [autoBackupTime, setAutoBackupTime] = React.useState(settings.local_backup_time || '02:00');
    const [isSavingSchedule, setIsSavingSchedule] = React.useState(false);

    interface BackupFile {
        filename: string;
        size: string;
        created_at: string;
    }
    const [localBackups, setLocalBackups] = React.useState<BackupFile[]>([]);
    const [isFetchingBackups, setIsFetchingBackups] = React.useState(false);
    const [restoreFile, setRestoreFile] = React.useState<File | null>(null);
    const [isRestoring, setIsRestoring] = React.useState(false);
    
    // For confirmation dialog/modal
    const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
    const [confirmInput, setConfirmInput] = React.useState('');
    const [selectedBackupFilename, setSelectedBackupFilename] = React.useState<string | null>(null);
    const [selectedBackupUpload, setSelectedBackupUpload] = React.useState<File | null>(null);

    React.useEffect(() => {
        if (settings.local_backup_dir) {
            setLocalBackupDir(settings.local_backup_dir);
        }
    }, [settings.local_backup_dir]);

    React.useEffect(() => {
        if (settings.local_backup_enabled !== undefined) {
            setAutoBackupEnabled(settings.local_backup_enabled === true || settings.local_backup_enabled === 'true');
        }
        if (settings.local_backup_time) {
            setAutoBackupTime(settings.local_backup_time);
        }
    }, [settings.local_backup_enabled, settings.local_backup_time]);

    const fetchBackupStatus = async () => {
        try {
            const res = await api.get('/system/local-backup-status');
            if (res.data?.success) {
                setBackupStatus(res.data.data);
                if (res.data.data.local_backup_dir) {
                    setLocalBackupDir(res.data.data.local_backup_dir);
                }
                if (res.data.data.local_backup_enabled !== undefined) {
                    setAutoBackupEnabled(res.data.data.local_backup_enabled);
                }
                if (res.data.data.local_backup_time) {
                    setAutoBackupTime(res.data.data.local_backup_time);
                }
            }
        } catch (err) {
            console.error('Failed to fetch backup status', err);
        }
    };

    const fetchLocalBackups = async () => {
        setIsFetchingBackups(true);
        try {
            const res = await api.get('/system/local-backups');
            if (res.data?.success) {
                setLocalBackups(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch local backups', err);
        } finally {
            setIsFetchingBackups(false);
        }
    };

    const handleInitiateLocalRestore = (filename: string) => {
        setSelectedBackupFilename(filename);
        setSelectedBackupUpload(null);
        setConfirmInput('');
        setConfirmModalOpen(true);
    };

    const handleInitiateUploadRestore = () => {
        if (!restoreFile) {
            toast.error('Please select a .dump file to upload first.');
            return;
        }
        setSelectedBackupFilename(null);
        setSelectedBackupUpload(restoreFile);
        setConfirmInput('');
        setConfirmModalOpen(true);
    };

    const handleExecuteRestore = async () => {
        if (confirmInput.trim().toUpperCase() !== 'RESTORE') {
            toast.error('Please type RESTORE exactly to confirm.');
            return;
        }
        setConfirmModalOpen(false);
        setIsRestoring(true);
        
        const loadToast = toast.loading('Restoring database... This may take a moment.');
        
        try {
            if (selectedBackupUpload) {
                const formData = new FormData();
                formData.append('file', selectedBackupUpload);
                const res = await api.post('/system/restore-postgres-dump', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 60000
                });
                if (res.data?.success) {
                    toast.success(res.data.message || 'Database restored successfully!', { id: loadToast });
                    setRestoreFile(null);
                    const fileInput = document.getElementById('restore-file-upload') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                    
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    toast.error(res.data?.message || 'Restore failed.', { id: loadToast });
                }
            } else if (selectedBackupFilename) {
                const res = await api.post('/system/restore-postgres-dump', {
                    filename: selectedBackupFilename
                }, {
                    timeout: 60000
                });
                if (res.data?.success) {
                    toast.success(res.data.message || 'Database restored successfully!', { id: loadToast });
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    toast.error(res.data?.message || 'Restore failed.', { id: loadToast });
                }
            }
        } catch (error: any) {
            console.error('Database restore error:', error);
            const errMsg = error?.response?.data?.message || 'An error occurred during database restoration.';
            toast.error(errMsg, { id: loadToast });
        } finally {
            setIsRestoring(false);
            setSelectedBackupFilename(null);
            setSelectedBackupUpload(null);
            setConfirmInput('');
            fetchLocalBackups();
        }
    };

    React.useEffect(() => {
        fetchBackupStatus();
        fetchLocalBackups();
    }, []);

    const handleDownloadPostgresDump = async () => {
        setIsDownloadingDump(true);
        try {
            const res = await api.get('/system/download-postgres-dump', { responseType: 'blob' });
            const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '');
            downloadBlob(res.data, `db_backup_${timestamp}.dump`);
            toast.success('PostgreSQL Database Dump downloaded successfully!');
        } catch (error: any) {
            toast.error('Failed to download database dump');
        } finally {
            setIsDownloadingDump(false);
        }
    };

    const handleSaveBackupSchedule = async () => {
        if (!localBackupDir.trim()) {
            toast.error('Please enter a Local Backup Directory');
            return;
        }
        setIsSavingSchedule(true);
        try {
            await updateSetting('local_backup_dir', localBackupDir.trim());
            const res = await api.post('/system/auto-backup-schedule', {
                enabled: autoBackupEnabled,
                time: autoBackupTime,
                local_backup_dir: localBackupDir.trim(),
            });
            if (res.data?.success) {
                toast.success(res.data.message || 'Auto-backup schedule updated successfully');
            } else {
                toast.error(res.data?.message || 'Failed to update schedule');
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to save auto-backup schedule');
        } finally {
            setIsSavingSchedule(false);
            fetchBackupStatus();
            fetchLocalBackups();
        }
    };



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

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <Card>
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle className="flex items-center text-lg">
                                <HardDrive className="w-5 h-5 mr-2 text-primary" />
                                Local Database Backup & Automation
                            </CardTitle>
                            <CardDescription>
                                Back up the PostgreSQL database directly to your server's local disk with optional scheduled daily automation.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {backupStatus && (
                                <div className="p-4 rounded-lg bg-secondary/30 space-y-2 border border-border">
                                    <h4 className="font-bold text-sm">System Environment Status</h4>
                                    <div className="text-xs space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span>PostgreSQL pg_dump Utility:</span>
                                            {backupStatus.pg_dump_found ? (
                                                <span className="text-green-500 font-semibold flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                    Available
                                                </span>
                                            ) : (
                                                <span className="text-red-500 font-semibold flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                    Not Found
                                                </span>
                                            )}
                                        </div>
                                        {backupStatus.pg_dump_found ? (
                                            <div className="pt-2 border-t border-border mt-2">
                                                <p className="text-muted-foreground font-semibold">
                                                    Resolved pg_dump Path:
                                                </p>
                                                <code className="block bg-background p-1.5 rounded mt-1 select-all border border-border text-[10px] break-all font-mono">
                                                    {backupStatus.pg_dump_path}
                                                </code>
                                            </div>
                                        ) : (
                                            <div className="pt-2 border-t border-border mt-2 text-destructive">
                                                <p className="font-semibold text-xs text-red-500">Action Required:</p>
                                                <p className="text-[11px] leading-relaxed mt-1 text-muted-foreground">
                                                    Ensure PostgreSQL command-line tools are installed, or verify `pg_dump.exe` exists at `C:\Program Files\PostgreSQL\18\bin\pg_dump.exe` or standard bin path.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="local-backup-dir" className="font-bold text-sm flex items-center gap-2">
                                    <FolderOpen className="w-4 h-4 text-primary" /> Local Backup Folder Path
                                </Label>
                                <Input
                                    id="local-backup-dir"
                                    type="text"
                                    placeholder="e.g. C:\SimplyUsefulBackups or D:\Backups"
                                    value={localBackupDir}
                                    onChange={(e) => setLocalBackupDir(e.target.value)}
                                />
                                <p className="text-[11px] text-muted-foreground leading-normal">
                                    Offline database dumps will be automatically created in this directory. Backups older than 30 days will be pruned.
                                </p>
                            </div>

                            <div className="border-t border-border pt-4 mt-4 space-y-4">
                                <h4 className="font-bold text-sm flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" /> Automatic Daily Backups (Windows Task Scheduler)
                                </h4>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-secondary/10 border border-border">
                                    <div className="space-y-1">
                                        <Label className="font-semibold text-sm">Enable Scheduled Daily Backups</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Runs in the background at your chosen time. Requires Postgres and server computer to be running.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={autoBackupEnabled}
                                            onCheckedChange={(checked) => setAutoBackupEnabled(checked)}
                                        />
                                    </div>
                                </div>

                                {autoBackupEnabled && (
                                    <div className="flex items-center gap-3 max-w-[240px]">
                                        <div className="space-y-1 flex-1">
                                            <Label htmlFor="auto-backup-time" className="font-semibold text-xs">Run Daily At</Label>
                                            <Input
                                                id="auto-backup-time"
                                                type="time"
                                                value={autoBackupTime}
                                                onChange={(e) => setAutoBackupTime(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-border pt-4 mt-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-sm flex items-center gap-2">
                                        <Database className="w-4 h-4 text-primary" /> Database Restoration
                                    </h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={fetchLocalBackups}
                                        disabled={isFetchingBackups || isRestoring}
                                        className="h-8 px-2"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isFetchingBackups ? 'animate-spin' : ''}`} />
                                        Refresh List
                                    </Button>
                                </div>
                                
                                <p className="text-xs text-muted-foreground leading-normal">
                                    Restore the master database schema and data from a previously created local backup, or upload a PostgreSQL `.dump` file.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Local backups list */}
                                    <div className="space-y-2 border border-border rounded-lg p-3 bg-secondary/10 flex flex-col justify-between">
                                        <div className="space-y-1">
                                            <Label className="font-semibold text-xs">Available Local Backups</Label>
                                            <div className="max-h-[180px] overflow-y-auto space-y-1.5 mt-2 pr-1 select-none">
                                                {isFetchingBackups ? (
                                                    <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                                                        Scanning backups...
                                                    </div>
                                                ) : localBackups.length === 0 ? (
                                                    <div className="text-center py-6 text-xs text-muted-foreground">
                                                        No backups found in local folder.
                                                    </div>
                                                ) : (
                                                    localBackups.map((b) => (
                                                        <div key={b.filename} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border text-[11px] hover:border-primary/45 transition-colors">
                                                            <div className="space-y-0.5 max-w-[70%]">
                                                                <p className="font-mono truncate font-semibold text-foreground" title={b.filename}>
                                                                    {b.filename}
                                                                </p>
                                                                <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                                                    <span>{b.size}</span>
                                                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                                                    <span>{b.created_at}</span>
                                                                </p>
                                                            </div>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                className="h-6 text-[10px] px-2"
                                                                onClick={() => handleInitiateLocalRestore(b.filename)}
                                                                disabled={isRestoring}
                                                            >
                                                                Restore
                                                            </Button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Upload restoration */}
                                    <div className="space-y-3 border border-border rounded-lg p-3 bg-secondary/10 flex flex-col justify-between">
                                        <div className="space-y-2">
                                            <Label className="font-semibold text-xs">Upload & Restore Custom Dump</Label>
                                            <p className="text-[10px] text-muted-foreground leading-normal">
                                                Upload a `.dump` backup file created using `pg_dump` to overwrite the current database.
                                            </p>
                                            <Input
                                                id="restore-file-upload"
                                                type="file"
                                                accept=".dump"
                                                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                                                className="bg-background mt-2 text-xs"
                                                disabled={isRestoring}
                                            />
                                        </div>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="w-full mt-2"
                                            onClick={handleInitiateUploadRestore}
                                            disabled={!restoreFile || isRestoring}
                                        >
                                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                                            Upload & Restore File
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-border mt-4">
                                <Button
                                    variant="outline"
                                    onClick={handleSaveBackupSchedule}
                                    disabled={isSavingSchedule || isDownloadingDump}
                                >
                                    {isSavingSchedule ? (
                                        <>
                                            <div className="w-4 h-4 mr-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" /> Save Backup Settings
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleDownloadPostgresDump}
                                    disabled={isDownloadingDump || isSavingSchedule || !backupStatus?.pg_dump_found}
                                >
                                    {isDownloadingDump ? (
                                        <>
                                            <div className="w-4 h-4 mr-2 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                            Downloading dump...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4 mr-2" /> Download Postgres DB Dump
                                        </>
                                    )}
                                </Button>
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

            {/* Confirmation Modal */}
            {confirmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md p-6 bg-background rounded-lg border border-border shadow-2xl space-y-4"
                    >
                        <div className="flex items-center gap-3 text-destructive">
                            <AlertTriangle className="w-8 h-8 animate-bounce" />
                            <h3 className="text-lg font-bold">Confirm Database Restoration</h3>
                        </div>
                        
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            You are about to restore the database. This operation is <span className="font-bold text-foreground">highly destructive</span> and will overwrite all current company settings, product lists, dealer accounts, transactions, and reports.
                        </p>
                        <div className="p-3 bg-secondary/30 rounded border border-border text-xs text-muted-foreground">
                            <span className="font-bold text-foreground">Target backup:</span>{' '}
                            {selectedBackupFilename ? (
                                <code className="text-primary">{selectedBackupFilename}</code>
                            ) : selectedBackupUpload ? (
                                <code className="text-primary">{selectedBackupUpload.name} (Uploaded File)</code>
                            ) : 'Unknown'}
                        </div>
                        
                        <div className="p-3 bg-red-500/10 rounded border border-red-500/20 text-xs text-red-500">
                            A safety backup of your current database will be created automatically in your local backup folder prior to restoration.
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="restore-confirm" className="text-xs font-semibold">
                                To confirm, please type <span className="font-bold text-foreground font-mono">RESTORE</span> below:
                            </Label>
                            <Input
                                id="restore-confirm"
                                type="text"
                                placeholder="Type RESTORE to confirm"
                                value={confirmInput}
                                onChange={(e) => setConfirmInput(e.target.value)}
                                className="font-mono text-center tracking-widest font-bold bg-background border border-border"
                            />
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-2">
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    setConfirmModalOpen(false);
                                    setSelectedBackupFilename(null);
                                    setSelectedBackupUpload(null);
                                    setConfirmInput('');
                                }}
                                disabled={isRestoring}
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="destructive" 
                                onClick={handleExecuteRestore}
                                disabled={confirmInput.trim().toUpperCase() !== 'RESTORE' || isRestoring}
                            >
                                {isRestoring ? 'Restoring...' : 'Confirm & Restore'}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
