import { z } from "zod";

// Client schema  
export const insertClientSchema = z.object({
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF deve estar no formato 000.000.000-00"),
  nome: z.string().min(1, "Nome é obrigatório"),
  telefone: z.string().min(10, "Telefone é obrigatório"),
  email: z.string().email("Email deve ser válido"),
  nascimento: z.string().min(1, "Data de nascimento é obrigatória"),
  carimbosAtuais: z.number().default(0),
  ultimaCompra: z.string().optional(),
});

export type InsertClient = z.infer<typeof insertClientSchema>;

export interface Client extends InsertClient {
  id: string;
}

// Purchase schema
export const insertPurchaseSchema = z.object({
  cpfCliente: z.string(),
  valorCompra: z.number().positive("Valor deve ser positivo"),
  carimbosGerados: z.number(),
  data: z.string(),
});

export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;

export interface Purchase extends InsertPurchase {
  id: string;
}

// Coupon schema
export const insertCouponSchema = z.object({
  clienteCpf: z.string(),
  valorDesconto: z.number().default(0.15),
  usado: z.boolean().default(false),
  criadoEm: z.string(),
  validoAte: z.string(),
});

export type InsertCoupon = z.infer<typeof insertCouponSchema>;

export interface Coupon extends InsertCoupon {
  id: string;
}
