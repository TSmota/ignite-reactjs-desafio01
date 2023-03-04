import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const STORAGE_KEY = '@RocketShoes:cart';

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(STORAGE_KEY);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const checkStock = async (productId: number, amount: number) => {
    const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

    if (amount > stock.amount) {
      toast.error('Quantidade solicitada fora de estoque');
      return false;
    }

    return true;
  }

  const addProduct = async (productId: number) => {
    try {

      const productInCart = cart.find(product => product.id === productId);
      const newAmount = productInCart ? productInCart.amount + 1 : 1;

      if (productInCart) {
        await updateProductAmount({ productId, amount: newAmount });
        return;
      }

      const hasStock = await checkStock(productId, newAmount);

      if (!hasStock) {
        return;
      }

      const { data: product } = await api.get<Product>(`/products/${productId}`);

      const newCart = [...cart, { ...product, amount: newAmount }];
      setCart(newCart);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    const newCart = cart.filter(product => product.id !== productId);

    if (newCart.length !== cart.length) {
      setCart(newCart);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCart));
    } else {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const hasStock = await checkStock(productId, amount);

      if (!hasStock) {
        return;
      }

      const newCart = cart.map(product => ({
        ...product,
        amount: product.id === productId ? amount : product.amount,
      }));
      setCart(newCart);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCart));

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
