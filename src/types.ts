export interface BakeProduct {
  name: string;
  size: string;
  price: number;
}

export interface OrderLine {
  id: string; // Unique identifier for each line item in the cart
  product: BakeProduct;
  quantity: number;
  extraNori: number;
  total: number;
}

export interface OrderDetails {
  customerName: string;
  contactNumber: string;
  deliveryDate: string;
}

export interface ReceiptData {
  orderNumber: string;
  customerName: string;
  contactNumber: string;
  deliveryDate: string;
  items: Array<{
    name: string;
    size: string;
    price: number;
    quantity: number;
    extraNori: number;
    total: number;
  }>;
  subtotal: number;
  freeNori: number;
  extraNoriCount: number;
  extraNoriTotal: number;
  total: number;
}
