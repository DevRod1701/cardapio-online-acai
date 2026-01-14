import React, { useState } from 'react';
import { Star, Heart, Citrus, Plus, X, ShoppingBag, Trash2, Check, Lock, MapPin, Grid, Phone, Info, Loader2, IceCreamBowl } from 'lucide-react';
import { useData } from '../hooks/useData';
import ifoodLogo from '../assets/ifood.png';
import keetaLogo from '../assets/keeta.png'; // ou ketta.png (confira o nome do arquivo)
import ninenineLogo from '../assets/99.png';

// --- CONFIGURAÇÃO ---
const STORE_LOCATION = { lat: -23.49102257465869, lon: -46.49390912179673, address: "Vila Cisper, São Paulo" };
const MAX_RADIUS_KM = 3;
const EXCLUDED_CITIES = ['guarulhos'];
const BLOCKED_PREFIX = '03828';

export default function Menu({ onGoToAdmin }) {
  const { items: allItems, lists: allLists, products: allProducts, categories, saveCustomer, findCustomerByPhone, loading } = useData();

  // Estados UI
  const [cart, setCart] = useState([]);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [selectedToppings, setSelectedToppings] = useState([]); 

  // Estados Checkout
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loadingPhone, setLoadingPhone] = useState(false);
  const [cep, setCep] = useState('');
  const [num, setNum] = useState('');
  const [addressData, setAddressData] = useState(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [outOfRange, setOutOfRange] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  
  // --- LGPD ---
  const [saveDataConsent, setSaveDataConsent] = useState(true);

  // --- MÁSCARAS E HANDLERS ---
  const handleCashChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    value = (Number(value) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    setCashAmount(value);
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 11) value = value.slice(0, 11); 
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2'); 
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    setCustomerPhone(value);
  };

  // --- CARRINHO (SILENCIOSO) ---
  const addToCartDirectly = (prod) => {
    if(!prod.available) return;
    setCart([...cart, { id: Date.now(), name: prod.name, price: prod.price, details: '' }]);
    // Adiciona sem abrir modal
  };

  const addToCartExtra = (item) => {
    if(!item.available) return;
    setCart([...cart, { id: Date.now(), name: item.name, price: item.price, details: 'Adicional Avulso' }]);
    // Adiciona sem abrir modal
  };

  const removeFromCart = (id) => {
    const newCart = cart.filter(item => item.id !== id);
    setCart(newCart);
    if (!newCart.length) { setShowCart(false); setShowCheckout(false); }
  };

  // --- CUSTOMIZADOR ---
  const openCustomizer = (product) => {
    if(!product.available) return;
    setCurrentProduct(product);
    setSelectedToppings([]);
    setShowCustomizer(true);
  };

  const toggleTopping = (listId, item) => {
    const exists = selectedToppings.find(s => s.listId === listId && s.item.id === item.id);
    if(exists) setSelectedToppings(selectedToppings.filter(s => s !== exists));
    else setSelectedToppings([...selectedToppings, { listId, item }]);
  };

  const confirmCustomization = () => {
    let finalPrice = currentProduct.price;
    let detailsArray = [];
    if(currentProduct.list_ids) {
        currentProduct.list_ids.forEach(listId => {
            const list = allLists.find(l => l.id === listId);
            if(!list) return;
            const selections = selectedToppings.filter(s => s.listId === listId).map(s => s.item);
            let freeUsed = 0;
            selections.forEach(item => {
                let price = item.price;
                let label = item.name;
                if(item.free) {
                    if(freeUsed < list.max_free) { price = 0; freeUsed++; }
                    else label += ` (+R$${item.price.toFixed(2)})`;
                } else { label += ` (+R$${item.price.toFixed(2)})`; }
                finalPrice += price;
                detailsArray.push(label);
            });
        });
    }
    setCart([...cart, { id: Date.now(), name: currentProduct.name, price: finalPrice, details: detailsArray.join(', ') }]);
    
    setShowCustomizer(false);
  };

  // --- INTELIGÊNCIA: BUSCAR DADOS PELO TELEFONE ---
  const handlePhoneBlur = async () => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
        setLoadingPhone(true);
        const customer = await findCustomerByPhone(cleanPhone);
        setLoadingPhone(false);

        if (customer) {
            if (customer.name) setCustomerName(customer.name);
            if (customer.address_number) setNum(customer.address_number);
            if (customer.address_cep) {
                const maskedCep = customer.address_cep.replace(/^(\d{5})(\d)/, '$1-$2');
                setCep(maskedCep);
                handleCep({ target: { value: customer.address_cep } });
            }
        }
    }
  };

  // --- CEP & GEOLOCALIZAÇÃO ---
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    const straightKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return straightKm * 1.35; // Fator de correção de rota (35%)
  };

  const handleCep = async (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    let formattedValue = rawValue;
    if (rawValue.length > 5) formattedValue = rawValue.replace(/^(\d{5})(\d)/, '$1-$2');
    setCep(formattedValue);

    setOutOfRange(false); setAddressData(null); setDeliveryFee(0);

    if (rawValue.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://cep.awesomeapi.com.br/json/${rawValue}`);
        if (res.status !== 200) throw new Error("CEP Inválido");
        const data = await res.json();

        if (EXCLUDED_CITIES.includes(data.city.toLowerCase()) || rawValue.startsWith(BLOCKED_PREFIX)) {
            setAddressData({ logradouro: data.address, bairro: data.district, localidade: data.city });
            setOutOfRange(true); setLoadingCep(false); return;
        }

        const lat = parseFloat(data.lat);
        const lng = parseFloat(data.lng);
        const dist = calculateDistance(STORE_LOCATION.lat, STORE_LOCATION.lon, lat, lng);

        setAddressData({ logradouro: data.address, bairro: data.district, localidade: data.city });

        if (dist > MAX_RADIUS_KM) {
            setOutOfRange(true);
        } else {
            if (dist <= 1) setDeliveryFee(3.99); else if (dist <= 2) setDeliveryFee(4.99); else setDeliveryFee(5.99);
        }
      } catch (err) { 
          // Silencioso
      } finally { setLoadingCep(false); }
    }
  };

  const showTerms = (e) => {
      e.preventDefault();
      alert("TERMOS DE USO E PRIVACIDADE:\n\n1. Coletamos Nome, Telefone e Endereço para entrega.\n2. Seus dados facilitam pedidos futuros.\n3. Podemos enviar promoções via WhatsApp.\n4. Seus dados não são vendidos.\n5. Você pode pedir exclusão a qualquer momento.");
  };

  const sendWhatsApp = async () => {
    if (!customerName || !customerPhone || !num || !addressData || !paymentMethod || outOfRange) return alert("Preencha todos os campos!");
    
    if (saveDataConsent) {
        await saveCustomer({
            name: customerName,
            phone: customerPhone,
            address_cep: cep.replace(/\D/g, ''),
            address_number: num,
            address_full: `${addressData.logradouro}, ${addressData.bairro}`
        });
    }

    let msg = `*NOVO PEDIDO - AÇAÍ DO LUCCA*\n`;
     
    msg += `Cliente: ${customerName}\n`;
    msg += `Tel: ${customerPhone}\n`;
    msg += `End: ${addressData.logradouro}, ${num} - ${addressData.bairro}\n\n`;
    
    let totalItems = 0;
    cart.forEach((i, idx) => {
      msg += `${idx+1}. *${i.name}*\n${i.details ? `Obs: ${i.details}\n` : ''}R$ ${i.price.toFixed(2)}\n\n`;
      totalItems += i.price;
    });
    const totalOrder = totalItems + deliveryFee;
    msg += `----------------\nSubtotal: R$ ${totalItems.toFixed(2)}\nEntrega: R$ ${deliveryFee.toFixed(2)}\n*TOTAL: R$ ${totalOrder.toFixed(2)}*\nPagamento: ${paymentMethod}\n${cashAmount ? `Troco para: ${cashAmount}` : ''}`;
    
    window.open(`https://wa.me/5511988170539?text=${encodeURIComponent(msg)}`, '_blank');

    setShowCheckout(false); setShowCart(false); setCart([]);
    setCustomerName(''); setCustomerPhone(''); setCep(''); setNum(''); setPaymentMethod(''); setCashAmount('');
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-purple-600" size={40}/></div>;
  const cartTotal = cart.reduce((a,b)=>a+b.price,0);

  return (
    <div className="bg-gray-50 text-gray-800 min-h-screen pb-32 font-sans">
       <header className="bg-gradient-to-br from-violet-900 to-violet-600 text-white py-14 px-4 text-center rounded-b-[3.5rem] shadow-xl">
        <h1 className="text-4xl font-extrabold uppercase mb-1 tracking-tighter">Açaí do Lucca</h1>
        <p className="text-purple-100 opacity-90 font-medium">O melhor açaí da Vila Cisper</p>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-12">
        {categories.map(cat => {
            const prods = allProducts.filter(p => p.category === cat.name);
            if (!prods.length) return null;
            const isFeatured = cat.name.toLowerCase().includes('favoritos');
            return (
                <section key={cat.id}>
                    <div className="flex items-center mb-6 text-purple-900">
                        {isFeatured ? <Star className="w-5 h-5 mr-2 fill-yellow-400 text-yellow-400"/> : <Grid className="w-5 h-5 mr-2 text-purple-600"/>}
                        <h2 className="text-xl font-bold uppercase tracking-tight">{cat.name}</h2>
                    </div>
                    <div className={isFeatured ? 'grid md:grid-cols-2 gap-4' : 'space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4'}>
                        {prods.map(p => (
                            <div key={p.id} onClick={() => !p.available ? null : (p.list_ids?.length ? openCustomizer(p) : addToCartDirectly(p))} className={`bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 cursor-pointer transition-all active:scale-95 flex gap-4 ${!p.available ? 'opacity-60 grayscale' : ''}`}>
                                <div className="relative w-20 h-20 shrink-0">
                                    <img src={p.image} className="w-full h-full rounded-2xl object-cover bg-gray-100" />
                                    {!p.available && <span className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-2xl text-[10px] font-bold text-white">ESGOTADO</span>}
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                    <h3 className="font-bold text-gray-800 leading-tight">{p.name}</h3>
                                    {p.description && <p className="text-[10px] text-gray-400 leading-tight mt-1 line-clamp-2">{p.description}</p>}
                                    <div className="mt-2 flex justify-between items-center">
                                        <p className="text-purple-700 font-bold">R$ {p.price.toFixed(2)}</p>
                                        <button disabled={!p.available} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold ${!p.available ? 'bg-gray-100 text-gray-400' : 'bg-purple-600 text-white shadow-md'}`}>
                                            {p.list_ids?.length ? 'Montar' : 'Adicionar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )
        })}

        <section className="pb-10">
             <h2 className="text-center text-gray-400 text-xs italic mb-4">Adicionais Avulsos</h2>
             <div className="bg-white rounded-[2rem] card-shadow overflow-hidden border border-gray-100 divide-y divide-gray-50">
                {allItems.map(t => (
                    <div key={t.id} className={`p-4 flex justify-between items-center ${!t.available ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex items-center gap-3 text-left">
                            <img src={t.image} className="w-12 h-12 rounded-xl object-cover border border-gray-100" />
                            <div><p className="font-bold text-sm text-gray-700">{t.name}</p><p className="text-[10px] text-gray-400">{!t.available ? 'Indisponível' : `R$ ${t.price.toFixed(2)}`}</p></div>
                        </div>
                        <button disabled={!t.available} onClick={() => addToCartExtra(t)} className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center disabled:bg-gray-100 disabled:text-gray-400"><Plus size={16} /></button>
                    </div>
                ))}
             </div>
        </section>
      </main>

      <div className="text-gray-700 text-[10px] flex items-center justify-center gap-1 w-full"><IceCreamBowl className="text-purple-600" size={20} /> Açaí do Lucca ®  - Todos os Direitos Reservados - 2026</div>

      <footer className="text-center py-6 mb-20"><button onClick={onGoToAdmin} className="text-gray-300 text-[10px] flex items-center justify-center gap-1 w-full"><Lock size={10}/> Área do Gerente</button></footer>

      {/* --- CART BAR COM RESUMO VISÍVEL --- */}
      {cart.length > 0 && !showCart && !showCheckout && !showCustomizer && (
        <div 
            onClick={() => setShowCart(true)} 
            className="fixed bottom-6 left-4 right-4 bg-purple-900 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between z-50 cursor-pointer animate-in slide-in-from-bottom-4 duration-300"
        >
            <div className="flex items-center gap-3 overflow-hidden flex-1 mr-2">
                <div className="bg-white/20 p-2.5 rounded-full shrink-0">
                    <ShoppingBag size={20} className="text-white" />
                </div>
                
                <div className="flex flex-col overflow-hidden justify-center">
                    <p className="text-[10px] text-purple-200 truncate font-medium max-w-[150px] sm:max-w-xs leading-tight">
                        {cart.map(i => i.name).join(', ')}
                    </p>
                    <p className="font-bold text-lg leading-none mt-0.5">
                        R$ {cartTotal.toFixed(2)}
                    </p>
                </div>
            </div>

            <div className="bg-white text-purple-900 px-3 py-2 rounded-xl text-xs font-bold shrink-0 shadow-lg shadow-purple-900/50 flex items-center gap-1">
                Ver Carrinho
                <span className="bg-purple-600 text-white px-1.5 py-0.5 rounded-md text-[10px] ml-1">
                    {cart.length}
                </span>
            </div>
        </div>
      )}

      {/* --- CUSTOMIZER MODAL --- */}
      {showCustomizer && currentProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={() => setShowCustomizer(false)}>
           <div className="bg-white w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-[2.5rem] sm:rounded-[2rem] p-6 relative" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                <div><h2 className="text-2xl font-black uppercase text-gray-900">{currentProduct.name}</h2><p className="text-purple-600 font-bold">Base: R$ {currentProduct.price.toFixed(2)}</p></div>
                <button onClick={() => setShowCustomizer(false)} className="bg-gray-100 p-2 rounded-full text-gray-500"><X size={20}/></button>
             </div>
             <div className="space-y-8 mb-24">
                {currentProduct.list_ids?.map(listId => {
                    const list = allLists.find(l => l.id === listId);
                    if (!list) return null;
                    const listItems = allItems.filter(i => list.item_ids?.includes(i.id) && i.available);
                    const selectedInList = selectedToppings.filter(s => s.listId === listId);
                    const freeSelected = selectedInList.filter(s => s.item.free).length;
                    return (
                        <div key={list.id}>
                            <div className="flex justify-between items-center mb-3"><h4 className="font-bold uppercase text-sm text-gray-700">{list.name}</h4>{list.max_free > 0 && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-md font-bold">Até {list.max_free} Grátis</span>}</div>
                            <div className="space-y-2">
                                {listItems.map(item => {
                                    const isSelected = selectedInList.some(s => s.item.id === item.id);
                                    let priceLabel = `+ R$ ${item.price.toFixed(2)}`;
                                    let priceColor = "text-purple-600 font-bold";
                                    if(item.free) {
                                        if(isSelected) { priceLabel = "Selecionado"; priceColor = "text-green-700 font-bold"; }
                                        else if(freeSelected < list.max_free) { priceLabel = "Grátis"; priceColor = "text-green-600"; }
                                    }
                                    return (
                                        <label key={item.id} className={`flex items-center p-3 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' : 'border-gray-100 hover:bg-gray-50'}`}>
                                            <input type="checkbox" checked={isSelected} onChange={() => toggleTopping(list.id, item)} className="hidden" />
                                            <img src={item.image} className="w-10 h-10 rounded-lg mr-3 object-cover bg-gray-200"/>
                                            <div className="flex-1"><p className="font-bold text-sm text-gray-800">{item.name}</p><p className={`text-[10px] uppercase tracking-widest ${priceColor}`}>{priceLabel}</p></div>
                                            {isSelected && <div className="bg-purple-600 text-white rounded-full p-1"><Check size={12}/></div>}
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
             </div>
             <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20 sm:rounded-b-[2rem]">
                <button onClick={confirmCustomization} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-transform">Confirmar</button>
             </div>
           </div>
        </div>
      )}

      {/* --- CART MODAL --- */}
      {showCart && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={() => setShowCart(false)}>
           <div className="bg-white w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-[2.5rem] sm:rounded-[2rem] p-6 relative" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Seu Pedido</h2><button onClick={() => setShowCart(false)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button></div>
             <div className="space-y-4 mb-8">
               {cart.length === 0 ? <p className="text-center text-gray-400 py-10">Carrinho vazio.</p> : cart.map(item => (
                 <div key={item.id} className="flex justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex-1 pr-2"><p className="font-bold text-gray-900">{item.name}</p><p className="text-[10px] text-gray-500 mt-1 leading-tight">{item.details}</p><p className="font-bold text-purple-700 mt-2">R$ {item.price.toFixed(2)}</p></div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 self-start p-2"><Trash2 size={18}/></button>
                 </div>
               ))}
             </div>
             {cart.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                    <div className="flex justify-between items-center mb-4"><span className="text-gray-500 font-bold">Total</span><span className="text-2xl font-black text-purple-900">R$ {cartTotal.toFixed(2)}</span></div>
                    <button onClick={() => {setShowCart(false); setShowCheckout(true);}} className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-green-100 text-lg active:scale-95 transition-transform">Finalizar Pedido</button>
                </div>
             )}
           </div>
        </div>
      )}

      {/* --- CHECKOUT MODAL --- */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={() => setShowCheckout(false)}>
            <div className="bg-white w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-[2.5rem] sm:rounded-[2rem] p-6 relative" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Entrega</h2><button onClick={() => setShowCheckout(false)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button></div>
                <div className="space-y-4 mb-8">
                  <div className="relative">
                        <input 
                            className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-purple-100" 
                            placeholder="(11) 99999-9999" 
                            type="tel" 
                            maxLength="15"
                            value={customerPhone} 
                            onChange={handlePhoneChange}
                            onBlur={handlePhoneBlur}
                        />
                        {loadingPhone && <div className="absolute right-4 top-4 animate-spin"><Loader2 className="text-purple-600"/></div>}
                        <p className="text-[10px] text-gray-400 ml-1 mt-1">Se já comprou, preenchemos o resto para você.</p>
                    </div>
                    <div>
                        <input className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-purple-100" placeholder="Seu Nome" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    </div>
                    
                    <div className="flex gap-3">
                        <div className="relative w-2/3"><input className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-purple-100" placeholder="00000-000" maxLength="9" value={cep} onChange={handleCep} />{loadingCep && <div className="absolute right-4 top-4 animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>}</div>
                        <input className="w-1/3 p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-purple-100" placeholder="Nº" value={num} onChange={e => setNum(e.target.value)} />
                    </div>
                    
                    {outOfRange ? (
                        <div className="p-6 bg-red-50 rounded-[2rem] border border-red-100 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div><h4 className="font-black text-red-500 text-lg">Fora da área 😔</h4><p className="text-gray-500 text-xs mt-1">Peça pelos nossos parceiros:</p></div>
                            <div className="grid grid-cols-3 gap-3">
                                <a href="https://www.ifood.com.br/delivery/sao-paulo-sp/acai-do-lucca-parque-cisper/1fd17658-98b4-4f9b-a154-20cf834d7ed3" className="bg-white p-3 rounded-2xl shadow-sm border border-red-100 flex items-center justify-center"><img src={ifoodLogo} className="w-full h-8 object-contain"/></a>
                                <a href="https://url-eu.mykeeta.com/uCMXP3uz" className="bg-white p-3 rounded-2xl shadow-sm border border-orange-100 flex items-center justify-center"><img src={keetaLogo} className="w-full h-8 object-contain"/></a>
                                <a href="https://oia.99app.com/dlp9/TEjllm" className="bg-white p-3 rounded-2xl shadow-sm border border-yellow-100 flex items-center justify-center"><img src={ninenineLogo} className="w-full h-8 object-contain"/></a>
                            </div>
                        </div>
                    ) : ( addressData && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-start gap-3"><MapPin className="text-purple-600 shrink-0 mt-1" size={18} /><div><p className="font-bold text-sm text-purple-900">{addressData.logradouro}, {addressData.bairro}</p><p className="text-xs text-purple-600 mt-1">Frete: <strong>R$ {deliveryFee.toFixed(2)}</strong></p></div></div>
                                <h3 className="font-bold text-gray-400 text-xs uppercase ml-1">Pagamento</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {['PIX', 'Dinheiro', 'Cartão'].map(m => <button key={m} onClick={() => setPaymentMethod(m)} className={`p-3 rounded-xl font-bold text-sm border transition-all ${paymentMethod === m ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>{m}</button>)}
                                </div>
                                {paymentMethod === 'Dinheiro' && <input className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-lg text-purple-900 placeholder-gray-300" placeholder="Troco para R$..." value={cashAmount} onChange={handleCashChange} type="text" />}
                                
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mt-2">
                                    <div className="flex items-start gap-3">
                                        <input type="checkbox" checked={saveDataConsent} onChange={e => setSaveDataConsent(e.target.checked)} className="mt-1 w-5 h-5 accent-purple-600 cursor-pointer shrink-0" id="lgpd-check"/>
                                        <div className="text-xs text-gray-500 leading-relaxed">
                                            <label htmlFor="lgpd-check" className="cursor-pointer select-none">Autorizo o armazenamento dos meus dados para agilizar pedidos e receber ofertas.</label>
                                            <button onClick={showTerms} className="text-purple-600 font-bold underline ml-1 hover:text-purple-800 flex items-center gap-1 mt-1"><Info size={12}/> Ler termos</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>
                <button onClick={sendWhatsApp} disabled={!addressData || outOfRange || !paymentMethod || !customerPhone} className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-95 ${(!addressData || outOfRange || !paymentMethod || !customerPhone) ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-green-600 text-white shadow-green-100'}`}>{outOfRange ? 'Indisponível' : 'Enviar Pedido'}</button>
            </div>
        </div>
      )}
    </div>
  );
}