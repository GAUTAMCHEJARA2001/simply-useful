import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PDFGenerator } from '@/components/PDF/PDFGenerator';

const MyOrders: React.FC = () => {
  const { user } = useAuth();
  const { orders, products } = useData();
  const navigate = useNavigate();
  const myOrders = orders;
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  const getOrderWeight = (order: any) => {
    return (order.items || []).reduce((sum: number, item: any) => {
      const prod = products.find(p => p.product_name === item.product);
      if (!prod) return sum;
      const match = (prod.bag_size || '').match(/(\d+)/);
      const weight = match ? parseInt(match[1]) : 0;
      return sum + (weight * (item.qty || 0));
    }, 0);
  };

  const statusStyles: Record<string, string> = {
    Pending: 'bg-warning/15 text-warning', Approved: 'bg-accent/15 text-accent',
    Dispatched: 'bg-primary/15 text-primary', Completed: 'bg-success/15 text-success',
    Cancelled: 'bg-destructive/15 text-destructive',
  };

  return (
    <div className="space-y-6">
      <h1 className="page-header">My Orders</h1>
      <p className="page-subheader">{myOrders.length} orders placed</p>
      <div className="space-y-3">
        {myOrders.map(order => (
          <Card key={order.order_id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">{order.order_id}</p>
                  <p className="text-xs text-muted-foreground">{order.date} · {order.party_type}: {order.party_name}</p>
                </div>
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[order.status]}`}>{order.status}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">{order.items.length} item(s) · {order.items.map(i => i.product).join(', ')}</div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">Total Weight</span>
                <span className="font-semibold text-primary">{getOrderWeight(order)} kg</span>
              </div>
              {isAdmin && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">Grand Total</span>
                  <span className="font-bold text-success">₹{(order.grand_total || 0).toLocaleString()}</span>
                </div>
              )}
              {order.status === 'Pending' && (
                <div className="flex justify-end mt-3 gap-2">
                  <PDFGenerator 
                    type="SALES_ORDER" 
                    data={order}
                    filename={`Order_${order.order_id}.pdf`}
                    buttonLabel="Print"
                    variant="outline"
                  />
                  <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => navigate(`/sales/order/${order.order_id}`)}>
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit Order
                  </Button>
                </div>
              )}
              {order.status !== 'Pending' && (
                <div className="flex justify-end mt-3 gap-2">
                  <PDFGenerator 
                    type="SALES_ORDER" 
                    data={order}
                    filename={`Order_${order.order_id}.pdf`}
                    buttonLabel="Print Invoice"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MyOrders;
