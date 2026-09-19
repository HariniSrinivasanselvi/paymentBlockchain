import { useAuth } from "@/hooks/use-auth";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import { formatMoney } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  ArrowRight, 
  CreditCard, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Activity,
  Link as LinkIcon
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();

  if (isLoading || !summary) {
    return (
      <div className="p-8 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted/50" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Control Center</h1>
          <p className="text-muted-foreground mt-1">Platform overview and ledger activity</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Captured Volume</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(summary.totalVolume)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All-time processed value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Payments</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.successfulCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Captured transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Created / Authorized</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.failedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Ledger Events */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              Recent Ledger Events
            </CardTitle>
            <CardDescription>Latest blocks committed to the audit trail</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <div className="space-y-4">
              {summary.recentBlockchainEvents.slice(0, 5).map((block) => (
                <div key={block.id} className="flex items-start gap-4 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                  <div className="bg-primary/10 text-primary p-2 rounded shrink-0">
                    <LinkIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{block.eventType}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                      {block.currentHash.substring(0, 16)}...
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-medium bg-secondary px-2 py-1 rounded">
                      Block #{block.blockIndex}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {summary.recentBlockchainEvents.length === 0 && (
              <div className="text-center p-6 text-muted-foreground text-sm">
                No recent events
              </div>
            )}
          </CardContent>
          <div className="p-4 border-t border-border mt-auto">
            <Link href="/blockchain" className="text-sm text-primary flex items-center justify-center font-medium hover:underline">
              View Full Ledger <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </Card>

        {/* Vendor Distribution */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Vendor Distribution
            </CardTitle>
            <CardDescription>Payment volume split across vendors</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {summary.vendorDistribution.map((vendor, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{vendor.vendorName}</span>
                    <span className="text-muted-foreground">{formatMoney(vendor.amount)}</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${Math.max(1, vendor.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
              {summary.vendorDistribution.length === 0 && (
                <div className="text-center p-6 text-muted-foreground text-sm">
                  No vendor data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
