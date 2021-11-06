import { createContext, ReactNode, useContext, useState } from 'react';
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

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  function updateStorage(_cart: Product[]) {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(_cart));
  };

  const addProduct = async (productId: number) => {
    try {
      let stock = await api.get<Stock>(`/stock/${productId}`).then(res => res.data);
      let product  = await api.get<Product>(`/products/${productId}`).then(res => res.data);

      if(product === undefined) {
        throw new Error("Produto não existe");
      };

      let needAdd = true;
      let _cart = cart.map((_product) => {
        if(_product.id === productId && stock.amount < _product.amount + 1) {
          needAdd = false;
          toast.error("Quantidade solicitada fora de estoque");
          throw new Error("Quantidade solicitada fora de estoque");
        } else if (_product.id === productId && stock.amount >= _product.amount + 1) {
          needAdd = false;
          return {
            ..._product,
            amount: _product.amount + 1
          };
        };

        return _product;
      });

      if(needAdd) {
        _cart = [ ..._cart, {
          ...product,
          amount: 1
        }];
      };

      setCart([ ..._cart ]);
      
      updateStorage(_cart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const _cart = cart.filter((product) => {
        if(product.id !== productId) {
          return product;
        };

        return false;
      });

      if(cart.length === _cart.length) {
        throw new Error("Produto não existe");
      };

      setCart([ ..._cart ]);

      updateStorage(_cart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return;
      };

      let stock = await api.get<Stock>(`/stock/${productId}`).then(res => res.data);

      let _cart = cart.map((_product) => {
        if(_product.id === productId && stock.amount < amount) {
          toast.error("Quantidade solicitada fora de estoque");
          throw new Error("Quantidade solicitada fora de estoque");
        } else if (_product.id === productId && stock.amount >= amount) {
          return {
            ..._product,
            amount: amount
          };
        };

        return _product;
      });


      setCart([ ..._cart ]);

      updateStorage(_cart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
      return;
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
