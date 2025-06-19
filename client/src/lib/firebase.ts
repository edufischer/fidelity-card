import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, query, where, orderBy, serverTimestamp, Timestamp } from "firebase/firestore";
import type { Client, Purchase, Coupon } from "@shared/schema";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Collections
export const clientsCollection = collection(db, 'clientes');
export const purchasesCollection = collection(db, 'compras');
export const couponsCollection = collection(db, 'cupons');

// Auth functions
export const adminLogin = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const adminLogout = async () => {
  return await signOut(auth);
};

// Client functions
export const createClient = async (clientData: Omit<Client, 'id'>) => {
  const clientRef = doc(clientsCollection, clientData.cpf);
  await setDoc(clientRef, {
    ...clientData,
    ultimaCompra: serverTimestamp(),
  });
  return { id: clientData.cpf, ...clientData };
};

export const getClient = async (cpf: string): Promise<Client | null> => {
  try {
    // Clean and format CPF
    const cpfLimpo = cpf.replace(/\D/g, '');

    console.log("CPF digitado:", cpf);
    console.log("CPF formatado:", cpfLimpo);

    // Try direct document lookup first (assuming CPF is used as document ID)
    const clientRef = doc(clientsCollection, cpf);
    const clientSnap = await getDoc(clientRef);

    if (clientSnap.exists()) {
      const data = clientSnap.data();
      const result = {
        id: clientSnap.id,
        ...data,
        ultimaCompra: data.ultimaCompra?.toDate?.()?.toISOString() || data.ultimaCompra,
      } as Client;
      console.log("Cliente encontrado (doc lookup):", result);
      return result;
    }

    // If not found, try query search
    const q = query(clientsCollection, where("cpf", "==", cpf));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      const result = {
        id: doc.id,
        ...data,
        ultimaCompra: data.ultimaCompra?.toDate?.()?.toISOString() || data.ultimaCompra,
      } as Client;
      console.log("Cliente encontrado (query):", result);
      return result;
    }

    // Try with formatted CPF if original was unformatted
    if (cpfLimpo.length === 11 && !cpf.includes('.')) {
      const cpfFormatado = cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      const formattedRef = doc(clientsCollection, cpfFormatado);
      const formattedSnap = await getDoc(formattedRef);

      if (formattedSnap.exists()) {
        const data = formattedSnap.data();
        const result = {
          id: formattedSnap.id,
          ...data,
          ultimaCompra: data.ultimaCompra?.toDate?.()?.toISOString() || data.ultimaCompra,
        } as Client;
        console.log("Cliente encontrado (formatado):", result);
        return result;
      }
    }

    console.log("Cliente não encontrado");
    return null;
  } catch (error) {
    console.error("Erro ao consultar cliente:", error);
    throw error;
  }
};

export const getAllClients = async (): Promise<Client[]> => {
  const querySnapshot = await getDocs(clientsCollection);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    ultimaCompra: doc.data().ultimaCompra?.toDate?.()?.toISOString() || doc.data().ultimaCompra,
  } as Client));
};

export const searchClientsByName = async (searchTerm: string): Promise<Client[]> => {
  if (!searchTerm.trim()) return [];

  const clients = await getAllClients();
  return clients.filter(client =>
    client.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10);
};

export const updateClient = async (cpf: string, updates: Partial<Client>) => {
  const clientRef = doc(clientsCollection, cpf);
  await updateDoc(clientRef, {
    ...updates,
    ultimaCompra: serverTimestamp(),
  });
};

// Purchase functions
export const createPurchase = async (purchaseData: Omit<Purchase, 'id'>) => {
  const purchaseRef = doc(purchasesCollection);
  await setDoc(purchaseRef, {
    ...purchaseData,
    data: serverTimestamp(),
  });

  // Update client stamps
  const client = await getClient(purchaseData.cpfCliente);
  if (client) {
    const newStamps = client.carimbosAtuais + purchaseData.carimbosGerados;

    // Generate coupon if 10+ stamps
    if (newStamps >= 10) {
      await gerarCupom(purchaseData.cpfCliente);
      // Reset stamps to 0 after generating coupon
      await updateClient(purchaseData.cpfCliente, { carimbosAtuais: 0 });

      // Return special flag to show success message
      return {
        id: purchaseRef.id,
        ...purchaseData,
        couponGenerated: true
      };
    } else {
      // Just update stamps normally
      await updateClient(purchaseData.cpfCliente, { carimbosAtuais: newStamps });
    }
  }

  return { id: purchaseRef.id, ...purchaseData };
};

export const getPurchasesByClient = async (cpf: string): Promise<Purchase[]> => {
  try {
    const q = query(purchasesCollection, where("cpfCliente", "==", cpf), orderBy("data", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      data: doc.data().data?.toDate?.()?.toISOString() || doc.data().data,
    } as Purchase));
  } catch (error) {
    console.error("Erro ao buscar compras do cliente:", error);
    // Fallback: simple query without orderBy
    const q = query(purchasesCollection, where("cpfCliente", "==", cpf));
    const querySnapshot = await getDocs(q);
    const purchases = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      data: doc.data().data?.toDate?.()?.toISOString() || doc.data().data,
    } as Purchase));
    // Sort manually
    return purchases.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }
};

export const getAllPurchases = async (): Promise<Purchase[]> => {
  const q = query(purchasesCollection, orderBy("data", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    data: doc.data().data?.toDate?.()?.toISOString() || doc.data().data,
  } as Purchase));
};

// Coupon functions
export const createCoupon = async (couponData: Omit<Coupon, 'id'>) => {
  const couponRef = doc(couponsCollection);
  await setDoc(couponRef, couponData);
  return { id: couponRef.id, ...couponData };
};

export const gerarCupom = async (clienteCpf: string) => {
  const validityDate = new Date();
  validityDate.setDate(validityDate.getDate() + 30); // 30 days validity

  const couponData = {
    clienteCpf,
    valorDesconto: 0.15,
    usado: false,
    criadoEm: new Date().toISOString(),
    validoAte: validityDate.toISOString(),
  };

  const couponRef = doc(couponsCollection);
  await setDoc(couponRef, couponData);
  return { id: couponRef.id, ...couponData };
};

export const getCouponsByClient = async (cpf: string): Promise<Coupon[]> => {
  try {
    const q = query(couponsCollection, where("clienteCpf", "==", cpf), orderBy("criadoEm", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Coupon));
  } catch (error) {
    console.error("Erro ao buscar cupons:", error);
    // Fallback: simple query without orderBy
    const q = query(couponsCollection, where("clienteCpf", "==", cpf));
    const querySnapshot = await getDocs(q);
    const coupons = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Coupon));
    // Sort manually
    return coupons.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  }
};

export const getAllCoupons = async (): Promise<Coupon[]> => {
  try {
    const q = query(couponsCollection, orderBy("criadoEm", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Coupon));
  } catch (error) {
    console.error("Erro ao buscar todos os cupons:", error);
    // Fallback: simple query without orderBy
    const querySnapshot = await getDocs(couponsCollection);
    const coupons = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Coupon));
    // Sort manually
    return coupons.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
  }
};

export const useCoupon = async (couponId: string) => {
  const couponRef = doc(couponsCollection, couponId);
  await updateDoc(couponRef, { usado: true });
};

// Utility functions
export const generateCouponCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'SIX15-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const calculateStamps = (amount: number): number => {
  return Math.floor(amount / 150);
};

export const formatCPF = (cpf: string): string => {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.length === 11;
};
