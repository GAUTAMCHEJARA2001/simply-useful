import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Receipt, ArrowRight, Clock, IndianRupee } from 'lucide-react';
import { Link } from 'react-router-dom';
import { paymentService } from '@/api/services/payment.service';
import { PaymentReceipt } from '@/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const PaymentRequestsPanel: React.FC = () => {
  const { data: requests, isLoading } = useQuery<PaymentReceipt[]>({
    queryKey: ['payment-requests-panel'],
    queryFn: paymentService.getAll,
    staleTime: 30000,
  });

  const pendingRequests = requests?.filter(r => r.status === 'PENDING') || [];

  if (pendingRequests.length === 0) return null;

  return (
    <Card className="border-emerald-100 shadow-sm bg-emerald-50/30">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="w-5 h-5 text-emerald-600" />
          Pending Payment Approvals
          {pendingRequests.length > 0 && (
            <Badge variant="destructive" className="ml-2 bg-emerald-500">{pendingRequests.length} New</Badge>
          )}
        </CardTitle>
        <Link to="/admin/payments">
          <Button variant="ghost" size="sm" className="h-8 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100">
            View All <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
          </div>
        ) : pendingRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 bg-white rounded-md border border-dashed">
            No pending payment requests.
          </p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.slice(0, 3).map((req) => (
              <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Receipt className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{req.partyName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="font-bold text-emerald-700 flex items-center">
                        <IndianRupee className="w-3 h-3" />
                        {Number(req.amount).toLocaleString('en-IN')}
                      </span>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700">{req.paymentMode}</span>
                      <span>•</span>
                      <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> {req.createdAt ? format(new Date(req.createdAt), 'dd MMM yy') : '-'}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0">
                  <Link to={`/admin/payments?id=${req.id}`}>
                    <Button size="sm" variant="outline" className="w-full sm:w-auto h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                      Review
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {pendingRequests.length > 3 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                + {pendingRequests.length - 3} more pending payments
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentRequestsPanel;
