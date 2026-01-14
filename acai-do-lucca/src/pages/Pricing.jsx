import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, Plus, Trash2, Edit3, Save, Search, 
    Calculator, DollarSign, Package, PieChart, Info, 
    Settings, X, ShoppingBag, Store, Tag, ChevronRight, Upload,
    List, Coins // Adicionei ícones para o menu mobile
} from 'lucide-react';
import { useData } from '../hooks/useData';

export default function Pricing({ onBack }) {
  const { supplies, recipes, channels, saveData, deleteData, refreshData } = useData();
  
  // --- NAVEGAÇÃO MOBILE (NOVO) ---
  const [mobileTab, setMobileTab] = useState('supplies'); // 'supplies', 'recipe', 'results'

  // --- CONTROLE DE MODAIS ---
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false); 

  const [editingSupply, setEditingSupply] = useState(null);

  // --- ESTADOS DA CALCULADORA ---
  const [recipeName, setRecipeName] = useState('');
  const [recipeId, setRecipeId] = useState(null);
  const [items, setItems] = useState([]); 
  
  const [operationalCostPercent, setOperationalCostPercent] = useState(30);
  const [profitMarginPercent, setProfitMarginPercent] = useState(20);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todos');

  // --- CÁLCULOS ---
  const calculateFinancials = () => {
      let cmv = 0; 
      items.forEach(item => {
          const costPerUnit = item.price / item.amount;
          cmv += costPerUnit * item.usedAmount;
      });

      if (!channels || channels.length === 0) return { cmv, results: [] };

      const results = channels.map(channel => {
          const totalVariablePercent = 
              parseFloat(channel.commission_percent) + 
              parseFloat(channel.payment_fee_percent) + 
              parseFloat(operationalCostPercent) + 
              parseFloat(profitMarginPercent);

          const totalFixedCost = cmv + parseFloat(channel.fixed_fee);
          const divisor = 1 - (Math.min(totalVariablePercent, 95) / 100);
          const suggestedPrice = totalFixedCost / divisor;

          return {
              ...channel,
              suggestedPrice,
              breakdown: {
                  profit: suggestedPrice * (profitMarginPercent / 100),
                  platformFee: suggestedPrice * ((channel.commission_percent + channel.payment_fee_percent) / 100) + channel.fixed_fee,
                  operational: suggestedPrice * (operationalCostPercent / 100),
                  cmv: cmv
              }
          };
      });

      return { cmv, results };
  };

  const { cmv, results } = calculateFinancials();

  // --- AÇÕES DE RECEITA ---
  const loadRecipe = (recipe) => {
      setRecipeId(recipe.id);
      setRecipeName(recipe.name);
      setItems(recipe.ingredients);
      setProfitMarginPercent(recipe.profit_percent);
      setOperationalCostPercent(recipe.operational_percent || 30);
      setIsRecipeModalOpen(false); 
      setMobileTab('recipe'); // Vai para a aba de montagem no mobile
  };

  const handleSaveRecipe = async () => {
      if(!recipeName) return alert("Dê um nome para o produto!");
      if(items.length === 0) return alert("Adicione ingredientes!");

      const payload = {
          name: recipeName,
          ingredients: items,
          profit_percent: profitMarginPercent,
          operational_percent: operationalCostPercent
      };
      if(recipeId) payload.id = recipeId;
      
      const success = await saveData('recipes', payload);
      if(success) {
          alert("Ficha técnica salva com sucesso!");
          setRecipeName('');
          setRecipeId(null);
          setItems([]);
      }
  };

  const handleDeleteRecipe = async (id) => {
      if(window.confirm("Apagar ficha permanentemente?")) await deleteData('recipes', id);
  };

  // --- AÇÕES DE INSUMOS ---
  const handleSaveSupply = async (data) => {
      await saveData('supplies', data);
      setIsSupplyModalOpen(false);
      setEditingSupply(null);
  };

  const handleDeleteSupply = async (id) => {
      if(window.confirm("Excluir este insumo?")) await deleteData('supplies', id);
  };

  // --- HELPER DE FILTROS ---
  const filteredSupplies = supplies.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = filterCategory === 'Todos' || s.category === filterCategory;
      return matchesSearch && matchesCat;
  });
  const categories = ['Todos', ...new Set(supplies.map(s => s.category || 'Geral'))];

  const addSupplyToRecipe = (supply) => { 
      setItems([...items, { ...supply, usedAmount: 0 }]); 
      // Opcional: setMobileTab('recipe'); // Se quiser que pule de aba ao clicar
  };
  const updateAmount = (index, val) => { const newItems = [...items]; newItems[index].usedAmount = parseFloat(val) || 0; setItems(newItems); };
  const removeRecipeItem = (index) => { setItems(items.filter((_, i) => i !== index)); };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden">
        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex justify-between items-center shrink-0 z-20">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20}/></button>
                <div>
                    <h1 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                        <Calculator className="text-purple-600" size={20}/> 
                        <span className="hidden sm:inline">Calculadora</span>
                        <span className="sm:hidden">Calc</span>
                    </h1>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsChannelModalOpen(true)} className="px-3 py-2 bg-gray-900 text-white text-[10px] sm:text-xs font-bold rounded-lg hover:bg-black flex items-center gap-2"><Settings size={14}/> Taxas</button>
                <button onClick={() => setIsRecipeModalOpen(true)} className="px-3 py-2 bg-purple-50 text-purple-700 text-[10px] sm:text-xs font-bold rounded-lg hover:bg-purple-100 flex items-center gap-2"><Package size={14}/> Fichas</button>
            </div>
        </header>

        {/* --- MOBILE TABS (SÓ APARECE NO CELULAR) --- */}
        <div className="md:hidden flex bg-white border-b border-gray-200 shrink-0">
            <button onClick={() => setMobileTab('supplies')} className={`flex-1 py-3 text-xs font-bold border-b-2 ${mobileTab === 'supplies' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400'}`}><List size={16} className="mx-auto mb-1"/> Insumos</button>
            <button onClick={() => setMobileTab('recipe')} className={`flex-1 py-3 text-xs font-bold border-b-2 relative ${mobileTab === 'recipe' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400'}`}><Package size={16} className="mx-auto mb-1"/> Montagem {items.length > 0 && <span className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full"></span>}</button>
            <button onClick={() => setMobileTab('results')} className={`flex-1 py-3 text-xs font-bold border-b-2 ${mobileTab === 'results' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-400'}`}><Coins size={16} className="mx-auto mb-1"/> Lucro</button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            
            {/* COLUNA 1: INSUMOS (Mobile: Só aparece se aba=supplies / Desktop: Sempre aparece) */}
            <div className={`w-full md:w-1/4 bg-white border-r border-gray-200 flex-col z-10 ${mobileTab === 'supplies' ? 'flex' : 'hidden md:flex'}`}>
                <div className="p-4 border-b border-gray-100 space-y-3 shrink-0">
                    <button onClick={() => { setEditingSupply(null); setIsSupplyModalOpen(true); }} className="w-full bg-green-600 text-white py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-green-700 transition-colors">
                        <Plus size={16}/> Novo Insumo
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar insumo..." className="w-full pl-9 p-2 bg-gray-50 rounded-lg text-sm outline-none border border-transparent focus:border-purple-200 bg-gray-50"/>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {categories.map(cat => (
                            <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border transition-colors ${filterCategory === cat ? 'bg-purple-100 border-purple-200 text-purple-700' : 'bg-white border-gray-100 text-gray-500'}`}>{cat}</button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 pb-20 md:pb-2">
                    {filteredSupplies.map(s => (
                        <div key={s.id} onClick={() => addSupplyToRecipe(s)} className="p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 cursor-pointer group relative active:scale-95 transition-transform">
                            <div className="flex justify-between items-start pr-12">
                                <h4 className="font-bold text-sm text-gray-700">{s.name}</h4>
                            </div>
                            <div className="flex justify-between mt-1 text-[10px] text-gray-400 pr-12">
                                <span>{s.category || 'Geral'}</span>
                                <span>R$ {(s.price/s.amount).toFixed(4)}/{s.unit}</span>
                            </div>
                            <div className="absolute right-2 top-2 flex flex-col gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); setEditingSupply(s); setIsSupplyModalOpen(true); }} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"><Edit3 size={12}/></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteSupply(s.id); }} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><Trash2 size={12}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* COLUNA 2: MONTAGEM (Mobile: Só aparece se aba=recipe / Desktop: Sempre aparece) */}
            <div className={`flex-1 bg-gray-50 flex-col overflow-y-auto ${mobileTab === 'recipe' ? 'flex' : 'hidden md:flex'}`}>
                <div className="p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6 pb-20 md:pb-6">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Nome do Produto</label>
                        <input value={recipeName} onChange={e => setRecipeName(e.target.value)} placeholder="Ex: Açaí 500ml Completo" className="w-full text-lg md:text-xl font-black text-gray-800 outline-none placeholder-gray-300"/>
                    </div>

                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 min-h-[300px]">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide"><Package size={16} className="text-purple-600"/> Composição</h3>
                        {items.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-xl">
                                <p className="text-gray-400 text-sm">Clique nos insumos à esquerda para adicionar.</p>
                                <button onClick={() => setMobileTab('supplies')} className="md:hidden mt-2 text-purple-600 font-bold text-sm underline">Ir para Insumos</button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {items.map((item, idx) => {
                                     const unitCost = item.price / item.amount;
                                     const totalItemCost = unitCost * item.usedAmount;
                                     return (
                                        <div key={idx} className="flex items-center gap-3 bg-gray-50 p-2 pr-4 rounded-xl border border-gray-100">
                                            <div className="flex-1 min-w-0"><p className="font-bold text-sm text-gray-700 truncate">{item.name}</p><p className="text-[10px] text-gray-400">R$ {totalItemCost.toFixed(2)}</p></div>
                                            <div className="flex items-center bg-white rounded-lg border border-gray-200 overflow-hidden"><input type="number" value={item.usedAmount || ''} onChange={e => updateAmount(idx, e.target.value)} className="w-16 p-2 text-center text-sm font-bold outline-none" placeholder="0"/><div className="bg-gray-50 px-2 py-2 text-[10px] font-bold text-gray-500 border-l border-gray-200">{item.unit}</div></div>
                                            <button onClick={() => removeRecipeItem(idx)} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                                        </div>
                                     )
                                })}
                            </div>
                        )}
                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-500">Custo Ingredientes (CMV)</span>
                            <span className="text-2xl font-black text-gray-800">R$ {cmv.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <button onClick={handleSaveRecipe} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl hover:bg-black transition-transform active:scale-95">
                        <Save size={20}/> {recipeId ? 'Atualizar Ficha' : 'Salvar Nova Ficha'}
                    </button>
                </div>
            </div>

            {/* COLUNA 3: RESULTADOS (Mobile: Só aparece se aba=results / Desktop: Sempre aparece) */}
            <div className={`w-full md:w-[380px] bg-white border-l border-gray-200 flex-col overflow-y-auto ${mobileTab === 'results' ? 'flex' : 'hidden md:flex'}`}>
                <div className="p-6 bg-purple-900 text-white pb-10">
                    <h2 className="font-bold flex items-center gap-2 mb-6"><PieChart size={18} className="text-green-400"/> Configuração de Lucro</h2>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs text-purple-200 mb-1 uppercase font-bold">Custos Fixos/Operacionais</div>
                            <div className="relative"><input type="number" value={operationalCostPercent} onChange={e => setOperationalCostPercent(parseFloat(e.target.value)||0)} className="w-full bg-purple-800/50 border border-purple-700 rounded-lg p-2 text-white font-bold outline-none focus:border-green-400"/><span className="absolute right-3 top-2 text-purple-300 font-bold">%</span></div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-purple-200 mb-1 uppercase font-bold">Margem de Lucro Líquida</div>
                            <div className="relative"><input type="number" value={profitMarginPercent} onChange={e => setProfitMarginPercent(parseFloat(e.target.value)||0)} className="w-full bg-purple-800/50 border border-purple-700 rounded-lg p-2 text-white font-bold outline-none focus:border-green-400"/><span className="absolute right-3 top-2 text-purple-300 font-bold">%</span></div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-4 -mt-6 space-y-4 pb-20 md:pb-4">
                    {results.map((res, idx) => (
                        <div key={idx} className={`bg-white p-4 rounded-xl shadow-lg border relative overflow-hidden group ${res.name.includes('iFood') ? 'border-red-100' : 'border-gray-100'}`}>
                            <div className={`absolute top-0 left-0 w-1 h-full ${res.color || 'bg-gray-200'}`}></div>
                            <div className="pl-2">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-sm text-gray-700">{res.name}</span>
                                    <span className="text-[9px] bg-gray-100 px-1 rounded text-gray-500 font-bold">Fee: {res.commission_percent}%</span>
                                </div>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-xs text-gray-400">Venda:</span>
                                    <span className="text-2xl font-black text-gray-800">R$ {res.suggestedPrice.toFixed(2)}</span>
                                </div>
                                <div className="text-[10px] space-y-1 pt-2 border-t border-gray-50 text-gray-400">
                                    <div className="flex justify-between"><span>Taxas (Plat + Fixa):</span> <span className="text-red-400">- R$ {res.breakdown.platformFee.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span>Custos Fixos ({operationalCostPercent}%):</span> <span className="text-orange-400">- R$ {res.breakdown.operational.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span>Ingredientes:</span> <span className="text-gray-500">- R$ {res.breakdown.cmv.toFixed(2)}</span></div>
                                    <div className="flex justify-between font-bold text-green-600 bg-green-50 px-1 rounded mt-1"><span>Lucro Real ({profitMarginPercent}%):</span> <span>R$ {res.breakdown.profit.toFixed(2)}</span></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* --- MODAIS --- */}

        {/* MODAL CANAIS (TAXAS) */}
        {isChannelModalOpen && (
            <ChannelsModal 
                channels={channels} 
                close={() => setIsChannelModalOpen(false)} 
                refresh={refreshData}
                saveData={saveData}
                deleteData={deleteData}
            />
        )}

        {/* MODAL INSUMOS (CRUD) */}
        {isSupplyModalOpen && (
            <SupplyForm 
                data={editingSupply}
                close={() => setIsSupplyModalOpen(false)}
                save={handleSaveSupply}
            />
        )}

        {/* NOVO MODAL: LISTA DE FICHAS TÉCNICAS */}
        {isRecipeModalOpen && (
            <RecipesModal
                recipes={recipes}
                channels={channels} // <--- ADICIONE ISSO
                close={() => setIsRecipeModalOpen(false)}
                onLoad={loadRecipe}
                onDelete={handleDeleteRecipe}
            />
        )}
    </div>
  );
}

// --- SUB-COMPONENTES ---

// 1. MODAL DE FICHAS (ESTRUTURA SIMPLES + DADOS RICOS)
function RecipesModal({ recipes, channels, close, onLoad, onDelete }) {
    const [search, setSearch] = useState('');
    const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

    // Helper para calcular valores na hora (para exibir na linha)
    const getRecipeSnapshot = (recipe) => {
        // 1. Calcula CMV
        let cmv = 0;
        recipe.ingredients?.forEach(i => {
            cmv += (i.price / i.amount) * i.usedAmount;
        });

        // 2. Calcula Preço de Venda
        const calcPrice = (searchName) => {
            const channel = channels.find(c => c.name.toLowerCase().includes(searchName));
            if (!channel) return 0;
            
            const opCost = recipe.operational_percent || 30; 
            const profit = recipe.profit_percent || 20;
            const totalVar = parseFloat(channel.commission_percent) + parseFloat(channel.payment_fee_percent) + parseFloat(opCost) + parseFloat(profit);
            const totalFixed = cmv + parseFloat(channel.fixed_fee);
            const divisor = 1 - (Math.min(totalVar, 95) / 100);
            
            return totalFixed / divisor;
        };

        return {
            cmv,
            priceBalcao: calcPrice('balcão') || calcPrice('balcao') || calcPrice('propria'),
            priceIfood: calcPrice('ifood')
        };
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black uppercase">Fichas Técnicas</h2>
                    <button onClick={close} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>
                </div>
                
                <div className="mb-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <input 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                        className="w-full pl-10 p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-purple-200" 
                        placeholder="Pesquisar ficha..."
                    />
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                    {filtered.map(r => {
                        const snap = getRecipeSnapshot(r);
                        return (
                            <div key={r.id} className="flex justify-between items-center bg-white p-4 border border-gray-100 rounded-2xl hover:border-purple-200 hover:shadow-sm transition-all">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{r.name}</h3>
                                    <p className="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-2">
                                        <span>{r.ingredients?.length || 0} itens</span>
                                        <span>•</span>
                                        <span>Lucro: <span className="text-green-600 font-bold">{r.profit_percent}%</span></span>
                                        <span>•</span>
                                        <span>CMV: R$ {snap.cmv.toFixed(2)}</span>
                                        
                                        {snap.priceBalcao > 0 && (
                                            <>
                                                <span>•</span>
                                                <span>Balcão: <strong className="text-gray-600">R$ {snap.priceBalcao.toFixed(2)}</strong></span>
                                            </>
                                        )}
                                        
                                        {snap.priceIfood > 0 && (
                                            <>
                                                <span>•</span>
                                                <span>iFood: <strong className="text-gray-600">R$ {snap.priceIfood.toFixed(2)}</strong></span>
                                            </>
                                        )}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onLoad(r)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 flex items-center gap-2">
                                        <Upload size={14}/> Abrir
                                    </button>
                                    <button onClick={() => onDelete(r.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    {filtered.length === 0 && <p className="text-center text-gray-400 py-10">Nenhuma ficha encontrada.</p>}
                </div>
            </div>
        </div>
    )
}

function SupplyForm({ data, close, save }) {
    const [form, setForm] = useState(data || { name: '', price: '', amount: '', unit: 'g', category: 'Geral' });
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black uppercase">{data ? 'Editar' : 'Novo'} Insumo</h2>
                    <button onClick={close} className="bg-gray-100 p-1 rounded-full"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">Nome do Item</label>
                        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:border-purple-300 transition-colors" placeholder="Ex: Açaí 5 Litros" autoFocus />
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-400 uppercase">Categoria</label>
                            <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:border-purple-300" placeholder="Ex: Frutas" />
                        </div>
                        <div className="w-1/3">
                            <label className="text-xs font-bold text-gray-400 uppercase">Unidade</label>
                            <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold bg-white outline-none">
                                <option value="g">g</option>
                                <option value="ml">ml</option>
                                <option value="un">un</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-400 uppercase">Preço Pago (R$)</label>
                            <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:border-purple-300" placeholder="0.00" />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-400 uppercase">Qtd Emb.</label>
                            <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:border-purple-300" placeholder="Ex: 5000" />
                        </div>
                    </div>
                </div>
                <button onClick={() => save({...form, price: parseFloat(form.price), amount: parseFloat(form.amount)})} className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold mt-6 shadow-lg shadow-green-200 active:scale-95 transition-transform">
                    Salvar Insumo
                </button>
            </div>
        </div>
    )
}

function ChannelsModal({ channels, close, refresh, saveData, deleteData }) {
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({});

    const handleEdit = (c) => { setEditingId(c.id); setForm(c); };
    const handleNew = () => { setEditingId('new'); setForm({ name: '', commission_percent: 0, payment_fee_percent: 0, fixed_fee: 0, color: 'bg-gray-200' }); };
    
    const handleSave = async () => {
        const payload = { ...form };
        if (editingId === 'new') delete payload.id;
        await saveData('sales_channels', payload);
        await refresh();
        setEditingId(null);
    };

    const handleDelete = async (id) => {
        if(window.confirm("Apagar canal?")) {
            await deleteData('sales_channels', id);
            await refresh();
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <div><h2 className="text-xl font-black uppercase">Taxas das Plataformas</h2><p className="text-xs text-gray-400">Configure as taxas de 2026</p></div>
                    <button onClick={close}><X/></button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3">
                    {channels.map(c => (
                        <div key={c.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                            {editingId === c.id ? (
                                <ChannelForm form={form} setForm={setForm} onSave={handleSave} onCancel={() => setEditingId(null)}/>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-10 rounded-full ${c.color}`}></div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">{c.name}</h4>
                                            <p className="text-xs text-gray-500">
                                                Comissão: <strong>{c.commission_percent}%</strong> | 
                                                Pgto: <strong>{c.payment_fee_percent}%</strong> | 
                                                Fixo: <strong>R$ {c.fixed_fee}</strong>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(c)} className="p-2 bg-white border rounded-lg hover:bg-gray-100"><Edit3 size={14}/></button>
                                        <button onClick={() => handleDelete(c.id)} className="p-2 bg-white border rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {editingId === 'new' && (
                        <div className="border border-purple-200 bg-purple-50 rounded-xl p-4">
                            <ChannelForm form={form} setForm={setForm} onSave={handleSave} onCancel={() => setEditingId(null)}/>
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                    <button onClick={handleNew} disabled={editingId !== null} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"><Plus size={18}/> Novo Canal de Venda</button>
                </div>
            </div>
        </div>
    )
}

function ChannelForm({ form, setForm, onSave, onCancel }) {
    return (
        <div className="space-y-3 animate-in fade-in">
            <div><label className="text-[10px] font-bold uppercase text-gray-400">Nome da Plataforma</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 rounded-lg border font-bold text-sm" placeholder="Ex: iFood"/></div>
            <div className="grid grid-cols-3 gap-3">
                <div><label className="text-[10px] font-bold uppercase text-gray-400">Comissão (%)</label><input type="number" value={form.commission_percent} onChange={e => setForm({...form, commission_percent: e.target.value})} className="w-full p-2 rounded-lg border font-bold text-sm"/></div>
                <div><label className="text-[10px] font-bold uppercase text-gray-400">Taxa Pgto (%)</label><input type="number" value={form.payment_fee_percent} onChange={e => setForm({...form, payment_fee_percent: e.target.value})} className="w-full p-2 rounded-lg border font-bold text-sm"/></div>
                <div><label className="text-[10px] font-bold uppercase text-gray-400">Custo Fixo (R$)</label><input type="number" value={form.fixed_fee} onChange={e => setForm({...form, fixed_fee: e.target.value})} className="w-full p-2 rounded-lg border font-bold text-sm"/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold uppercase text-gray-400">Cor (Tailwind)</label><input value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-full p-2 rounded-lg border font-bold text-sm" placeholder="bg-red-100"/></div>
                <div className="flex gap-2 items-end">
                    <button onClick={onSave} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-xs">Salvar</button>
                    <button onClick={onCancel} className="bg-gray-200 text-gray-600 py-2 px-4 rounded-lg font-bold text-xs">X</button>
                </div>
            </div>
        </div>
    )
}