import { useListPayments } from "@workspace/api-client-react";
import { formatMoney, formatDate } from "@/lib/utils";
import { Link } from "wouter";
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
import { Plus, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function PaymentsList() {
  const { data: payments, isLoading } = useListPayments();
  const { hasRole } = useAuth();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CAPTURED":
        return <Badge variant="success">Captured</Badge>;
      case "CREATED":
      case "AUTHORIZED":
        return <Badge variant="secondary">{status}</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Manage and view all platform transactions</p>
        </div>
        {hasRole(["ADMIN", "OPERATOR"]) && (
          <Link href="/payments/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Payment
            </Button>
          </Link>
        )}
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading payments...</div>
        ) : !payments?.length ? (
          <div className="p-12 text-center text-muted-foreground">
            No payments found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Customer Ref</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-xs">{payment.internalPaymentId}</TableCell>
                  <TableCell>{payment.customerReference}</TableCell>
                  <TableCell className="font-medium">{formatMoney(payment.amount)}</TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDate(payment.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/payments/${payment.id}`}>
                      <Button variant="ghost" size="sm" className="h-8">
                        View <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
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
