import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InputCPF } from "@/components/ui/input-cpf";
import { InputCurrency } from "@/components/ui/input-currency";
import ClientAutocomplete from "@/components/ClientAutocomplete";
import ClientDetailsModal from "@/components/ClientDetailsModal";
import EditClientModal from "@/components/EditClientModal";
import { UserPlus, ShoppingCart, BarChart3, Users, Ticket, ShoppingBag, LogOut, Stamp, Eye, Edit } from "lucide-react";
import {
  adminLogout,
  createClient,
  createPurchase,
  getAllClients,
  getAllPurchases,
  getAllCoupons,
  useCoupon,
  calculateStamps,
  formatCPF,
  validateCPF
} from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Client, Purchase, Coupon } from "@shared/schema";

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [cpfFilter, setCpfFilter] = useState("");
  const { toast } = useToast();

  // Form states
  const [newClient, setNewClient] = useState({
    cpf: "",
    nome: "",
    telefone: "",
    email: "",
    nascimento: "",
  });

  const [newPurchase, setNewPurchase] = useState({
    clientName: "",
    cpfCliente: "",
    valorCompra: "",
  });

  // Modal states
  const [detailsModal, setDetailsModal] = useState<{
    open: boolean;
    client: Client | null;
  }>({ open: false, client: null });

  const [editModal, setEditModal] = useState<{
    open: boolean;
    client: Client | null;
  }>({ open: false, client: null });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load clients and purchases (essential)
      const [clientsData, purchasesData] = await Promise.all([
        getAllClients(),
        getAllPurchases(),
      ]);
      setClients(clientsData);
      setPurchases(purchasesData);

      // Load coupons separately with error handling
      try {
        const couponsData = await getAllCoupons();
        setCoupons(couponsData);
      } catch (couponError) {
        console.warn("Erro ao carregar cupons (ignorado):", couponError);
        setCoupons([]);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await adminLogout();
      toast({
        title: "Logout realizado com sucesso!",
      });
      onLogout();
    } catch (error: any) {
      toast({
        title: "Erro no logout",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCPF(newClient.cpf)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, digite um CPF válido.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createClient({
        ...newClient,
        carimbosAtuais: 0,
        ultimaCompra: new Date().toISOString(),
      });

      toast({
        title: "Cliente cadastrado com sucesso!",
      });

      setNewClient({ cpf: "", nome: "", telefone: "", email: "", nascimento: "" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    // Parse currency value
    const currencyValue = newPurchase.valorCompra.replace(/[^\d,]/g, '').replace(',', '.');
    const amount = parseFloat(currencyValue);

    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, digite um valor válido.",
        variant: "destructive",
      });
      return;
    }

    if (!newPurchase.cpfCliente || !validateCPF(newPurchase.cpfCliente)) {
      toast({
        title: "Cliente não selecionado",
        description: "Por favor, selecione um cliente válido.",
        variant: "destructive",
      });
      return;
    }

    try {
      const stamps = calculateStamps(amount);
      const result = await createPurchase({
        cpfCliente: newPurchase.cpfCliente,
        valorCompra: amount,
        carimbosGerados: stamps,
        data: new Date().toISOString(),
      });

      if ((result as any).couponGenerated) {
        toast({
          title: "🎉 Cliente atingiu 10 carimbos! Cupom de 15% gerado.",
          description: `Compra registrada com ${stamps} carimbos.`,
        });
      } else {
        toast({
          title: "Compra registrada com sucesso!",
          description: `${stamps} carimbos gerados.`,
        });
      }

      setNewPurchase({ clientName: "", cpfCliente: "", valorCompra: "" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar compra",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleClientSelect = (client: Client) => {
    setNewPurchase(prev => ({
      ...prev,
      cpfCliente: client.cpf,
      clientName: client.nome || ""
    }));
  };

  const handleShowDetails = (client: Client) => {
    setDetailsModal({ open: true, client });
  };

  const handleEditClient = (client: Client) => {
    setEditModal({ open: true, client });
  };

  const handleUseCouponAction = async (couponId: string) => {
    try {
      await useCoupon(couponId);
      toast({
        title: "Cupom marcado como usado!",
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao usar cupom",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredCoupons = cpfFilter.trim()
    ? coupons.filter(coupon =>
      coupon.clienteCpf && coupon.clienteCpf.toLowerCase().includes(cpfFilter.toLowerCase())
    )
    : coupons;

  const getWeeklyCouponData = () => {
    const weeks = [];
    const now = new Date();

    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekCoupons = coupons.filter(coupon => {
        if (!coupon.criadoEm) return false;
        const couponDate = typeof coupon.criadoEm === 'string' ?
          new Date(coupon.criadoEm) :
          coupon.criadoEm.toDate?.() || new Date(coupon.criadoEm);
        return couponDate >= weekStart && couponDate <= weekEnd;
      }).length;

      weeks.push({
        week: `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`,
        coupons: weekCoupons
      });
    }

    return weeks.reverse();
  };

  const getMonthlyCouponData = () => {
    const months = [];
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

      const monthCoupons = coupons.filter(coupon => {
        if (!coupon.criadoEm) return false;
        const couponDate = typeof coupon.criadoEm === 'string' ?
          new Date(coupon.criadoEm) :
          coupon.criadoEm.toDate?.() || new Date(coupon.criadoEm);
        return couponDate.getMonth() === monthDate.getMonth() &&
          couponDate.getFullYear() === monthDate.getFullYear();
      }).length;

      months.push({
        month: monthName,
        coupons: monthCoupons
      });
    }

    return months.reverse();
  };

  const handleUseCoupon = async (couponId: string) => {
    try {
      await useCoupon(couponId);
      toast({
        title: "Cupom usado com sucesso!",
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao usar cupom",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calculateStampsFromValue = (value: string) => {
    const currencyValue = value.replace(/[^\d,]/g, '').replace(',', '.');
    const amount = parseFloat(currencyValue);
    return isNaN(amount) ? 0 : calculateStamps(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gold-500"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Gerencie clientes e fidelidade</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="text-gray-600 hover:text-gray-800"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Register Client */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <UserPlus className="h-5 w-5 mr-2 text-gold-500" />
                Cadastrar Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegisterClient} className="space-y-4">
                <InputCPF
                  value={newClient.cpf}
                  onChange={(e) => setNewClient({ ...newClient, cpf: e.target.value })}
                  required
                />
                <Input
                  type="text"
                  placeholder="Nome completo"
                  value={newClient.nome}
                  onChange={(e) => setNewClient({ ...newClient, nome: e.target.value })}
                  required
                />
                <Input
                  type="tel"
                  placeholder="Telefone"
                  value={newClient.telefone}
                  onChange={(e) => setNewClient({ ...newClient, telefone: e.target.value })}
                  required
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  required
                />
                <Input
                  type="date"
                  value={newClient.nascimento}
                  onChange={(e) => setNewClient({ ...newClient, nascimento: e.target.value })}
                  required
                />
                <Button type="submit" className="w-full bg-gold-500 hover:bg-gold-600 text-white">
                  Cadastrar
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Record Purchase */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <ShoppingCart className="h-5 w-5 mr-2 text-gold-500" />
                Registrar Compra
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecordPurchase} className="space-y-4">
                <ClientAutocomplete
                  value={newPurchase.clientName}
                  onChange={(value) => setNewPurchase({ ...newPurchase, clientName: value })}
                  onClientSelect={handleClientSelect}
                  placeholder="Digite o nome do cliente..."
                />
                <InputCurrency
                  value={newPurchase.valorCompra}
                  onChange={(e) => setNewPurchase({ ...newPurchase, valorCompra: e.target.value })}
                  required
                />
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">R$ 150,00 = 1 carimbo</p>
                  <p className="text-sm font-medium text-gold-600">
                    Carimbos a gerar: {calculateStampsFromValue(newPurchase.valorCompra)}
                  </p>
                </div>
                <Button type="submit" className="w-full bg-gold-500 hover:bg-gold-600 text-white">
                  Registrar
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <BarChart3 className="h-5 w-5 mr-2 text-gold-500" />
                Estatísticas Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Clientes</span>
                <span className="font-semibold text-gray-900">{clients.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cupons Ativos</span>
                <span className="font-semibold text-green-600">
                  {coupons.filter(c => !c.usado).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Compras Hoje</span>
                <span className="font-semibold text-gold-600">
                  {purchases.filter(p => {
                    const today = new Date().toDateString();
                    const purchaseDate = new Date(p.data).toDateString();
                    return today === purchaseDate;
                  }).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Carimbos</span>
                <span className="font-semibold text-gray-900">
                  {clients.reduce((total, client) => total + client.carimbosAtuais, 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Card>
          <Tabs defaultValue="clients" className="w-full">
            <div className="border-b border-gray-200">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="clients" className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Clientes
                </TabsTrigger>
                <TabsTrigger value="purchases" className="flex items-center">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Compras
                </TabsTrigger>
                <TabsTrigger value="coupons" className="flex items-center">
                  <Ticket className="h-4 w-4 mr-2" />
                  Cupons
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="clients" className="p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Carimbos</TableHead>
                      <TableHead>Última Compra</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.nome}</TableCell>
                        <TableCell>{client.cpf}</TableCell>
                        <TableCell>{client.telefone}</TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-gold-100 text-gold-800">
                            <Stamp className="h-3 w-3 mr-1" />
                            {client.carimbosAtuais}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {client.ultimaCompra ? new Date(client.ultimaCompra).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleShowDetails(client)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditClient(client)}
                              title="Editar cliente"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="purchases" className="p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>CPF Cliente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Carimbos</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell>
                          {new Date(purchase.data).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="font-medium">{purchase.cpfCliente}</TableCell>
                        <TableCell className="font-semibold">
                          R$ {purchase.valorCompra.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-gold-100 text-gold-800">
                            +{purchase.carimbosGerados}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            Processado
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="coupons" className="p-6">
              <div className="space-y-4">
                {/* CPF Filter */}
                <div className="max-w-md">
                  <Label htmlFor="cpf-filter">Filtrar por CPF</Label>
                  <InputCPF
                    id="cpf-filter"
                    value={cpfFilter}
                    onChange={(e) => setCpfFilter(e.target.value)}
                    placeholder="Digite o CPF para filtrar..."
                  />
                </div>

                {/* Coupons Table - Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CPF</TableHead>
                        <TableHead>Data de Criação</TableHead>
                        <TableHead>Válido Até</TableHead>
                        <TableHead>Desconto</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCoupons.map((coupon) => (
                        <TableRow key={coupon.id}>
                          <TableCell className="font-medium">{coupon.clienteCpf || 'CPF não informado'}</TableCell>
                          <TableCell>
                            {coupon.criadoEm ?
                              (typeof coupon.criadoEm === 'string' ?
                                new Date(coupon.criadoEm).toLocaleDateString('pt-BR') :
                                coupon.criadoEm.toDate?.()?.toLocaleDateString('pt-BR') || 'Data inválida'
                              ) : 'Data inválida'
                            }
                          </TableCell>
                          <TableCell>
                            {coupon.validoAte ?
                              (typeof coupon.validoAte === 'string' ?
                                new Date(coupon.validoAte).toLocaleDateString('pt-BR') :
                                coupon.validoAte.toDate?.()?.toLocaleDateString('pt-BR') || 'Data inválida'
                              ) : 'Data inválida'
                            }
                          </TableCell>
                          <TableCell className="font-semibold">
                            {(coupon.valorDesconto * 100).toFixed(0)}%
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={coupon.usado ? "secondary" : "default"}
                              className={coupon.usado
                                ? "bg-gray-100 text-gray-800"
                                : "bg-green-100 text-green-800"
                              }
                            >
                              {coupon.usado ? "Usado" : "Ativo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {!coupon.usado && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUseCouponAction(coupon.id)}
                                className="text-gold-600 border-gold-600 hover:bg-gold-50"
                              >
                                Marcar como usado
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredCoupons.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            {cpfFilter.trim() ? "Nenhum cupom encontrado para este CPF" : "Nenhum cupom gerado ainda"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Coupons Cards - Mobile */}
                <div className="md:hidden space-y-4">
                  {filteredCoupons.map((coupon) => (
                    <Card key={coupon.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{coupon.clienteCpf || 'CPF não informado'}</span>
                          <Badge
                            variant={coupon.usado ? "secondary" : "default"}
                            className={coupon.usado
                              ? "bg-gray-100 text-gray-800"
                              : "bg-green-100 text-green-800"
                            }
                          >
                            {coupon.usado ? "Usado" : "Ativo"}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                          <p>Criado: {coupon.criadoEm ?
                            (typeof coupon.criadoEm === 'string' ?
                              new Date(coupon.criadoEm).toLocaleDateString('pt-BR') :
                              coupon.criadoEm.toDate?.()?.toLocaleDateString('pt-BR') || 'Data inválida'
                            ) : 'Data inválida'
                          }</p>
                          <p>Válido até: {coupon.validoAte ?
                            (typeof coupon.validoAte === 'string' ?
                              new Date(coupon.validoAte).toLocaleDateString('pt-BR') :
                              coupon.validoAte.toDate?.()?.toLocaleDateString('pt-BR') || 'Data inválida'
                            ) : 'Data inválida'
                          }</p>
                          <p className="font-semibold">Desconto: {(coupon.valorDesconto * 100).toFixed(0)}%</p>
                        </div>
                        {!coupon.usado && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUseCouponAction(coupon.id)}
                            className="w-full text-gold-600 border-gold-600 hover:bg-gold-50"
                          >
                            Marcar como usado
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {filteredCoupons.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {cpfFilter.trim() ? "Nenhum cupom encontrado para este CPF" : "Nenhum cupom gerado ainda"}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Modals */}
        <ClientDetailsModal
          client={detailsModal.client}
          open={detailsModal.open}
          onOpenChange={(open) => setDetailsModal({ open, client: detailsModal.client })}
        />

        <EditClientModal
          client={editModal.client}
          open={editModal.open}
          onOpenChange={(open) => setEditModal({ open, client: editModal.client })}
          onClientUpdated={loadData}
        />
      </div>
    </div>
  );
}
