import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Stamp, Phone, Mail, Calendar, History, Ticket } from "lucide-react";
import { getPurchasesByClient, getCouponsByClient } from "@/lib/firebase";
import type { Client, Purchase, Coupon } from "@shared/schema";

interface ClientDetailsModalProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ClientDetailsModal({ client, open, onOpenChange }: ClientDetailsModalProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (client && open) {
      loadClientData();
    }
  }, [client, open]);

  const loadClientData = async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      const [purchasesData, couponsData] = await Promise.all([
        getPurchasesByClient(client.cpf),
        getCouponsByClient(client.cpf),
      ]);
      setPurchases(purchasesData);
      setCoupons(couponsData);
    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Stamp className="h-6 w-6 mr-2 text-gold-500" />
            Detalhes do Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">CPF</p>
                <p className="font-medium">{client.cpf}</p>
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-gold-500" />
                <div>
                  <p className="text-sm text-gray-500">Telefone</p>
                  <p className="font-medium">{client.telefone}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-gold-500" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{client.email}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gold-500" />
                <div>
                  <p className="text-sm text-gray-500">Data de Nascimento</p>
                  <p className="font-medium">
                    {new Date(client.nascimento).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="text-center">
                <Badge variant="secondary" className="bg-gold-100 text-gold-800 text-lg px-4 py-2">
                  <Stamp className="h-4 w-4 mr-2" />
                  {client.carimbosAtuais} Carimbos
                </Badge>
                <p className="text-sm text-gray-500 mt-2">
                  Última compra: {client.ultimaCompra ? new Date(client.ultimaCompra).toLocaleDateString('pt-BR') : 'Nunca'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Coupons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Ticket className="h-5 w-5 mr-2 text-gold-500" />
                Cupons ({coupons.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-500">Carregando...</p>
              ) : coupons.length > 0 ? (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {coupons.map((coupon) => (
                    <div key={coupon.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gold-600">{(coupon.valorDesconto * 100).toFixed(0)}% OFF</p>
                          <p className="text-xs text-gray-500">
                            Criado em {new Date(coupon.criadoEm).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-gray-500">
                            Válido até {new Date(coupon.validoAte).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge 
                          variant={!coupon.usado ? "default" : "secondary"}
                          className={!coupon.usado ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                        >
                          {coupon.usado ? "Usado" : "Ativo"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhum cupom gerado</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Purchase History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <History className="h-5 w-5 mr-2 text-gold-500" />
              Histórico de Compras ({purchases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500">Carregando...</p>
            ) : purchases.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {purchases.map((purchase) => (
                  <div key={purchase.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium">
                        {new Date(purchase.data).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-sm text-gray-600">
                        +{purchase.carimbosGerados} carimbos
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">R$ {purchase.valorCompra.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhuma compra registrada</p>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}