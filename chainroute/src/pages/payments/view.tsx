import { useGetPayment, useCapturePayment, useGetBlockchainTransaction } from "@workspace/api-client-react";
import { formatMoney, formatDate, formatHash } from "@/lib/utils";
import { useRoute, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Link as LinkIcon, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/query-client";
import { useAuth } from "@/hooks/use-auth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PaymentView() {
  const [, params] = useRoute("/payments/:id");
  const id = parseInt(params?.id || "0", 10);
  const { toast } = useToast();
  const { hasRole } = useAuth();
  
  const { data: payment, isLoading } = useGetPayment(id, {
    query: {
      enabled: !!id,
      queryKey: ["payment", id]
    }
  });

  // Safe to query transaction id if we have a payment
  const transactionId = payment?.id.toString(); // Internal payment id could also be used depending on API, assuming payment.id is the entityId
  const { data: chain } = useGetBlockchainTransaction(transactionId || "", {
    query: {
      enabled: !!transactionId,
      queryKey: ["chain", transactionId]
    }
  });

  const captureMutation = useCapturePayment();

  const handleCapture = () => {
    if (!payment) return;
    captureMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["payment", id] });
          toast({
            title: "Payment Captured",
            description: "The payment has been successfully captured and recorded.",
          });
        },
        onError: (err) => {
          toast({
            title: "Capture Failed",
            description: "Failed to capture payment.",
            variant: "destructive"
          });
        }
      }
    );
  };

  if (isLoading || !payment) {
    return <div className="p-8">Loading...</div>;
  }

  const isCapturable = payment.status === "CREATED" || payment.status === "AUTHORIZED";

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <Link href="/payments">
        <Button variant="ghost" size="sm" className="-ml-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Payments
        </Button>
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{payment.internalPaymentId}</h1>
            {payment.status === "CAPTURED" ? (
              <Badge variant="success">Captured</Badge>
            ) : payment.status === "FAILED" ? (
              <Badge variant="destructive">Failed</Badge>
            ) : (
              <Badge variant="secondary">{payment.status}</Badge>
            )}
            {payment.simulated && <Badge variant="outline">Simulated</Badge>}
          </div>
          <p className="text-muted-foreground mt-1">
            Customer Ref: {payment.customerReference} • {formatDate(payment.createdAt)}
          </p>
        </div>

        {hasRole(["ADMIN", "OPERATOR"]) && isCapturable && (
          <Button onClick={handleCapture} disabled={captureMutation.isPending}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {captureMutation.isPending ? "Capturing..." : "Capture Payment"}
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Allocations</CardTitle>
            <CardDescription>Split of funds between platform and vendors</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Beneficiary</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payment.allocations.map((alloc) => (
                  <TableRow key={alloc.id}>
                    <TableCell className="font-medium">
                      {alloc.vendorName || "Platform Share"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{alloc.label}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(alloc.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 pt-4 border-t flex justify-between font-bold">
              <span>Total Payment Amount</span>
              <span className="text-lg">{formatMoney(payment.amount)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Razorpay Order ID</div>
                <div className="font-mono">{payment.razorpayOrderId || "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Razorpay Payment ID</div>
                <div className="font-mono">{payment.razorpayPaymentId || "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Description</div>
                <div>{payment.description || "—"}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-sidebar text-sidebar-foreground border-sidebar-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sidebar-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
                Audit Ledger
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-sidebar-foreground/70">
                This transaction's lifecycle is permanently recorded on the hash-linked audit ledger.
              </p>
              
              <Link href={`/blockchain/${transactionId}`}>
                <Button variant="secondary" className="w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 border-0">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  View Block Chain
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
