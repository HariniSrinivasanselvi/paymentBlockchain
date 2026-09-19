import { useListBlockchainBlocks, useVerifyBlockchain } from "@workspace/api-client-react";
import { formatHash, formatDate } from "@/lib/utils";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Link as LinkIcon, AlertTriangle, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BlockchainList() {
  const { data: blocks, isLoading } = useListBlockchainBlocks();
  const verifyMutation = useVerifyBlockchain();
  const { toast } = useToast();

  const handleVerify = () => {
    verifyMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result.valid) {
          toast({
            title: "Ledger Verified",
            description: `All ${result.totalBlocks} blocks are valid and cryptographic hashes match.`,
            className: "bg-success text-success-foreground"
          });
        } else {
          toast({
            title: "Ledger Integrity Violation",
            description: `${result.invalidBlocks.length} invalid blocks detected. Hashes have been tampered.`,
            variant: "destructive"
          });
        }
      }
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Audit Ledger</h1>
          <p className="text-muted-foreground mt-1">Cryptographically secure, hash-linked transaction chain</p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            size="lg" 
            className="shadow-md bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" 
            onClick={handleVerify}
            disabled={verifyMutation.isPending}
          >
            {verifyMutation.isPending ? (
              <span className="flex items-center"><PlayCircle className="h-5 w-5 mr-2 animate-spin" /> Verifying...</span>
            ) : (
              <span className="flex items-center"><ShieldCheck className="h-5 w-5 mr-2" /> Verify Ledger Integrity</span>
            )}
          </Button>
        </div>
      </div>

      {verifyMutation.data && !verifyMutation.data.valid && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-lg">Integrity Violation Detected</h3>
            <p className="text-sm mt-1">
              The ledger has been compromised. {verifyMutation.data.invalidBlocks.length} blocks failed hash verification.
            </p>
          </div>
        </div>
      )}

      {verifyMutation.data && verifyMutation.data.valid && (
        <div className="bg-success/10 border border-success text-success p-4 rounded-lg flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-lg">Ledger Valid</h3>
            <p className="text-sm mt-1">
              All {verifyMutation.data.totalBlocks} blocks cryptographically verified successfully.
            </p>
          </div>
        </div>
      )}

      <div className="relative pt-4">
        {/* The connecting line for the chain */}
        <div className="absolute left-[29px] top-8 bottom-8 w-1 bg-border rounded-full z-0" />

        {isLoading ? (
          <div className="pl-16 text-muted-foreground">Loading blocks...</div>
        ) : !blocks?.length ? (
          <div className="pl-16 text-muted-foreground">No blocks in ledger.</div>
        ) : (
          <div className="space-y-6 relative z-10">
            {blocks.map((block) => (
              <div key={block.id} className="flex items-start gap-6 group">
                <div className="w-14 h-14 bg-card border-4 border-background rounded-xl shadow-sm flex items-center justify-center font-bold text-lg text-primary shrink-0 relative">
                  {block.blockIndex}
                  {block.tampered && (
                    <div className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs">
                      !
                    </div>
                  )}
                </div>
                
                <div className={`flex-1 border rounded-xl p-5 shadow-sm transition-shadow hover:shadow-md bg-card ${block.tampered ? 'border-destructive' : 'border-border'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <LinkIcon className={`h-5 w-5 ${block.tampered ? 'text-destructive' : 'text-primary'}`} />
                      <span className="font-bold text-lg">{block.eventType}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-xs">{formatDate(block.timestamp)}</Badge>
                      <Link href={`/blockchain/${block.transactionId}`}>
                        <Button variant="secondary" size="sm">Trace Transaction</Button>
                      </Link>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-lg border">
                    <div>
                      <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Previous Hash</div>
                      <div className="font-mono text-xs text-foreground/80 break-all">
                        {block.previousHash === "0" ? "GENESIS" : block.previousHash}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Current Hash</div>
                      <div className={`font-mono text-xs break-all ${block.tampered ? 'text-destructive font-bold' : 'text-foreground'}`}>
                        {block.currentHash}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
