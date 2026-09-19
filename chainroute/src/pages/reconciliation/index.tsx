import { useListReconciliation, useRunReconciliation } from "@workspace/api-client-react";
import { formatMoney, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlayCircle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/query-client";

export default function ReconciliationList() {
  const { data: records, isLoading } = useListReconciliation();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const runMutation = useRunReconciliation();

  const handleRun = () => {
    runMutation.mutate(undefined, {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: ["/api/reconciliation"] });
        
        const mismatchCount = result.filter(r => r.status === "MISMATCH").length;
        if (mismatchCount > 0) {
          toast({
            title: "Reconciliation Complete",
            description: `Found ${mismatchCount} mismatches between ledger and external gateways.`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Reconciliation Complete",
            description: "All records match exactly.",
            className: "bg-success text-success-foreground"
          });
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    return status === "MATCH" ? (
      <Badge variant="success" className="gap-1"><CheckCircle2 className="w-3 h-3"/> Match</Badge>
    ) : (
      <Badge variant="destructive" className="gap-1"><ShieldAlert className="w-3 h-3"/> Mismatch</Badge>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reconciliation</h1>
          <p className="text-muted-foreground">Compare internal ledger amounts with Razorpay</p>
        </div>
        {hasRole(["ADMIN", "OPERATOR"]) && (
          <Button onClick={handleRun} disabled={runMutation.isPending} size="lg">
            <PlayCircle className={`h-4 w-4 mr-2 ${runMutation.isPending ? 'animate-spin' : ''}`} />
            {runMutation.isPending ? "Running..." : "Run Reconciliation"}
          </Button>
        )}
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading records...</div>
        ) : !records?.length ? (
          <div className="p-12 text-center text-muted-foreground">
            No reconciliation data available. Run reconciliation to check records.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Ledger Amount</TableHead>
                <TableHead className="text-right">External Amount</TableHead>
                <TableHead className="text-right">Diff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Checked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id} className={record.status === "MISMATCH" ? "bg-destructive/5 hover:bg-destructive/10" : ""}>
                  <TableCell className="font-mono text-xs">{record.internalPaymentId}</TableCell>
                  <TableCell className="text-xs font-semibold">{record.label}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(record.internalAmount)}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(record.externalAmount)}</TableCell>
                  <TableCell className={`text-right font-medium ${record.difference !== 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {record.difference !== 0 ? formatMoney(Math.abs(record.difference)) : "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDate(record.checkedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
