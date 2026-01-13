import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useData() {
  const [items, setItems] = useState([]);
  const [lists, setLists] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); 

  // --- BUSCA DADOS ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: dItems } = await supabase.from('items').select('*').order('name');
      const { data: dLists } = await supabase.from('lists').select('*').order('name');
      const { data: dProds } = await supabase.from('products').select('*');
      const { data: dCats } = await supabase.from('categories').select('*').order('sort_order');
      
      // Busca clientes apenas se estiver logado
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
          const { data: dCust } = await supabase.from('customers').select('*').order('last_order_date', { ascending: false });
          if (dCust) setCustomers(dCust);
      }

      if (dItems) setItems(dItems);
      if (dLists) setLists(dLists);
      if (dProds) setProducts(dProds);
      if (dCats) setCategories(dCats);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Verifica sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      fetchData();
    });

    // Escuta mudanças de login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if(session) fetchData(); 
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- AUTENTICAÇÃO ---
  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  // --- IMAGENS ---
  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
        };
      };
    });
  };

  const uploadImage = async (file) => {
    try {
      const blob = await compressImage(file);
      const fileName = `${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('menu-images').upload(fileName, blob);
      if (error) throw error;
      const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      alert("Erro upload: " + error.message);
      return null;
    }
  };

  // --- SALVAR DADOS GERAIS (Produtos, Itens, Listas) ---
  // --- SALVAR DADOS (SEPARANDO CRIAR DE EDITAR) ---
  const saveData = async (table, data) => {
    // Verifica se é edição (tem ID) ou criação (não tem ID)
    if (data.id) {
        // --- MODO EDIÇÃO (UPDATE) ---
        const { error } = await supabase
            .from(table)
            .update(data)
            .eq('id', data.id);
            
        if (error) {
            console.error("Erro ao atualizar:", error);
            alert("Erro ao atualizar item.");
            return false;
        }
    } else {
        // --- MODO CRIAÇÃO (INSERT) ---
        const payload = { ...data };
        delete payload.id; // Garante que não vai nenhum ID sujo (null, undefined, etc)
        
        const { error } = await supabase
            .from(table)
            .insert(payload);

        if (error) {
            console.error("Erro ao criar:", error);
            alert("Erro ao criar novo item.");
            return false;
        }
    }
    
    await fetchData(); // Recarrega a lista
    return true;
  };

  const deleteData = async (table, id) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) await fetchData();
  };

  // --- CLIENTES (CRM) - VERSÃO CORRIGIDA PARA EVITAR ERRO 409 ---
  const saveCustomer = async (customerData) => {
    // 1. Limpa o telefone
    const cleanPhone = customerData.phone.replace(/\D/g, '');
    
    // 2. Prepara os dados. 
    // IMPORTANTE: Não mandamos o ID, deixamos o Supabase decidir pelo telefone.
    const dataToSave = { 
        name: customerData.name,
        phone: cleanPhone,
        address_cep: customerData.address_cep,
        address_number: customerData.address_number,
        address_full: customerData.address_full,
        last_order_date: new Date() 
    };

    // 3. UPSERT INTELIGENTE
    // O parâmetro onConflict: 'phone' diz: "Se bater esse telefone, atualize o resto".
    const { data, error } = await supabase
        .from('customers')
        .upsert(dataToSave, { onConflict: 'phone' }) 
        .select();

    if (error) {
        console.error("Erro ao salvar cliente (CRM):", error.message);
    }
  };

 // --- BUSCA CLIENTE SEGURA (VIA RPC) ---
  const findCustomerByPhone = async (phone) => {
    // 1. Limpa o input
    const cleanPhone = phone.replace(/\D/g, '');

    // 2. Chama a função segura no banco de dados (RPC)
    // Em vez de .from('customers').select(), usamos .rpc
    const { data, error } = await supabase.rpc('get_customer_by_phone', { 
        phone_input: cleanPhone 
    });

    if (error) {
        
        return null;
    }

    // Como a função retorna uma lista (SETOF), pegamos o primeiro item se existir
    if (data && data.length > 0) {
        return data[0];
    }
    
    return null;
  };

  return { 
    items, lists, products, categories, customers, user, loading, 
    saveData, deleteData, uploadImage, saveCustomer, findCustomerByPhone, login, logout, refreshData: fetchData 
  };
}