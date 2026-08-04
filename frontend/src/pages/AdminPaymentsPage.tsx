import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { paymentService } from '@/api/services/payment.service';
import { PaymentReceipt } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, Eye } from 'lucide-react';
import { format } from 'date-fns';

const AdminPaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const data = await paymentService.getAll();
      setPayments(data.results || data.data || data || []); // Handle paginated DRF response or standard response
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to fetch payments', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleVerify = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await paymentService.verifyPayment(id, status);
      toast({ title: 'Success', description: `Payment marked as ${status}` });
      fetchPayments();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || `Failed to mark as ${status}`, variant: 'destructive' });
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading payments...</div>;

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Payments Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Party Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-4">No payment entries found.</TableCell></TableRow>
                ) : payments.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.createdAt ? format(new Date(payment.createdAt), 'dd MMM yyyy') : '-'}</TableCell>
                    <TableCell>{payment.partyName} <span className="text-xs text-gray-500">({payment.partyType})</span></TableCell>
                    <TableCell className="font-medium">₹{payment.amount}</TableCell>
                    <TableCell>{payment.paymentMode}</TableCell>
                    <TableCell>{payment.submittedBy?.name || '-'}</TableCell>
                    <TableCell>
                      {payment.photoUrl ? (
                        <a href={payment.photoUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Eye className="w-4 h-4" /> View
                          </Button>
                        </a>
                      ) : (
                        <span className="text-gray-400 italic text-sm">No Photo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        payment.status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                        payment.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {payment.status === 'PENDING' && (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleVerify(payment.id!, 'VERIFIED')} className="bg-green-600 hover:bg-green-700">
                            <Check className="w-4 h-4 mr-1" /> Verify
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleVerify(payment.id!, 'REJECTED')}>
                            <X className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPaymentsPage;
