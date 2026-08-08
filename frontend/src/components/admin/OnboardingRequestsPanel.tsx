import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCheck, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { onboardingService } from '@/api/services/onboarding.service';
import { PartyOnboardingRequest } from '@/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const OnboardingRequestsPanel: React.FC = () => {
  const { data: requests, isLoading } = useQuery<PartyOnboardingRequest[]>({
    queryKey: ['onboarding-requests-panel'],
    queryFn: onboardingService.getAll,
    staleTime: 30000,
  });

  const pendingRequests = requests?.filter(r => r.status === 'PENDING') || [];

  return (
    <Card className="border-orange-100 shadow-sm bg-orange-50/30">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-orange-600" />
          Pending Onboarding Approvals
          {pendingRequests.length > 0 && (
            <Badge variant="destructive" className="ml-2 bg-orange-500">{pendingRequests.length} New</Badge>
          )}
        </CardTitle>
        <Link to="/admin/onboarding">
          <Button variant="ghost" size="sm" className="h-8 text-orange-700 hover:text-orange-800 hover:bg-orange-100">
            View All <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
          </div>
        ) : pendingRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 bg-white rounded-md border border-dashed">
            No pending onboarding requests.
          </p>
        ) : (
          <div className="space-y-3">
            {pendingRequests.slice(0, 3).map((req) => (
              <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <UserCheck className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{req.partyName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="font-medium px-1.5 py-0.5 bg-gray-100 rounded text-gray-700">{req.partyType}</span>
                      <span>•</span>
                      <span>{req.cityOrArea}</span>
                      <span>•</span>
                      <span className="flex items-center"><Clock className="w-3 h-3 mr-1"/> {req.createdAt ? format(new Date(req.createdAt), 'dd MMM yy') : '-'}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0">
                  <Link to={`/admin/onboarding?id=${req.id}`}>
                    <Button size="sm" variant="outline" className="w-full sm:w-auto h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-50">
                      Review
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {pendingRequests.length > 3 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                + {pendingRequests.length - 3} more pending requests
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OnboardingRequestsPanel;
