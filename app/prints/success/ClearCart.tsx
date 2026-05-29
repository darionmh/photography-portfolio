"use client";

import { useEffect } from "react";
import { useCart } from "@/app/contexts/CartContext";

export default function ClearCart() {
  const { clearCart, hydrated } = useCart();
  useEffect(() => {
    if (hydrated) clearCart();
  }, [hydrated, clearCart]);
  return null;
}
