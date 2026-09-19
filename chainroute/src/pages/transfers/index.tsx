import { useListTransfers, useReverseTransfer } from "@workspace/api-client-react";
import { formatMoney, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Undo2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/query-client";
import { Link } from "wouter";

export default function TransfersList() {
  const { data: transfers, isLoading } = useListTransfers();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const reverseMutation = useReverseTransfer();

  const handleReverse = (id: number) => {
    if (confirm("Are you sure you want to reverse this transfer? This action will generate a new ledger block.")) {
      reverseMutation.mutate(
        { id, data: {} },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transfers"] });
            toast({ title: "Transfer reversed successfully" });
          },
          onError: () => {
            toast({ title: "Failed to reverse transfer", variant: "destructive" });
          }
        }
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PROCESSED":
        return <Badge variant="success">Processed</Badge>;
      case "REVERSED":
        return <Badge variant="destructive">Reversed</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transfers</h1>
        <p className="text-muted-foreground">Monitor vendor payouts and settlements</p>
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading transfers...</div>
        ) : !transfers?.length ? (
          <div className="p-12 text-center text-muted-foreground">
            No transfers found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transfer ID</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">
                    {t.razorpayTransferId || `Simulated (${t.id})`}
                  </TableCell>
                  <TableCell>
                    <Link href={`/payments/${t.paymentId}`} className="text-primary hover:underline font-medium">
                      View Payment
                    </Link>
                  </TableCell>
                  <TableCell>{t.vendorName}</TableCell>
                  <TableCell className="font-medium">{formatMoney(t.amount)}</TableCell>
                  <TableCell>{getStatusBadge(t.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDate(t.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {hasRole(["ADMIN"]) && t.status === "PROCESSED" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleReverse(t.id)}
                        disabled={reverseMutation.isPending}
                        className="text-destructive border-destructive/20 hover:bg-destructive hover:text-white"
                      >
                        <Undo2 className="h-4 w-4 mr-1" />
                        Reverse
                      </Button>
                    )}
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
