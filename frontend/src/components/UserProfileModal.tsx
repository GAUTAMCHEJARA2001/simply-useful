import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/api/services/user.service';
import { useToast } from '@/hooks/use-toast';
import {
  User as UserIcon,
  KeyRound,
  FileBadge2,
  Building2,
  Briefcase,
  Calendar,
  Phone,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  ExternalLink,
  Coins,
  Car,
  Clock,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ open, onOpenChange }) => {
  const { user, updateCurrentUser } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'employee' | 'password'>('profile');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [employeeData, setEmployeeData] = useState<any>(null);

  // Edit Name state
  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Fetch full profile and employee master records when modal opens
  useEffect(() => {
    if (open && user?.id) {
      setName(user.name || '');
      setLoadingDetails(true);
      userService.getProfileDetails()
        .then(res => {
          if (res.data?.success && res.data.data) {
            setEmployeeData(res.data.data.employee);
            if (res.data.data.user?.name) {
              setName(res.data.data.user.name);
            }
          }
        })
        .catch(err => {
          console.warn('Could not load detailed employee master profile:', err);
        })
        .finally(() => {
          setLoadingDetails(false);
        });
    } else {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [open, user?.id, user?.name]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) return;
    setSavingName(true);
    try {
      const res = await userService.updateProfile(user.id, { name: name.trim() });
      if (res.data?.success) {
        updateCurrentUser({ name: name.trim() });
        toast({
          title: 'Profile Updated',
          description: 'Your profile name has been updated successfully.',
        });
      } else {
        toast({
          title: 'Update Failed',
          description: res.data?.message || 'Could not update profile.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to update name.',
        variant: 'destructive',
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast({
        title: 'Weak Password',
        description: 'New password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords Mismatch',
        description: 'New password and confirmation password do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) return;
    setSavingPassword(true);
    try {
      const res = await userService.changePassword(user.id, {
        current_password: currentPassword,
        password: newPassword,
      });

      if (res.data?.success) {
        toast({
          title: 'Password Changed',
          description: 'Your password has been changed successfully.',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setActiveTab('profile');
      } else {
        toast({
          title: 'Change Password Failed',
          description: res.data?.message || 'Could not update password.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to change password.',
        variant: 'destructive',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-card border-border max-h-[90vh] flex flex-col">
        {/* Modal Top Header Banner */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-5 border-b border-border/80 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center font-bold text-xl shadow-md border-2 border-primary/20 shrink-0">
              {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-lg font-bold text-foreground truncate">
                  {user.name || user.email}
                </DialogTitle>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border",
                  user.role === 'SUPERADMIN' && "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
                  user.role === 'ADMIN' && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                  user.role === 'SALES' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                  user.role === 'INVENTORY' && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                  user.role === 'HR' && "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
                  !['SUPERADMIN', 'ADMIN', 'SALES', 'INVENTORY', 'HR'].includes(user.role) && "bg-secondary text-secondary-foreground"
                )}>
                  {user.role}
                </span>
                {employeeData?.employee_id && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-muted text-muted-foreground border border-border">
                    {employeeData.employee_id}
                  </span>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                {user.email} &middot; {user.companyName || user.tenantName || 'Organization Staff'}
              </DialogDescription>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 mt-4 pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                activeTab === 'profile'
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>My Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('employee')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                activeTab === 'employee'
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <FileBadge2 className="w-3.5 h-3.5" />
              <span>Employee Master Details</span>
              {employeeData && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                activeTab === 'password'
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>
          </div>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-5 min-h-[300px]">
          {/* TAB 1: MY PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <form onSubmit={handleUpdateName} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="user-name" className="text-xs font-semibold text-foreground">
                    Full Name
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="user-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="text-xs h-9 flex-1"
                      required
                    />
                    <Button
                      type="submit"
                      disabled={savingName || name.trim() === (user.name || '')}
                      size="sm"
                      className="h-9 px-4 text-xs font-semibold"
                    >
                      {savingName ? 'Saving...' : 'Save Name'}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    This is your displayed name across sales orders, travel logs, activity records, and internal communications.
                  </p>
                </div>
              </form>

              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Account Credentials & Setup
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-card border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Email Address</span>
                    <span className="font-semibold text-foreground block truncate mt-0.5">{user.email}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-card border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Assigned Role</span>
                    <span className="font-semibold text-foreground block mt-0.5">{user.role}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-card border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Company Organization</span>
                    <span className="font-semibold text-foreground block truncate mt-0.5">
                      {user.companyName || user.tenantName || 'Main Organization'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-card border border-border/60">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Account Status</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active & Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMPLOYEE MASTER DETAILS */}
          {activeTab === 'employee' && (
            <div className="space-y-4">
              {loadingDetails ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Loading Employee Master records...</span>
                </div>
              ) : employeeData ? (
                <div className="space-y-4">
                  {/* Job & Hierarchy Card */}
                  <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                      <Briefcase className="w-4 h-4" />
                      <span>Official Job & Designation (Company Entered)</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Employee ID</span>
                        <span className="font-bold text-foreground text-sm font-mono mt-0.5 block">
                          {employeeData.employee_id || 'Not Assigned'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Department</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          {employeeData.department || 'General Staff'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Designation / Role</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          {employeeData.designation || 'Staff'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Employment Type</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          {employeeData.employee_type === 'FIXED' ? 'Fixed / Monthly Salary' :
                           employeeData.employee_type === 'VARIABLE' ? 'Variable / Daily Wage' :
                           employeeData.employee_type || 'Standard'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Date of Joining</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          {employeeData.doj ? new Date(employeeData.doj).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          }) : 'Not Specified'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Reporting Manager</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          {employeeData.reports_to_name || 'Direct / HR Head'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Compensation & Allowances */}
                  <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                      <Coins className="w-4 h-4" />
                      <span>Compensation & Allowance Structure</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      {employeeData.base_salary_monthly > 0 && (
                        <div className="p-2 rounded-lg bg-muted/30">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Monthly Base</span>
                          <span className="font-bold text-foreground mt-0.5 block">₹{Number(employeeData.base_salary_monthly).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {employeeData.dailywage > 0 && (
                        <div className="p-2 rounded-lg bg-muted/30">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Daily Wage</span>
                          <span className="font-bold text-foreground mt-0.5 block">₹{Number(employeeData.dailywage).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      {employeeData.bike_allowance_per_km > 0 && (
                        <div className="p-2 rounded-lg bg-muted/30">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Bike Rate</span>
                          <span className="font-bold text-foreground mt-0.5 block">₹{employeeData.bike_allowance_per_km}/km</span>
                        </div>
                      )}
                      {employeeData.car_allowance_per_km > 0 && (
                        <div className="p-2 rounded-lg bg-muted/30">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Car Rate</span>
                          <span className="font-bold text-foreground mt-0.5 block">₹{employeeData.car_allowance_per_km}/km</span>
                        </div>
                      )}
                      {employeeData.bag_incentive_rate > 0 && (
                        <div className="p-2 rounded-lg bg-muted/30">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Bag Incentive</span>
                          <span className="font-bold text-foreground mt-0.5 block">₹{employeeData.bag_incentive_rate}/bag</span>
                        </div>
                      )}
                      {employeeData.sales_incentive_pct > 0 && (
                        <div className="p-2 rounded-lg bg-muted/30">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Commission</span>
                          <span className="font-bold text-foreground mt-0.5 block">{employeeData.sales_incentive_pct}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* KYC & Bank Details Card */}
                  <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      <CreditCard className="w-4 h-4" />
                      <span>Statutory KYC & Banking Records</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Aadhaar Number</span>
                        <span className="font-mono font-semibold text-foreground mt-0.5 block">
                          {employeeData.aadhar_number ? `XXXX-XXXX-${employeeData.aadhar_number.slice(-4)}` : 'Not on file'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">PAN Number</span>
                        <span className="font-mono font-semibold text-foreground mt-0.5 block">
                          {employeeData.pan_number || 'Not on file'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Contact / Mobile</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          {employeeData.contactinfo || 'Not specified'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Bank Name</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          {employeeData.bank_name || 'Not on file'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Account Number</span>
                        <span className="font-mono font-semibold text-foreground mt-0.5 block">
                          {employeeData.bank_account_number ? `•••• •••• ${employeeData.bank_account_number.slice(-4)}` : 'Not on file'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-muted/30">
                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">IFSC Code</span>
                        <span className="font-mono font-semibold text-foreground mt-0.5 block">
                          {employeeData.bank_ifsc || 'Not on file'}
                        </span>
                      </div>
                    </div>

                    {/* Document Proof Links */}
                    {(employeeData.employee_photo || employeeData.aadhar_photo || employeeData.pan_photo || employeeData.bank_proof_photo) && (
                      <div className="pt-2 border-t border-border/60">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">
                          Company Verified Attachments
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {employeeData.employee_photo && (
                            <a
                              href={employeeData.employee_photo}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted/60 hover:bg-muted border border-border text-foreground transition-colors"
                            >
                              <ExternalLink className="w-3 h-3 text-primary" />
                              <span>Employee Photo</span>
                            </a>
                          )}
                          {employeeData.aadhar_photo && (
                            <a
                              href={employeeData.aadhar_photo}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted/60 hover:bg-muted border border-border text-foreground transition-colors"
                            >
                              <ExternalLink className="w-3 h-3 text-primary" />
                              <span>Aadhaar Proof</span>
                            </a>
                          )}
                          {employeeData.pan_photo && (
                            <a
                              href={employeeData.pan_photo}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted/60 hover:bg-muted border border-border text-foreground transition-colors"
                            >
                              <ExternalLink className="w-3 h-3 text-primary" />
                              <span>PAN Proof</span>
                            </a>
                          )}
                          {employeeData.bank_proof_photo && (
                            <a
                              href={employeeData.bank_proof_photo}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted/60 hover:bg-muted border border-border text-foreground transition-colors"
                            >
                              <ExternalLink className="w-3 h-3 text-primary" />
                              <span>Bank Cheque / Passbook</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-10 px-4 text-center rounded-xl border border-dashed border-border bg-muted/10 space-y-2">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto opacity-70" />
                  <h4 className="text-xs font-bold text-foreground">No Employee Master Record Linked</h4>
                  <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                    Your login is active, but HR / Administration has not yet linked an Employee Master profile with Aadhaar, designation, or salary structures for this account.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="rounded-xl border border-border/80 bg-muted/15 p-4 space-y-3.5">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Security & Login Credentials</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Choose a strong password with at least 6 characters to secure your Simply Useful workspace account.
                  </p>
                </div>

                {/* Current Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="current-password" className="text-xs font-semibold text-foreground">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="text-xs h-9 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs font-semibold text-foreground">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 6 characters)"
                      className="text-xs h-9 pr-9"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-xs font-semibold text-foreground">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="text-xs h-9 pr-9"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={savingPassword || !newPassword || !confirmPassword}
                  className="w-full text-xs font-semibold h-9 mt-2"
                >
                  {savingPassword ? 'Updating Password...' : 'Update Password'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
