import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Edit3, Search, X, Check, 
  LayoutGrid, List, Package, Loader2, ArrowUp, ArrowDown, Upload, Layers, LogOut, Users, Phone, MapPin, Calculator
} from 'lucide-react';
import { useData } from '../hooks/useData';

// Adicione a prop onNavigate para trocar de página
export default function Admin({ onBack, onNavigate }) {
  const { items, lists, products, categories, customers, saveData, deleteData, uploadImage, logout, loading } = useData();
  
  const scrollRef = useRef(null);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, []);
  
  const [activeTab, setActiveTab] = useState('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleLogout = async () => { await logout(); onBack(); };

  // --- HELPERS E FUNÇÕES CRUD (IGUAIS AO ANTERIOR) ---
  const filterData = (dataList) => {
    if (!searchTerm) return dataList;
    return dataList.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  };
  const handleOpenNew = () => { setEditingData(null); setIsModalOpen(true); };
  const handleOpenEdit = (data) => { setEditingData(data); setIsModalOpen(true); };
  const handleDelete = async (id) => { if (window.confirm("Excluir permanentemente?")) await deleteData(activeTab, id); };
  
  const handleSave = async (formData, file) => {
    setIsSaving(true);
    let finalData = { ...formData };
    if (file) {
        const publicUrl = await uploadImage(file);
        if (publicUrl) finalData.image = publicUrl;
    }
    if (!editingData) delete finalData.id; 
    const success = await saveData(activeTab, finalData);
    setIsSaving(false);
    if (success) setIsModalOpen(false);
  };

  const moveCategory = async (cat, direction) => {
      const index = categories.findIndex(c => c.id === cat.id);
      if (index < 0) return;
      const newCats = [...categories];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex >= 0 && targetIndex < newCats.length) {
          const tempOrder = newCats[index].sort_order;
          newCats[index].sort_order = newCats[targetIndex].sort_order;
          newCats[targetIndex].sort_order = tempOrder;
          await saveData('categories', newCats[index]);
          await saveData('categories', newCats[targetIndex]);
      }
  };

  // --- RENDER CONTENT ---
  const renderListContent = () => {
    if (activeTab === 'customers') {
        const filteredCustomers = customers.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone?.includes(searchTerm));
        return (
            <div className="space-y-3 pb-24">
                <div className="bg-purple-100 p-4 rounded-xl border border-purple-200 mb-4">
                    <h3 className="font-bold text-purple-900 flex items-center gap-2"><Users size={18}/> Base de Clientes (CRM)</h3>
                    <p className="text-xs text-purple-700 mt-1">Histórico de clientes que aceitaram salvar os dados.</p>
                </div>
                {filteredCustomers.map(c => (
                    <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <h4 className="font-bold text-gray-800 text-lg">{c.name}</h4>
                            <div className="flex flex-col text-sm text-gray-500 mt-1 gap-1">
                                <span className="flex items-center gap-2"><Phone size={14}/> {c.phone}</span>
                                <span className="flex items-center gap-2"><MapPin size={14}/> {c.address_full}, {c.address_number} ({c.address_cep})</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block">Último Pedido</span>
                            <span className="text-sm font-bold text-purple-700">{new Date(c.last_order_date).toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>
                ))}
                {filteredCustomers.length === 0 && <p className="text-center text-gray-400 py-10">Nenhum cliente encontrado.</p>}
            </div>
        )
    }

    const data = activeTab === 'products' ? products : activeTab === 'lists' ? lists : activeTab === 'items' ? items : categories;
    const filtered = filterData(data);

    if (activeTab === 'categories') {
        return (
            <div className="space-y-2 pb-24">
                {filtered.map((cat, idx) => (
                    <div key={cat.id} className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-400 w-6">{idx + 1}.</span>
                            <span className="font-bold text-gray-800">{cat.name}</span>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => moveCategory(cat, 'up')} className="p-2 hover:bg-gray-100 rounded text-gray-400 hover:text-purple-600"><ArrowUp size={16}/></button>
                            <button onClick={() => moveCategory(cat, 'down')} className="p-2 hover:bg-gray-100 rounded text-gray-400 hover:text-purple-600"><ArrowDown size={16}/></button>
                            <div className="w-px h-6 bg-gray-200 mx-1"></div>
                            <button onClick={() => handleOpenEdit(cat)} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Edit3 size={16}/></button>
                            <button onClick={() => handleDelete(cat.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-24">
            {filtered.map(entry => (
                <div key={entry.id} className="bg-white p-3 rounded-xl flex gap-3 shadow-sm border border-gray-100 group hover:shadow-md transition-all">
                   {activeTab !== 'lists' && (
                       <img src={entry.image || 'https://placehold.co/100?text=S/IMG'} className={`w-16 h-16 rounded-lg object-cover bg-gray-100 ${!entry.available ? 'grayscale' : ''}`} />
                   )}
                   <div className="flex-1 min-w-0">
                       <h3 className="font-bold text-sm truncate">{entry.name}</h3>
                       <p className="text-xs text-gray-400">
                           {activeTab === 'products' && `R$ ${entry.price?.toFixed(2)}`}
                           {activeTab === 'items' && (entry.free ? 'Grátis' : `R$ ${entry.price?.toFixed(2)}`)}
                           {activeTab === 'lists' && (
                               <span className="flex flex-col">
                                   <span>{entry.item_ids?.length || 0} itens</span>
                                   <span className="text-purple-600 font-bold text-[10px]">Até {entry.max_free} Grátis</span>
                               </span>
                           )}
                       </p>
                       {activeTab === 'products' && (
                           <span className="inline-block mt-1 text-[10px] bg-gray-100 px-2 rounded-full text-gray-500">{entry.category}</span>
                       )}
                   </div>
                   <div className="flex flex-col gap-1 justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(entry)} className="p-1.5 bg-blue-50 text-blue-600 rounded"><Edit3 size={14}/></button>
                        <button onClick={() => handleDelete(entry.id)} className="p-1.5 bg-red-50 text-red-500 rounded"><Trash2 size={14}/></button>
                   </div>
                </div>
            ))}
        </div>
    );
  };

  return (
    // FIX LAYOUT: h-dvh (altura dinâmica) + overflow-hidden no PAI
    <div className="flex flex-col md:flex-row h-dvh bg-gray-50 font-sans text-gray-800 overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-white border-b md:border-r border-gray-200 flex flex-row md:flex-col shrink-0 z-20 h-auto md:h-full">
         <div className="p-4 md:p-6 flex items-center justify-between md:justify-start gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">A</div>
                <span className="font-black text-xl tracking-tight block">ADMIN</span>
            </div>
            <button onClick={handleLogout} className="md:hidden flex items-center gap-2 bg-red-50 text-red-500 px-3 py-2 rounded-lg font-bold text-xs"><LogOut size={14}/> Sair</button>
         </div>
         <nav className="hidden md:flex flex-1 px-4 flex-col space-y-2 mt-4 overflow-y-auto">
            <SidebarBtn active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={<Package size={20}/>} label="Produtos" />
            <SidebarBtn active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<Layers size={20}/>} label="Categorias" />
            <SidebarBtn active={activeTab === 'lists'} onClick={() => setActiveTab('lists')} icon={<List size={20}/>} label="Listas" />
            <SidebarBtn active={activeTab === 'items'} onClick={() => setActiveTab('items')} icon={<LayoutGrid size={20}/>} label="Ingredientes" />
            <div className="h-px bg-gray-100 my-2"></div>
            {/* BOTÃO PARA PÁGINA NOVA DE PRECIFICAÇÃO */}
            <button onClick={() => onNavigate('pricing')} className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-gray-500 hover:bg-gray-100 hover:text-green-600">
                <Calculator size={20}/>
                <span className="text-sm font-bold">Calculadora</span>
            </button>
            <SidebarBtn active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users size={20}/>} label="Clientes CRM" />
         </nav>
         <div className="hidden md:block p-4 mt-auto">
            <button onClick={handleLogout} className="flex items-center gap-3 text-red-500 hover:bg-red-50 transition-colors p-3 w-full rounded-xl font-bold"><LogOut size={20}/><span>Sair do Painel</span></button>
         </div>
      </aside>

      {/* MOBILE NAV */}
      <div className="md:hidden flex overflow-x-auto bg-white border-b border-gray-100 p-2 gap-2 shrink-0">
            {['products','categories','lists','items', 'customers'].map(t => (
                <button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 rounded-lg text-xs font-bold capitalize whitespace-nowrap ${activeTab===t?'bg-purple-600 text-white':'bg-gray-100 text-gray-500'}`}>
                    {t === 'customers' ? 'Clientes' : t}
                </button>
            ))}
             <button onClick={() => onNavigate('pricing')} className="px-4 py-2 rounded-lg text-xs font-bold capitalize whitespace-nowrap bg-green-100 text-green-700 border border-green-200">
                Precificação
            </button>
      </div>

      {/* CONTEÚDO PRINCIPAL (Scroll Correto) */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
         <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex justify-between items-center shrink-0">
            <h1 className="text-xl md:text-2xl font-black uppercase text-gray-900">{activeTab === 'customers' ? 'Clientes' : activeTab}</h1>
            {activeTab !== 'customers' && (
                <button onClick={handleOpenNew} className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-purple-700 transition-colors">
                    <Plus size={20}/> <span className="hidden sm:inline">Novo</span>
                </button>
            )}
         </header>

         <div ref={scrollRef} className="p-4 md:p-6 flex-1 overflow-y-auto pb-24">
            <div className="relative mb-6">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
               <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 ring-purple-100" />
            </div>
            {loading ? <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-purple-600"/></div> : renderListContent()}
         </div>
      </main>

      {isModalOpen && (
         <ModalForm 
            key={editingData ? editingData.id : 'new'} 
            type={activeTab} 
            data={editingData} 
            close={() => setIsModalOpen(false)} 
            save={handleSave} 
            isSaving={isSaving} 
            context={{ items, lists, categories }} 
         />
      )}
    </div>
  );
}

// Sub-componentes (SidebarBtn e ModalForm) iguais ao anterior...
// (Copie os sub-componentes do código que te mandei antes, eles não mudaram a lógica, apenas o Admin container mudou)
function SidebarBtn({ active, icon, label, onClick }) {
   return <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'text-gray-500 hover:bg-gray-100'}`}>{icon}<span className="text-sm font-bold">{label}</span></button>
}

function ModalForm({ type, data, close, save, isSaving, context }) {
    // ... Copie o conteúdo do ModalForm da resposta anterior aqui ...
    // Estou omitindo para economizar espaço, mas mantenha o código do ModalForm que já tínhamos (Products, Lists, etc).
    // NÃO precisa da parte "if type === pricing" aqui dentro mais, pois está na outra página.
    
    // Vou colocar a versão enxuta para funcionar se copiar e colar:
    const [form, setForm] = useState(data || {});
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(data?.image || null);

    useEffect(() => {
        if (!data) {
            if (type === 'items') setForm({ name: '', price: 0, image: '', free: false, available: true });
            if (type === 'lists') setForm({ name: '', max_free: 0, item_ids: [] });
            if (type === 'products') setForm({ name: '', price: 0, category: context.categories[0]?.name || '', list_ids: [], available: true });
            if (type === 'categories') setForm({ name: '', sort_order: context.categories.length + 1 });
        }
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) { setSelectedFile(file); setPreview(URL.createObjectURL(file)); }
    };

    const toggleArray = (field, id) => {
        const arr = form[field] || [];
        setForm({ ...form, [field]: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] });
    };

    const moveList = (index, direction) => {
        const arr = [...(form.list_ids || [])];
        if (direction === 'up' && index > 0) [arr[index], arr[index-1]] = [arr[index-1], arr[index]];
        if (direction === 'down' && index < arr.length-1) [arr[index], arr[index+1]] = [arr[index+1], arr[index]];
        setForm({...form, list_ids: arr});
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black uppercase">{data ? 'Editar' : 'Novo'} {type === 'categories' ? 'Categoria' : type}</h2>
                    <button onClick={close}><X/></button>
                </div>
                <div className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-400 uppercase">Nome</label><input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border-gray-100 border outline-none font-bold" /></div>
                    {type !== 'lists' && type !== 'categories' && (
                        <div><label className="text-xs font-bold text-gray-400 uppercase">Imagem</label>
                        <div className="flex gap-3 items-center"><div className="relative w-20 h-20 bg-gray-100 rounded-xl overflow-hidden border border-dashed border-gray-300 flex items-center justify-center shrink-0">{preview ? <img src={preview} className="w-full h-full object-cover" /> : <Upload size={20} className="text-gray-400"/>}<input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" /></div><div className="flex-1"><input value={form.image || ''} onChange={e => { setForm({...form, image: e.target.value}); setPreview(e.target.value); }} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs mb-1" placeholder="Ou cole URL..." /></div></div></div>
                    )}
                    {type === 'products' && (
                        <>
                             <div className="flex gap-3">
                                <div className="flex-1"><label className="text-xs font-bold text-gray-400 uppercase">Preço</label><input type="number" value={form.price || ''} onChange={e => setForm({...form, price: parseFloat(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl border-gray-100 border" /></div>
                                <div className="flex-1"><label className="text-xs font-bold text-gray-400 uppercase">Categoria</label><select value={form.category || ''} onChange={e => setForm({...form, category: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border-gray-100 border bg-white">{context.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                             </div>
                             <div className="bg-purple-50 p-3 rounded-xl"><label className="text-xs font-bold text-purple-800 uppercase mb-2 block">Listas Vinculadas</label>{form.list_ids?.map((id, idx) => { const l = context.lists.find(x => x.id === id); if(!l) return null; return (<div key={id} className="bg-white p-2 mb-1 rounded-lg flex justify-between items-center text-xs font-bold shadow-sm"><span>{idx+1}. {l.name}</span><div className="flex gap-1"><button onClick={() => moveList(idx, 'up')} className="hover:bg-gray-100 p-1 rounded">▲</button><button onClick={() => moveList(idx, 'down')} className="hover:bg-gray-100 p-1 rounded">▼</button><button onClick={() => toggleArray('list_ids', id)} className="text-red-500 hover:bg-red-50 p-1 rounded">✕</button></div></div>) })}<div className="mt-2 flex flex-wrap gap-2">{context.lists.filter(l => !form.list_ids?.includes(l.id)).map(l => (<button key={l.id} onClick={() => toggleArray('list_ids', l.id)} className="bg-white border px-2 py-1 rounded text-xs hover:bg-purple-100">+ {l.name}</button>))}</div></div>
                        </>
                    )}
                    {type === 'lists' && (
                        <>
                            <div><label className="text-xs font-bold text-gray-400 uppercase">Quantos itens Grátis?</label><div className="flex items-center gap-3"><input type="number" min="0" value={form.max_free || 0} onChange={e => setForm({...form, max_free: parseInt(e.target.value)})} className="w-24 p-3 bg-gray-50 rounded-xl border-gray-100 border outline-none font-bold text-center" /><span className="text-xs text-gray-400 leading-tight">Defina quantos itens o cliente ganha.<br/>Ex: 2 = "Escolha 2 Frutas Grátis".</span></div></div>
                            <div className="border-t pt-4 mt-2"><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Itens desta Lista</label><div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">{context.items.map(i => (<div key={i.id} onClick={() => toggleArray('item_ids', i.id)} className={`p-2 border rounded-lg cursor-pointer flex items-center gap-2 ${form.item_ids?.includes(i.id) ? 'bg-purple-50 border-purple-400 ring-1 ring-purple-400' : 'hover:bg-gray-50'}`}><img src={i.image} className="w-8 h-8 rounded object-cover bg-gray-100"/><div className="min-w-0 flex-1"><p className="text-xs font-bold truncate text-gray-800">{i.name}</p><p className="text-[10px] text-gray-400 font-medium">R$ {i.price.toFixed(2)}</p></div>{form.item_ids?.includes(i.id) && <Check size={14} className="text-purple-600"/>}</div>))}</div></div>
                        </>
                    )}
                    {type === 'items' && (
                        <div className="flex gap-3"><div className="flex-1"><label className="text-xs font-bold text-gray-400 uppercase">Preço</label><input type="number" value={form.price || ''} onChange={e => setForm({...form, price: parseFloat(e.target.value)})} className="w-full p-3 bg-gray-50 rounded-xl border-gray-100 border" /></div><div className="flex items-center gap-2 bg-gray-50 px-4 rounded-xl border border-gray-100 cursor-pointer" onClick={() => setForm({...form, free: !form.free})}><div className={`w-4 h-4 border rounded flex items-center justify-center ${form.free ? 'bg-purple-600 border-purple-600' : 'bg-white'}`}>{form.free && <Check size={10} className="text-white"/>}</div><span className="text-xs font-bold">É Grátis?</span></div></div>
                    )}
                </div>
                <button onClick={() => save(form, selectedFile)} disabled={isSaving} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold mt-6 shadow-lg flex justify-center items-center gap-2">{isSaving && <Loader2 className="animate-spin" size={20}/>} {isSaving ? 'Enviando...' : 'Salvar'}</button>
            </div>
        </div>
    );
}