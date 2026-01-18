import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, Plus, Trash2, Edit3, Save, Search, 
    Calculator, Package, PieChart, 
    Settings, X, Upload,
    List, Coins, ToggleLeft, ToggleRight, RotateCcw, Eraser,
    AlertTriangle, CheckCircle 
} from 'lucide-react';
import { useData } from '../hooks/useData';

export default function Pricing({ onBack }) {
  const { supplies, recipes, channels, saveData, deleteData, refreshData } = useData();
  
  // --- NAVEGAÇÃO MOBILE ---
  const [mobileTab, setMobileTab] = useState('supplies'); 

  // --- CONTROLE DE MODAIS ---
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false); 

  // --- NOVO: CONTROLE DE DIÁLOGOS (SUBSTITUI ALERT/CONFIRM) ---
  const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });

  const [editingSupply, setEditingSupply] = useState(null);

  // --- ESTADOS DA CALCULADORA ---
  const [recipeName, setRecipeName] = useState('');
  const [recipeId, setRecipeId] = useState(null);
  const [items, setItems] = useState([]); 
  
  const [operationalCostPercent, setOperationalCostPercent] = useState(30);
  const [profitMarginPercent, setProfitMarginPercent] = useState(20);
  
  const [useFixedProfit, setUseFixedProfit] = useState(true); 
  const [manualPrices, setManualPrices] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todos');

  // --- HELPER PARA MOSTRAR DIÁLOGOS ---
  const showDialog = (type, title, message, onConfirm = null) => {
      setDialog({ isOpen: true, type, title, message, onConfirm });
  };

  const closeDialog = () => {
      setDialog({ ...dialog, isOpen: false });
  };

  const handleDialogConfirm = () => {
      if (dialog.onConfirm) dialog.onConfirm();
      closeDialog();
  };

  // --- CÁLCULOS ---
  const calculateFinancials = () => {
      let cmv = 0; 
      items.forEach(item => {
          const costPerUnit = item.price / item.amount;
          cmv += costPerUnit * item.usedAmount;
      });

      if (!channels || channels.length === 0) return { cmv, results: [] };

      let basePrice = 0;
      let targetProfitMoney = 0;

      if (useFixedProfit) {
          const baseChannel = channels.find(c => 
              c.name.toLowerCase().includes('balcão') || 
              c.name.toLowerCase().includes('balcao') || 
              c.name.toLowerCase().includes('propria') || 
              c.name.toLowerCase().includes('própria')
          ) || channels[0];

          if (baseChannel) {
              const baseTotalVars = parseFloat(baseChannel.commission_percent) + parseFloat(baseChannel.payment_fee_percent) + parseFloat(operationalCostPercent) + parseFloat(profitMarginPercent);
              const baseTotalFixed = cmv + parseFloat(baseChannel.fixed_fee);
              const baseDivisor = 1 - (Math.min(baseTotalVars, 95) / 100);
              basePrice = baseTotalFixed / baseDivisor;
              targetProfitMoney = basePrice * (profitMarginPercent / 100);
          }
      }

      const results = channels.map(channel => {
          let autoPrice = 0;
          
          if (useFixedProfit) {
             const isBase = (channel.name.toLowerCase().includes('balcão') || channel.name.toLowerCase().includes('balcao') || channel.name.toLowerCase().includes('propria') || channel.name.toLowerCase().includes('própria'));
             if (isBase) {
                 autoPrice = basePrice;
             } else {
                 const variableTaxPercent = parseFloat(channel.commission_percent) + parseFloat(channel.payment_fee_percent) + parseFloat(operationalCostPercent);
                 const numerator = cmv + parseFloat(channel.fixed_fee) + targetProfitMoney;
                 const divisor = 1 - (Math.min(variableTaxPercent, 95) / 100);
                 autoPrice = numerator / divisor;
             }
          } else {
             const totalVariablePercent = parseFloat(channel.commission_percent) + parseFloat(channel.payment_fee_percent) + parseFloat(operationalCostPercent) + parseFloat(profitMarginPercent);
             const totalFixedCost = cmv + parseFloat(channel.fixed_fee);
             const divisor = 1 - (Math.min(totalVariablePercent, 95) / 100);
             autoPrice = totalFixedCost / divisor;
          }

          const hasManualPrice = !useFixedProfit && manualPrices[channel.id] !== undefined && manualPrices[channel.id] !== '';
          const finalPrice = hasManualPrice ? parseFloat(manualPrices[channel.id]) : autoPrice;

          const variableFees = finalPrice * ((channel.commission_percent + channel.payment_fee_percent) / 100);
          const fixedFees = parseFloat(channel.fixed_fee);
          const operationalCost = finalPrice * (operationalCostPercent / 100);
          
          const realProfit = finalPrice - variableFees - fixedFees - operationalCost - cmv;
          const realMargin = finalPrice > 0 ? (realProfit / finalPrice) * 100 : 0;

          return {
              ...channel,
              suggestedPrice: finalPrice,
              isManual: hasManualPrice,
              calculatedMargin: realMargin,
              breakdown: {
                  profit: realProfit,
                  platformFee: variableFees + fixedFees,
                  operational: operationalCost,
                  cmv: cmv
              }
          };
      });

      return { cmv, results };
  };

  const { cmv, results } = calculateFinancials();

  // --- HANDLERS ---
  const handlePriceChange = (id, value) => {
      setManualPrices(prev => ({ ...prev, [id]: value }));
  };

  const handleResetPrice = (id) => {
      const newPrices = { ...manualPrices };
      delete newPrices[id];
      setManualPrices(newPrices);
  };

  // LIMPAR CALCULADORA
  const handleClearCalculator = () => {
      if (items.length === 0) return;
      showDialog('confirm', 'Limpar Simulação?', 'Deseja apagar todos os itens e começar do zero?', () => {
          setRecipeName('');
          setRecipeId(null);
          setItems([]);
          setManualPrices({});
      });
  };

  const loadRecipe = (recipe) => {
      setRecipeId(recipe.id);
      setRecipeName(recipe.name);
      setItems(recipe.ingredients || []);
      setProfitMarginPercent(recipe.profit_percent);
      setOperationalCostPercent(recipe.operational_percent || 30);
      setManualPrices({});
      setIsRecipeModalOpen(false); 
      setMobileTab('recipe'); 
  };

  const handleSaveRecipe = async () => {
      if(!recipeName) return showDialog('alert', 'Atenção', 'Dê um nome para o produto antes de salvar!');
      if(items.length === 0) return showDialog('alert', 'Atenção', 'Adicione pelo menos um ingrediente!');

      const payload = {
          name: recipeName,
          ingredients: items,
          profit_percent: profitMarginPercent,
          operational_percent: operationalCostPercent
      };
      if(recipeId) payload.id = recipeId;
      
      const success = await saveData('recipes', payload);
      if(success) {
          showDialog('alert', 'Sucesso', 'Ficha técnica salva com sucesso!');
      }
  };

  const handleDeleteRecipe = (id) => { 
      showDialog('confirm', 'Excluir Ficha?', 'Essa ação não pode ser desfeita.', async () => {
          await deleteData('recipes', id);
      });
  };

  const handleSaveSupply = async (data) => { await saveData('supplies', data); setIsSupplyModalOpen(false); setEditingSupply(null); };
  
  const handleDeleteSupply = (id) => { 
      showDialog('confirm', 'Excluir Insumo?', 'Tem certeza que deseja apagar este ingrediente?', async () => {
          await deleteData('supplies', id);
      });
  };

  const filteredSupplies = supplies.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = filterCategory === 'Todos' || s.category === filterCategory;
      return matchesSearch && matchesCat;
  });
  
  const uniqueCategories = [...new Set(supplies.map(s => s.category || 'Geral'))];
  const categories = ['Todos', ...uniqueCategories];

  const addSupplyToRecipe = (supply) => { setItems([...items, { ...supply, usedAmount: 0 }]); };
  const updateAmount = (index, val) => { const newItems = [...items]; newItems[index].usedAmount = parseFloat(val) || 0; setItems(newItems); };
  const removeRecipeItem = (index) => { setItems(items.filter((_, i) => i !== index)); };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden fixed inset-0">
        
        <style>{`
            input[type=number]::-webkit-inner-spin-button, 
            input[type=number]::-webkit-outer-spin-button { 
                -webkit-appearance: none; margin: 0; 
            }
            input[type=number] { -moz-appearance: textfield; }
        `}</style>

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

        {/* MOBILE TABS */}
        <div className="md:hidden flex bg-white border-b border-gray-200 shrink-0">
            <button onClick={() => setMobileTab('supplies')} className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 ${mobileTab === 'supplies' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400'}`}><List size={16}/> Insumos</button>
            <button onClick={() => setMobileTab('recipe')} className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 relative ${mobileTab === 'recipe' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400'}`}><Package size={16}/> Montagem {items.length > 0 && <span className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full"></span>}</button>
            <button onClick={() => setMobileTab('results')} className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 ${mobileTab === 'results' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-400'}`}><Coins size={16}/> Lucro</button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            
            {/* COLUNA 1: INSUMOS */}
            <div className={`w-full md:w-1/4 bg-white border-r border-gray-200 flex-col z-10 ${mobileTab === 'supplies' ? 'flex h-full' : 'hidden md:flex h-full'}`}>
                <div className="p-4 border-b border-gray-100 space-y-3 shrink-0">
                    <button onClick={() => { setEditingSupply(null); setIsSupplyModalOpen(true); }} className="w-full bg-green-600 text-white py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-green-700">
                        <Plus size={16}/> Novo Insumo
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full pl-9 p-2 bg-gray-50 rounded-lg text-sm outline-none border border-transparent focus:border-purple-200 bg-gray-50"/>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {categories.map(cat => (
                            <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border ${filterCategory === cat ? 'bg-purple-100 border-purple-200 text-purple-700' : 'bg-white border-gray-100 text-gray-500'}`}>{cat}</button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 pb-24 md:pb-2">
                    {filteredSupplies.map(s => (
                        <div key={s.id} onClick={() => addSupplyToRecipe(s)} className="p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 cursor-pointer group relative active:scale-95 transition-transform">
                            <div className="flex justify-between items-start pr-8">
                                <h4 className="font-bold text-sm text-gray-700">{s.name}</h4>
                            </div>
                            <div className="flex justify-between mt-1 text-[10px] text-gray-400 pr-8">
                                <span>{s.category || 'Geral'}</span>
                                <span>R$ {(s.price/s.amount).toFixed(4)}/{s.unit}</span>
                            </div>
                            <div className="absolute right-2 top-2 flex flex-col gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); setEditingSupply(s); setIsSupplyModalOpen(true); }} className="p-1 bg-blue-100 text-blue-600 rounded"><Edit3 size={12}/></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteSupply(s.id); }} className="p-1 bg-red-100 text-red-600 rounded"><Trash2 size={12}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* COLUNA 2: MONTAGEM */}
            <div className={`flex-1 bg-gray-50 flex-col overflow-y-auto ${mobileTab === 'recipe' ? 'flex h-full' : 'hidden md:flex h-full'}`}>
                <div className="p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6 pb-24 md:pb-6">
                    
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 relative">
                        <div className="flex justify-between items-start mb-1">
                            <label className="text-xs font-bold text-gray-400 uppercase block">Nome do Produto</label>
                            <button onClick={handleClearCalculator} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-gray-200 hover:text-red-500 transition-colors">
                                <Eraser size={12}/> Limpar / Novo
                            </button>
                        </div>
                        <input value={recipeName} onChange={e => setRecipeName(e.target.value)} placeholder="Ex: Açaí 500ml" className="w-full text-lg font-black text-gray-800 outline-none placeholder-gray-300"/>
                    </div>

                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 min-h-[300px]">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide"><Package size={16} className="text-purple-600"/> Composição</h3>
                        {items.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-xl">
                                <p className="text-gray-400 text-sm">Lista Vazia.</p>
                                <button onClick={() => setMobileTab('supplies')} className="md:hidden mt-2 text-purple-600 font-bold text-sm underline">Ir para Insumos</button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {items.map((item, idx) => {
                                     const totalItemCost = (item.price / item.amount) * item.usedAmount;
                                     return (
                                        <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                                            <div className="flex-1 min-w-0"><p className="font-bold text-sm text-gray-700 truncate">{item.name}</p><p className="text-[10px] text-gray-400">R$ {totalItemCost.toFixed(2)}</p></div>
                                            <div className="flex items-center bg-white rounded-lg border border-gray-200 overflow-hidden"><input type="number" value={item.usedAmount || ''} onChange={e => updateAmount(idx, e.target.value)} className="w-14 p-1 text-center text-sm font-bold outline-none" placeholder="0"/><div className="bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-500 border-l border-gray-200">{item.unit}</div></div>
                                            <button onClick={() => removeRecipeItem(idx)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                                        </div>
                                     )
                                })}
                            </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-500">Total CMV</span>
                            <span className="text-xl font-black text-gray-800">R$ {cmv.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <button onClick={handleSaveRecipe} className={`w-full text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl transition-colors ${recipeId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-black'}`}>
                        {recipeId ? <><Edit3 size={18}/> Atualizar Ficha</> : <><Save size={18}/> Salvar Ficha</>}
                    </button>
                </div>
            </div>

            {/* COLUNA 3: RESULTADOS */}
            <div className={`w-full md:w-[380px] bg-white border-l border-gray-200 flex-col overflow-y-auto ${mobileTab === 'results' ? 'flex h-full' : 'hidden md:flex h-full'}`}>
                <div className="p-6 bg-purple-900 text-white shrink-0">
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
                        
                        <div className="pt-2 border-t border-purple-800/50">
                            <div className="flex items-center justify-between cursor-pointer" onClick={() => { setUseFixedProfit(!useFixedProfit); setManualPrices({}); }}>
                                <div>
                                    <p className="text-xs font-bold text-green-400">
                                        {useFixedProfit ? 'Modo Lucro Fixo (Padrão)' : 'Modo Cálculo Completo'}
                                    </p>
                                    <p className="text-[10px] text-purple-300">
                                        {useFixedProfit ? 'Preço Automático (Não Editável)' : 'Permite editar preço de venda'}
                                    </p>
                                </div>
                                <div className="text-green-400">
                                    {useFixedProfit ? <ToggleRight size={32}/> : <ToggleLeft size={32} className="text-purple-400"/>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-4 space-y-4 pb-24 md:pb-4 overflow-y-auto">
                    {results.map((res, idx) => (
                        <div key={idx} className={`bg-white p-4 rounded-xl shadow-lg border relative overflow-hidden group ${res.name.includes('iFood') ? 'border-red-100' : 'border-gray-100'} ${res.isManual ? 'ring-2 ring-yellow-200' : ''}`}>
                            <div className={`absolute top-0 left-0 w-1 h-full ${res.color || 'bg-gray-200'}`}></div>
                            <div className="pl-2">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-sm text-gray-700">{res.name}</span>
                                    <span className="text-[9px] bg-gray-100 px-1 rounded text-gray-500 font-bold">Fee: {res.commission_percent}%</span>
                                </div>
                                
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs text-gray-400">Venda:</span>
                                    {useFixedProfit ? (
                                        <span className="text-2xl font-black text-gray-800">R$ {res.suggestedPrice.toFixed(2)}</span>
                                    ) : (
                                        <div className="relative flex-1">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">R$</span>
                                            <input 
                                                type="number" 
                                                value={manualPrices[res.id] !== undefined ? manualPrices[res.id] : res.suggestedPrice.toFixed(2)}
                                                onChange={(e) => handlePriceChange(res.id, e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                                className={`w-full pl-8 pr-2 py-1 rounded-lg border font-black text-lg outline-none transition-all ${res.isManual ? 'border-yellow-400 bg-yellow-50 text-yellow-900' : 'border-gray-200 text-gray-800 bg-transparent focus:border-purple-300'}`}
                                            />
                                            {res.isManual && (
                                                <button onClick={() => handleResetPrice(res.id)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500">
                                                    <RotateCcw size={14}/>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="text-[10px] space-y-1 pt-2 border-t border-gray-50 text-gray-400">
                                    <div className="flex justify-between"><span>Taxas (Plat + Fixa):</span> <span className="text-red-400">- R$ {res.breakdown.platformFee.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span>Custos Fixos ({operationalCostPercent}%):</span> <span className="text-orange-400">- R$ {res.breakdown.operational.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span>Ingredientes:</span> <span className="text-gray-500">- R$ {res.breakdown.cmv.toFixed(2)}</span></div>
                                    
                                    <div className={`flex justify-between font-bold px-1 rounded mt-1 ${res.breakdown.profit < 0 ? 'bg-red-100 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                        <span>Lucro Real {res.isManual ? '(Manual)' : useFixedProfit ? '(Fixo)' : `(${profitMarginPercent}%)`}:</span> 
                                        <span>R$ {res.breakdown.profit.toFixed(2)} ({res.calculatedMargin.toFixed(1)}%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* --- MODAIS --- */}
        {isChannelModalOpen && <ChannelsModal channels={channels} close={() => setIsChannelModalOpen(false)} refresh={refreshData} saveData={saveData} deleteData={deleteData} confirmDialog={showDialog} />}
        {isSupplyModalOpen && <SupplyForm data={editingSupply} categories={uniqueCategories} close={() => setIsSupplyModalOpen(false)} save={handleSaveSupply} />}
        {isRecipeModalOpen && <RecipesModal recipes={recipes} channels={channels} close={() => setIsRecipeModalOpen(false)} onLoad={loadRecipe} onDelete={handleDeleteRecipe} />}
        
        {/* NOVO MODAL DE DIÁLOGO (GLOBAL) */}
        {dialog.isOpen && (
            <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl scale-100 animate-in zoom-in-95">
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${dialog.type === 'confirm' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                            {dialog.type === 'confirm' ? <AlertTriangle size={32}/> : <CheckCircle size={32}/>}
                        </div>
                        <h3 className="text-xl font-black text-gray-800 mb-2">{dialog.title}</h3>
                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">{dialog.message}</p>
                        
                        <div className="flex gap-3 w-full">
                            {dialog.type === 'confirm' && (
                                <button onClick={closeDialog} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">
                                    Cancelar
                                </button>
                            )}
                            <button onClick={handleDialogConfirm} className={`flex-1 py-3 font-bold rounded-xl text-white shadow-lg ${dialog.type === 'confirm' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-green-600 hover:bg-green-700 shadow-green-200'}`}>
                                {dialog.type === 'confirm' ? 'Confirmar' : 'Entendido'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

// -----------------------------------------------------
// SUB-COMPONENTES (MODAIS E FORMULÁRIOS)
// -----------------------------------------------------

function SupplyForm({ data, categories, close, save }) {
    const [form, setForm] = useState(data || { name: '', price: '', amount: '', unit: 'g', category: '' });
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black uppercase">{data ? 'Editar' : 'Novo'} Insumo</h2><button onClick={close} className="bg-gray-100 p-1 rounded-full"><X size={20}/></button></div>
                <div className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-400 uppercase">Nome</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:border-purple-300" placeholder="Ex: Açaí 5 Litros" autoFocus /></div>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-400 uppercase">Categoria</label>
                            <input list="category-options" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:border-purple-300" placeholder="Ex: Frutas" />
                            <datalist id="category-options">{categories.map(c => <option key={c} value={c} />)}</datalist>
                        </div>
                        <div className="w-1/3"><label className="text-xs font-bold text-gray-400 uppercase">Unid.</label><select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold bg-white outline-none"><option value="g">g</option><option value="ml">ml</option><option value="un">un</option></select></div>
                    </div>
                    <div className="flex gap-3"><div className="flex-1"><label className="text-xs font-bold text-gray-400 uppercase">Preço (R$)</label><input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:border-purple-300" /></div><div className="flex-1"><label className="text-xs font-bold text-gray-400 uppercase">Qtd Emb.</label><input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:border-purple-300" /></div></div>
                </div>
                <button onClick={() => save({...form, price: parseFloat(form.price), amount: parseFloat(form.amount)})} className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold mt-6 shadow-lg shadow-green-200">Salvar Insumo</button>
            </div>
        </div>
    )
}

function RecipesModal({ recipes, channels, close, onLoad, onDelete }) {
    const [search, setSearch] = useState('');
    const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

    const getRecipeSnapshot = (recipe) => {
        let cmv = 0;
        recipe.ingredients?.forEach(i => { cmv += (i.price / i.amount) * i.usedAmount; });
        
        // Proteção contra crash se channels estiver vazio ou carregando
        if (!channels || channels.length === 0) return { cmv, priceBalcao: 0, priceIfood: 0 };
        
        const baseChannel = channels.find(c => c.name.toLowerCase().includes('balcão') || c.name.toLowerCase().includes('balcao') || c.name.toLowerCase().includes('propria') || c.name.toLowerCase().includes('própria')) || channels[0];
        
        if (!baseChannel) return { cmv, priceBalcao: 0, priceIfood: 0 };

        const opCost = recipe.operational_percent || 30; 
        const profit = recipe.profit_percent || 20;
        const baseTotalVars = parseFloat(baseChannel.commission_percent) + parseFloat(baseChannel.payment_fee_percent) + parseFloat(opCost) + parseFloat(profit);
        const baseTotalFixed = cmv + parseFloat(baseChannel.fixed_fee);
        
        // Evita divisão por zero ou negativo
        const baseDivisor = Math.max(0.01, 1 - (Math.min(baseTotalVars, 95) / 100));
        const basePrice = baseTotalFixed / baseDivisor;
        const targetProfitMoney = basePrice * (profit / 100);

        const calcPrice = (searchName) => {
            const channel = channels.find(c => c.name.toLowerCase().includes(searchName));
            if (!channel) return 0;
            if (channel.id === baseChannel.id) return basePrice;
            const variableTaxPercent = parseFloat(channel.commission_percent) + parseFloat(channel.payment_fee_percent) + parseFloat(opCost);
            const numerator = cmv + parseFloat(channel.fixed_fee) + targetProfitMoney;
            const divisor = Math.max(0.01, 1 - (Math.min(variableTaxPercent, 95) / 100));
            return numerator / divisor;
        };

        return { cmv, priceBalcao: calcPrice('balcão') || calcPrice('balcao') || calcPrice('propria'), priceIfood: calcPrice('ifood') };
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black uppercase">Fichas Técnicas</h2><button onClick={close} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button></div>
                <div className="mb-4 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/><input value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-purple-200" placeholder="Pesquisar ficha..."/></div>
                <div className="flex-1 overflow-y-auto space-y-3">
                    {filtered.map(r => {
                        const snap = getRecipeSnapshot(r);
                        return (
                            <div key={r.id} className="flex justify-between items-center bg-white p-4 border border-gray-100 rounded-2xl hover:border-purple-200 hover:shadow-sm transition-all">
                                <div><h3 className="font-bold text-gray-800 text-lg">{r.name}</h3><p className="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-2"><span>{r.ingredients?.length || 0} itens</span><span>•</span><span>Lucro: <span className="text-green-600 font-bold">{r.profit_percent}%</span></span><span>•</span><span>CMV: R$ {snap.cmv.toFixed(2)}</span>{snap.priceBalcao > 0 && (<><span>•</span><span>Balcão: <strong className="text-gray-600">R$ {snap.priceBalcao.toFixed(2)}</strong></span></>)}{snap.priceIfood > 0 && (<><span>•</span><span>iFood: <strong className="text-gray-600">R$ {snap.priceIfood.toFixed(2)}</strong></span></>)}</p></div>
                                <div className="flex gap-2"><button onClick={() => onLoad(r)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 flex items-center gap-2"><Upload size={14}/> Abrir</button><button onClick={() => onDelete(r.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"><Trash2 size={16}/></button></div>
                            </div>
                        )
                    })}
                    {filtered.length === 0 && <p className="text-center text-gray-400 py-10">Nenhuma ficha encontrada.</p>}
                </div>
            </div>
        </div>
    )
}

function ChannelsModal({ channels, close, refresh, saveData, deleteData, confirmDialog }) {
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({});
    const handleEdit = (c) => { setEditingId(c.id); setForm(c); };
    const handleNew = () => { setEditingId('new'); setForm({ name: '', commission_percent: 0, payment_fee_percent: 0, fixed_fee: 0, color: 'bg-gray-200' }); };
    const handleSave = async () => { const payload = { ...form }; if (editingId === 'new') delete payload.id; await saveData('sales_channels', payload); await refresh(); setEditingId(null); };
    const handleDelete = (id) => { 
        if (confirmDialog) {
            confirmDialog('confirm', 'Excluir Canal?', 'Tem certeza que deseja apagar essa plataforma?', async () => {
                await deleteData('sales_channels', id);
                await refresh();
            });
        }
    }
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6"><div><h2 className="text-xl font-black uppercase">Taxas</h2><p className="text-xs text-gray-400">Configure as taxas</p></div><button onClick={close}><X/></button></div>
                <div className="flex-1 overflow-y-auto space-y-3">
                    {channels.map(c => (<div key={c.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50">{editingId === c.id ? (<ChannelForm form={form} setForm={setForm} onSave={handleSave} onCancel={() => setEditingId(null)}/>) : (<div className="flex justify-between items-center"><div className="flex items-center gap-3"><div className={`w-3 h-10 rounded-full ${c.color}`}></div><div><h4 className="font-bold text-gray-800">{c.name}</h4><p className="text-xs text-gray-500">Comissão: <strong>{c.commission_percent}%</strong> | Pgto: <strong>{c.payment_fee_percent}%</strong> | Fixo: <strong>R$ {c.fixed_fee}</strong></p></div></div><div className="flex gap-2"><button onClick={() => handleEdit(c)} className="p-2 bg-white border rounded-lg hover:bg-gray-100"><Edit3 size={14}/></button><button onClick={() => handleDelete(c.id)} className="p-2 bg-white border rounded-lg text-red-500 hover:bg-red-50"><Trash2 size={14}/></button></div></div>)}</div>))}
                    {editingId === 'new' && (<div className="border border-purple-200 bg-purple-50 rounded-xl p-4"><ChannelForm form={form} setForm={setForm} onSave={handleSave} onCancel={() => setEditingId(null)}/></div>)}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100"><button onClick={handleNew} disabled={editingId !== null} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"><Plus size={18}/> Novo Canal</button></div>
            </div>
        </div>
    )
}

function ChannelForm({ form, setForm, onSave, onCancel }) {
    return (
        <div className="space-y-3 animate-in fade-in">
            <div><label className="text-[10px] font-bold uppercase text-gray-400">Nome da Plataforma</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 rounded-lg border font-bold text-sm" /></div>
            <div className="grid grid-cols-3 gap-3"><div><label className="text-[10px] font-bold uppercase text-gray-400">Comissão %</label><input type="number" value={form.commission_percent} onChange={e => setForm({...form, commission_percent: e.target.value})} className="w-full p-2 rounded-lg border font-bold text-sm"/></div><div><label className="text-[10px] font-bold uppercase text-gray-400">Pgto %</label><input type="number" value={form.payment_fee_percent} onChange={e => setForm({...form, payment_fee_percent: e.target.value})} className="w-full p-2 rounded-lg border font-bold text-sm"/></div><div><label className="text-[10px] font-bold uppercase text-gray-400">Fixo R$</label><input type="number" value={form.fixed_fee} onChange={e => setForm({...form, fixed_fee: e.target.value})} className="w-full p-2 rounded-lg border font-bold text-sm"/></div></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] font-bold uppercase text-gray-400">Cor</label><input value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-full p-2 rounded-lg border font-bold text-sm" placeholder="bg-red-100"/></div><div className="flex gap-2 items-end"><button onClick={onSave} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-xs">Salvar</button><button onClick={onCancel} className="bg-gray-200 text-gray-600 py-2 px-4 rounded-lg font-bold text-xs">X</button></div></div>
        </div>
    )
}