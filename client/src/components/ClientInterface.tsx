import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InputCPF } from "@/components/ui/input-cpf";
import {
  IdCard,
  Search,
  Stamp,
  Ticket,
  History,
  Check,
  Clock,
} from "lucide-react";
import {
  getClient,
  getCouponsByClient,
  getPurchasesByClient,
  validateCPF,
} from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Client, Purchase, Coupon } from "@shared/schema";

export default function ClientInterface() {
  const [cpf, setCpf] = useState("");
  const [client, setClient] = useState<Client | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCPF(cpf)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, digite um CPF válido.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      // First, try to get the client
      const clientData = await getClient(cpf);

      if (clientData) {
        setClient(clientData);

        // Try to get coupons and purchases, but don't fail if they error
        try {
          const couponsData = await getCouponsByClient(cpf);
          setCoupons(couponsData);
        } catch (couponError) {
          console.warn("Erro ao buscar cupons (ignorado):", couponError);
          setCoupons([]);
        }

        try {
          const purchasesData = await getPurchasesByClient(cpf);
          setPurchases(purchasesData.slice(0, 5)); // Show last 5 purchases
        } catch (purchaseError) {
          console.warn("Erro ao buscar compras (ignorado):", purchaseError);
          setPurchases([]);
        }

        toast({
          title: "Cliente encontrado!",
        });
      } else {
        setClient(null);
        setCoupons([]);
        setPurchases([]);
        toast({
          title: "Cliente não encontrado",
          description: "Verifique o CPF digitado.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erro na consulta principal:", error);
      setClient(null);
      setCoupons([]);
      setPurchases([]);
      toast({
        title: "Erro na consulta",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStampVisual = (current: number, total: number = 10) => {
    const stamps = [];
    for (let i = 0; i < total; i++) {
      stamps.push(
        <div
          key={i}
          className={`w-8 h-8 rounded-full flex items-center justify-center ${i < current ? "bg-gold-500 text-black" : "bg-gray-200"
            }`}
        >
          {i < current && <Check className="h-3 w-3" />}
        </div>,
      );
    }
    return stamps;
  };

  const getActiveCoupon = () => {
    return coupons.find((coupon) => {
      const isValid = !coupon.usado;
      const notExpired = new Date(coupon.validoAte) > new Date();
      return isValid && notExpired;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Consulte sua Fidelidade
          </h1>
          <p className="text-gray-600">
            Digite seu CPF para ver seus carimbos e cupons
          </p>
        </div>

        {/* CPF Search Form */}
        <div className="max-w-md mx-auto mb-8">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSearch}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <IdCard className="inline h-4 w-4 mr-2 text-gold-500" />
                    CPF
                  </label>
                  <InputCPF
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    className="w-full"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gold-500 hover:bg-gold-600 text-white font-semibold"
                  disabled={loading}
                >
                  <Search className="h-4 w-4 mr-2" />
                  {loading ? "Consultando..." : "Consultar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        {searched && !loading && (
          <>
            {client ? (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Stamps Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Seus Carimbos</span>
                        <Stamp className="h-5 w-5 text-gold-500" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-gold-500 mb-2">
                          {client.carimbosAtuais}
                        </div>
                        <p className="text-gray-600 mb-4">de 10 carimbos</p>

                        {/* Stamp Progress Visual */}
                        <div className="grid grid-cols-5 gap-2 mb-4">
                          {renderStampVisual(client.carimbosAtuais)}
                        </div>

                        <div className="bg-gray-100 rounded-lg p-3">
                          <p className="text-sm text-gray-600">
                            Próximo desconto em{" "}
                            <strong>
                              {10 - client.carimbosAtuais} carimbos
                            </strong>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Coupons Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Seus Cupons</span>
                        <Ticket className="h-5 w-5 text-gold-500" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const activeCoupons = coupons.filter(coupon => {
                          const isValid = !coupon.usado;
                          const notExpired = new Date(coupon.validoAte) > new Date();
                          return isValid && notExpired;
                        });

                        return activeCoupons.length > 0 ? (
                          <div className="space-y-3">
                            {activeCoupons.map((coupon) => {
                              const daysLeft = Math.ceil((new Date(coupon.validoAte).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                              const isExpiring = daysLeft <= 3; // Show warning if expiring in 3 days or less

                              return (
                                <div key={coupon.id} className="border-2 border-dashed border-gold-500 rounded-lg p-4 bg-gold-50">
                                  <div className="text-center">
                                    <div className="text-xl font-bold text-gold-600 mb-1">
                                      {(coupon.valorDesconto * 100).toFixed(0)}% OFF
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">
                                      Desconto disponível
                                    </p>
                                    <div className="flex items-center justify-center text-sm text-gray-500 mb-2">
                                      <Clock className="h-4 w-4 mr-1" />
                                      <span>
                                        Válido até {new Date(coupon.validoAte).toLocaleDateString("pt-BR")}
                                      </span>
                                    </div>
                                    <div className={`text-xs mb-3 font-medium ${isExpiring ? 'text-red-600' : 'text-gray-600'}`}>
                                      {daysLeft > 0 ? (
                                        daysLeft === 1 ? 'Expira amanhã!' : `Faltam ${daysLeft} dias`
                                      ) : (
                                        'Expira hoje!'
                                      )}
                                    </div>
                                    <Badge className={`${isExpiring ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                                      <Check className="h-3 w-3 mr-1" />
                                      {isExpiring ? 'Expirando' : 'Válido'}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">
                              Nenhum cupom disponível
                            </p>
                            <p className="text-xs text-gray-400">
                              Complete 10 carimbos para ganhar um desconto!
                            </p>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Purchases */}
                {purchases.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <History className="h-5 w-5 mr-2 text-gold-500" />
                        Últimas Compras
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {purchases.map((purchase) => (
                          <div
                            key={purchase.id}
                            className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {new Date(purchase.data).toLocaleDateString(
                                  "pt-BR",
                                )}
                              </p>
                              <p className="text-sm text-gray-500">
                                {purchase.carimbosGerados} carimbos ganhos
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                R$ {purchase.valorCompra.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <IdCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-lg">
                    Cliente não encontrado
                  </p>
                  <p className="text-gray-400 text-sm">
                    Verifique se o CPF foi digitado corretamente
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
