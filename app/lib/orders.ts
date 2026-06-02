import { getFirestore } from "@/app/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const ORDERS_COLLECTION = "orders";

export interface PendingCartItem {
  resourceId: string;
  variantId: number;
  quantity: number;
  title: string;
  priceInCents: number;
}

export async function createPendingOrder(
  stripeSessionId: string,
  items: PendingCartItem[],
  printfulDraftOrderId: number,
  recipient: object,
): Promise<void> {
  const db = getFirestore();
  await db.collection(ORDERS_COLLECTION).doc(stripeSessionId).set({
    status: "pending",
    items,
    printfulDraftOrderId,
    recipient,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function getPendingOrder(stripeSessionId: string): Promise<{
  status: string;
  items: PendingCartItem[];
  printfulDraftOrderId?: number;
} | null> {
  const db = getFirestore();
  const doc = await db.collection(ORDERS_COLLECTION).doc(stripeSessionId).get();
  if (!doc.exists) return null;
  return doc.data() as {
    status: string;
    items: PendingCartItem[];
    printfulDraftOrderId?: number;
  };
}

export async function fulfillOrder(stripeSessionId: string, customerEmail?: string): Promise<void> {
  const db = getFirestore();
  const update: Record<string, unknown> = {
    status: "paid",
    paidAt: FieldValue.serverTimestamp(),
  };
  if (customerEmail) update.customerEmail = customerEmail;
  await db.collection(ORDERS_COLLECTION).doc(stripeSessionId).update(update);
}

export async function getOrderByPrintfulId(printfulOrderId: number): Promise<{
  status: string;
  items: PendingCartItem[];
  customerEmail?: string;
  printfulDraftOrderId?: number;
} | null> {
  const db = getFirestore();
  const snap = await db
    .collection(ORDERS_COLLECTION)
    .where("printfulDraftOrderId", "==", printfulOrderId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data() as {
    status: string;
    items: PendingCartItem[];
    customerEmail?: string;
    printfulDraftOrderId?: number;
  };
}
