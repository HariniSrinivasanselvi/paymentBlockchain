import { useGetBlockchainTransaction, useTamperBlockchainBlock, useVerifyBlockchain } from "@workspace/api-client-react";
import { formatHash, formatDate } from "@/lib/utils";
import { useRoute, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertOctagon, ShieldCheck, Link as LinkIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/query-client";

export default function BlockchainView() {
  const [, params] = useRoute("/blockchain/:transactionId");
  const transactionId = params?.transactionId || "";
  const { hasRole } = useAuth();
  const { toast } = useToast();
  
  const { data: chain, isLoading } = useGetBlockchainTransaction(transactionId, {
    query: {
      enabled: !!transactionId,
      queryKey: ["chain", transactionId]
    }
  });

  const tamperMutation = useTamperBlockchainBlock();
  
  const handleTamper = (blockIndex: number) => {
    if (confirm("Are you sure you want to simulate tampering with this block? This will permanently break the hash chain.")) {
      tamperMutation.mutate(
        { data: { blockIndex } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chain", transactionId] });
            queryClient.invalidateQueries({ queryKey: ["/api/blockchain"] });
            toast({
              title: "Block Tampered",
              description: "The block's amount was altered without updating hashes. Run verify to detect.",
              variant: "destructive"
            });
          }
        }
      );
    }
  };

  if (isLoading || !chain) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <Link href="/blockchain">
        <Button variant="ghost" size="sm" className="-ml-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Full Ledger
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transaction Trace</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">Ref: {transactionId}</p>
      </div>

      <div className="relative pt-8 pb-8">
        <div className="absolute left-[2.25rem] top-12 bottom-12 w-1 bg-border z-0" />
        
        <div className="space-y-12 relative z-10">
          {chain.map((block, i) => (
            <div key={block.id} className="flex gap-6">
              <div className="w-20 shrink-0 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-md z-10">
                  {i + 1}
                </div>
                <div className="text-xs font-bold text-muted-foreground mt-2">
                  BLK #{block.blockIndex}
                </div>
              </div>
              
              <Card className={`flex-1 ${block.tampered ? 'border-destructive shadow-sm' : ''}`}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      {block.eventType}
                      {block.tampered && <Badge variant="destructive" className="ml-2 text-xs">TAMPERED</Badge>}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-1 font-mono">
                      {formatDate(block.timestamp)}
                    </div>
                  </div>
                  {hasRole(["ADMIN"]) && !block.tampered && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
                      onClick={() => handleTamper(block.blockIndex)}
                      disabled={tamperMutation.isPending}
                    >
                      <AlertOctagon className="h-4 w-4 mr-1" />
                      Simulate Tamper
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-4 rounded-md space-y-3 font-mono text-xs">
                    <div>
                      <span className="text-muted-foreground font-semibold inline-block w-24">PREV_HASH</span>
                      <span className="text-foreground/80 break-all">{block.previousHash === "0" ? "GENESIS" : block.previousHash}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-semibold inline-block w-24">PAYLOAD</span>
                      <span className="text-foreground/80 break-all">{block.payloadHash}</span>
                    </div>
                    <div className="pt-2 border-t border-border/50">
                      <span className="text-muted-foreground font-semibold inline-block w-24">BLOCK_HASH</span>
                      <span className={`break-all ${block.tampered ? 'text-destructive font-bold' : 'text-primary font-bold'}`}>
                        {block.currentHash}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
