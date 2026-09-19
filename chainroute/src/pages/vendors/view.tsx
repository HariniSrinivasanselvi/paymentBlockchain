import { useGetVendor, useListTransfers } from "@workspace/api-client-react";
import { formatMoney, formatDate } from "@/lib/utils";
import { useRoute, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Store, Mail, Phone, ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function VendorView() {
  const [, params] = useRoute("/vendors/:id");
  const id = parseInt(params?.id || "0", 10);
  
  const { data: vendor, isLoading: vendorLoading } = useGetVendor(id, {
    query: {
      enabled: !!id,
      queryKey: ["vendor", id]
    }
  });

  const { data: transfers, isLoading: transfersLoading } = useListTransfers({
    query: {
      queryKey: ["transfers"]
    }
  });

  // Client-side filter for vendor's transfers
  const vendorTransfers = transfers?.filter(t => t.vendorId === id) || [];

  if (vendorLoading || !vendor) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <Link href="/vendors">
        <Button variant="ghost" size="sm" className="-ml-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Vendors
        </Button>
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{vendor.businessName}</h1>
            {vendor.status === "ACTIVE" ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="secondary">{vendor.status}</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {vendor.vendorCode} • Joined {formatDate(vendor.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">Email Address</div>
                <div className="text-sm text-muted-foreground">{vendor.email}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">Phone Number</div>
                <div className="text-sm text-muted-foreground">{vendor.phone}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Store className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium">Razorpay Linked Account</div>
                <div className="text-sm text-muted-foreground font-mono">
                  {vendor.razorpayAccountId || "Not Linked"}
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="text-sm font-medium">Total Received</div>
              <div className="text-2xl font-bold text-primary">{formatMoney(vendor.totalReceived)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>Transfer History</CardTitle>
            <CardDescription>Payouts routed to this vendor</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {transfersLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading transfers...</div>
            ) : vendorTransfers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No transfers recorded.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Transfer ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorTransfers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="pl-6 font-mono text-xs">
                        {t.razorpayTransferId || `Simulated (${t.id})`}
                      </TableCell>
                      <TableCell className="font-medium">{formatMoney(t.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === "PROCESSED" ? "success" : t.status === "FAILED" ? "destructive" : "secondary"}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(t.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
