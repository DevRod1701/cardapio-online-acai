import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, Plus, Trash2, Edit3, Save, Search, 
    Calculator, Package, PieChart, Printer, FileText,
    Settings, X, Upload, List, Coins, ToggleLeft, ToggleRight, 
    RotateCcw, Eraser, AlertTriangle, CheckCircle, Info,
    Sparkles, Loader2, Clock, Thermometer, Snowflake
} from 'lucide-react';
import { useData } from '../hooks/useData';
import { printFichaTecnica } from '../utils/printFichaTecnica'; // Certifique-se de ter criado este arquivo

export default function Pricing({ onBack }) {
  const { supplies, recipes, channels, saveData, deleteData, refreshData } = useData();
  
  // --- NAVEGAÇÃO MOBILE ---
  const [mobileTab, setMobileTab] = useState('supplies'); 

  // --- CONTROLE DE MODAIS ---
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isSupplyModalOpen, setIsSupplyModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false); 

  // --- DIÁLOGOS ---
  const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });

  const [editingSupply, setEditingSupply] = useState(null);

  // --- ESTADOS DA CALCULADORA ---
  const [recipeName, setRecipeName] = useState('');
  const [recipeId, setRecipeId] = useState(null);
  const [items, setItems] = useState([]); 
  
  // --- NOVOS ESTADOS: REUTILIZÁVEL E PREPARO ---
  const [isReusable, setIsReusable] = useState(false);
  const [yieldAmount, setYieldAmount] = useState(''); 
  const [yieldUnit, setYieldUnit] = useState('g');    
  const [instructions, setInstructions] = useState(''); 
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // --- CONFIGURAÇÕES FINANCEIRAS ---
  const [operationalCostPercent, setOperationalCostPercent] = useState(30);
  const [profitMarginPercent, setProfitMarginPercent] = useState(20);
  const [useFixedProfit, setUseFixedProfit] = useState(true); 
  const [manualPrices, setManualPrices] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todos');

  // --- HELPER DIÁLOGOS ---
  const showDialog = (type, title, message, onConfirm = null) => {
      setDialog({ isOpen: true, type, title, message, onConfirm });
  };
  const closeDialog = () => setDialog({ ...dialog, isOpen: false });
  const handleDialogConfirm = () => { if (dialog.onConfirm) dialog.onConfirm(); closeDialog(); };

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
          const baseChannel = channels.find(c => c.name.toLowerCase().match(/balcão|balcao|propria|própria/)) || channels[0];
          if (baseChannel) {
              const baseTotalVars = parseFloat(baseChannel.commission_percent) + parseFloat(baseChannel.payment_fee_percent) + parseFloat(operationalCostPercent) + parseFloat(profitMarginPercent);
              const baseTotalFixed = cmv + parseFloat(baseChannel.fixed_fee);
              const baseDivisor = Math.max(0.01, 1 - (Math.min(baseTotalVars, 95) / 100));
              basePrice = baseTotalFixed / baseDivisor;
              targetProfitMoney = basePrice * (profitMarginPercent / 100);
          }
      }

      const results = channels.map(channel => {
          let autoPrice = 0;
          if (useFixedProfit) {
             const isBase = channel.name.toLowerCase().match(/balcão|balcao|propria|própria/);
             if (isBase) {
                 autoPrice = basePrice;
             } else {
                 const variableTaxPercent = parseFloat(channel.commission_percent) + parseFloat(channel.payment_fee_percent) + parseFloat(operationalCostPercent);
                 const numerator = cmv + parseFloat(channel.fixed_fee) + targetProfitMoney;
                 const divisor = Math.max(0.01, 1 - (Math.min(variableTaxPercent, 95) / 100));
                 autoPrice = numerator / divisor;
             }
          } else {
             const totalVariablePercent = parseFloat(channel.commission_percent) + parseFloat(channel.payment_fee_percent) + parseFloat(operationalCostPercent) + parseFloat(profitMarginPercent);
             const totalFixedCost = cmv + parseFloat(channel.fixed_fee);
             const divisor = Math.max(0.01, 1 - (Math.min(totalVariablePercent, 95) / 100));
             autoPrice = totalFixedCost / divisor;
          }

          const hasManualPrice = !useFixedProfit && manualPrices[channel.id];
          const finalPrice = hasManualPrice ? parseFloat(manualPrices[channel.id]) : autoPrice;
          const variableFees = finalPrice * ((channel.commission_percent + channel.payment_fee_percent) / 100);
          const fixedFees = parseFloat(channel.fixed_fee);
          const operationalCost = finalPrice * (operationalCostPercent / 100);
          const realProfit = finalPrice - variableFees - fixedFees - operationalCost - cmv;
          const realMargin = finalPrice > 0 ? (realProfit / finalPrice) * 100 : 0;

          return {
              ...channel, suggestedPrice: finalPrice, isManual: hasManualPrice, calculatedMargin: realMargin,
              breakdown: { profit: realProfit, platformFee: variableFees + fixedFees, operational: operationalCost, cmv: cmv }
          };
      });

      return { cmv, results };
  };

  const { cmv, results } = calculateFinancials();

  // --- ACTIONS ---
  const handleClearCalculator = () => {
      if (items.length > 0) {
          showDialog('confirm', 'Limpar Simulação?', 'Deseja apagar tudo e começar do zero?', () => {
              setRecipeName(''); setRecipeId(null); setItems([]); setManualPrices({});
              setIsReusable(false); setYieldAmount(''); setInstructions('');
          });
      } else {
          setRecipeName(''); setRecipeId(null); setItems([]); setManualPrices({});
          setIsReusable(false); setYieldAmount(''); setInstructions('');
      }
  };

  const loadRecipeData = (recipe) => {
      setRecipeId(recipe.id);
      setRecipeName(recipe.name);
      setItems(recipe.ingredients || []);
      setProfitMarginPercent(recipe.profit_percent);
      setOperationalCostPercent(recipe.operational_percent || 30);
      setIsReusable(recipe.is_reusable || false);
      setYieldAmount(recipe.yield_amount || '');
      setYieldUnit(recipe.yield_unit || 'g');
      setInstructions(recipe.instructions || '');
      setManualPrices({});
  };

  const loadRecipe = (recipe) => {
      loadRecipeData(recipe);
      setIsRecipeModalOpen(false); 
      setMobileTab('recipe'); 
  };

  const handlePrint = () => {
      printFichaTecnica({
          name: recipeName, ingredients: items, yield_amount: yieldAmount, yield_unit: yieldUnit, instructions: instructions, is_reusable: isReusable
      }, cmv);
  };

  const handlePrintFromModal = (recipe) => {
      let recipeCmv = 0;
      recipe.ingredients?.forEach(i => { recipeCmv += (i.price / i.amount) * i.usedAmount; });
      printFichaTecnica(recipe, recipeCmv);
  };

  const handleSaveRecipe = async () => {
      if(!recipeName) return showDialog('alert', 'Atenção', 'Dê um nome para o produto!');
      if(items.length === 0) return showDialog('alert', 'Atenção', 'Adicione ingredientes!');
      if(isReusable && (!yieldAmount || yieldAmount <= 0)) return showDialog('alert', 'Atenção', 'Se é reutilizável, informe o RENDIMENTO total (ex: 2000g).');

      const recipePayload = {
          name: recipeName,
          ingredients: items,
          profit_percent: profitMarginPercent,
          operational_percent: operationalCostPercent,
          is_reusable: isReusable,
          yield_amount: parseFloat(yieldAmount) || 0,
          yield_unit: yieldUnit,
          instructions: instructions
      };
      if(recipeId) recipePayload.id = recipeId;
      
      const recipeSaved = await saveData('recipes', recipePayload);

      let supplySaved = true;
      if (isReusable && recipeSaved) {
          const newSupply = {
              name: `[PREP] ${recipeName}`,
              price: cmv, 
              amount: parseFloat(yieldAmount), 
              unit: yieldUnit,
              category: 'Pré-preparo'
          };
          supplySaved = await saveData('supplies', newSupply);
      }
      
      if(recipeSaved && supplySaved) {
          await refreshData();
          showDialog('alert', 'Sucesso', isReusable ? 'Ficha salva E Insumo criado com sucesso!' : 'Ficha técnica salva com sucesso!');
      }
  };

  // --- NOVA SIMULAÇÃO DE IA AVANÇADA (PADRÃO ANVISA) ---
  const handleImproveWithAI = async () => {
    if (items.length === 0 && !instructions) {
        return showDialog('alert', 'Vazio', 'Adicione ingredientes ou escreva um rascunho primeiro.');
    }

    setIsGeneratingAI(true);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simula "pensando"

    // 1. Analisa os ingredientes
    const ingredientsList = items.map(i => `   [ ] ${i.usedAmount} ${i.unit} de ${i.name}`).join('\n');
    
    // 2. Tenta encontrar padrões no texto do usuário
    const rawText = instructions.toLowerCase();
    const hasOven = rawText.includes('forno') || rawText.includes('assar');
    const hasFridge = rawText.includes('geladeira') || rawText.includes('resfriar');
    const hasStove = rawText.includes('fogo') || rawText.includes('panela') || rawText.includes('ferver');

    // 3. Extrai tempos e temperaturas se houver
    const timeMatch = rawText.match(/(\d+)\s*(min|minutos|horas|h)/);
    const tempMatch = rawText.match(/(\d+)\s*(graus|°|c)/);
    const timeInfo = timeMatch ? `${timeMatch[1]} ${timeMatch[2]}` : '(Definir Tempo)';
    const tempInfo = tempMatch ? `${tempMatch[1]}°C` : (hasOven ? '180°C' : (hasStove ? 'Fogo Médio' : 'N/A'));

    // 4. Formata o Passo a Passo (Quebra linhas se o user não quebrou)
    let formattedSteps = instructions
        .split(/\.|\n/) // Quebra por ponto ou nova linha
        .filter(step => step.trim().length > 3) // Remove linhas vazias
        .map((step, i) => `   ${i + 1}. ${step.trim()}${step.trim().endsWith('.') ? '' : '.'}`)
        .join('\n');

    if (!formattedSteps) formattedSteps = "   1. Misturar todos os ingredientes conforme a ordem da receita.\n   2. Finalizar e porcionar.";

    // 5. Monta o Texto Final Profissional
    const aiGeneratedText = `PADRONIZAÇÃO TÉCNICA: ${recipeName.toUpperCase() || 'PRODUTO'}

=========================================
1. MISE EN PLACE (SEPARAÇÃO E PESAGEM)
=========================================
${ingredientsList}
   [ ] Utensílios higienizados e secos.

=========================================
2. MODO DE PREPARO (FLUXO)
=========================================
${formattedSteps}

=========================================
3. PONTOS CRÍTICOS DE CONTROLE (PCC)
=========================================
   🌡️ TEMPERATURA: ${tempInfo}
   ⏱️ TEMPO ESTIMADO: ${timeInfo}
   ${hasFridge ? '❄️ RESFRIAMENTO: Baixar temperatura para 4°C em até 2h.' : ''}
   ${hasOven || hasStove ? '🔥 COCÇÃO: Garantir temperatura interna acima de 70°C.' : ''}

=========================================
4. ARMAZENAMENTO E VALIDADE
=========================================
   - Embalagem: Pote hermético com etiqueta.
   - Validade Refrigerado (0°C a 5°C): 3 Dias.
   - Validade Congelado (-18°C): 30 a 90 Dias.
   - Após aberto: Consumir imediatamente.`;

    setInstructions(aiGeneratedText);
    setIsGeneratingAI(false);
  };

  const handleDeleteRecipe = (id) => { 
      showDialog(
          'confirm', 
          'Excluir Ficha?', 
          'Essa ação apagará a ficha técnica permanentemente.', 
          async () => { 
              await deleteData('recipes', id);
              await refreshData();
          }
      ); 
  };

  const handleSaveSupply = async (data) => { await saveData('supplies', data); setIsSupplyModalOpen(false); setEditingSupply(null); };
  const handleDeleteSupply = (id) => { showDialog('confirm', 'Excluir Insumo?', 'Tem certeza?', async () => { await deleteData('supplies', id); }); };
  const handlePriceChange = (id, value) => { setManualPrices(prev => ({ ...prev, [id]: value })); };
  const handleResetPrice = (id) => { const newPrices = { ...manualPrices }; delete newPrices[id]; setManualPrices(newPrices); };
  
  const filteredSupplies = supplies.filter(s => { const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()); const matchesCat = filterCategory === 'Todos' || s.category === filterCategory; return matchesSearch && matchesCat; });
  const uniqueCategories = [...new Set(supplies.map(s => s.category || 'Geral'))];
  const categories = ['Todos', ...uniqueCategories];
  const addSupplyToRecipe = (supply) => { setItems([...items, { ...supply, usedAmount: 0 }]); };
  const updateAmount = (index, val) => { const newItems = [...items]; newItems[index].usedAmount = parseFloat(val) || 0; setItems(newItems); };
  const removeRecipeItem = (index) => { setItems(items.filter((_, i) => i !== index)); };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans overflow-hidden fixed inset-0">
        
        <style>{`
            input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
            input[type=number] { -moz-appearance: textfield; }
        `}</style>

        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex justify-between items-center shrink-0 z-20">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20}/></button>
                <div><h1 className="text-lg font-black uppercase tracking-tight flex items-center gap-2"><Calculator className="text-purple-600" size={20}/> <span className="hidden sm:inline">Calculadora</span><span className="sm:hidden">Calc</span></h1></div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsChannelModalOpen(true)} className="px-3 py-2 bg-gray-900 text-white text-[10px] sm:text-xs font-bold rounded-lg hover:bg-black flex items-center gap-2"><Settings size={14}/> Taxas</button>
                <button onClick={() => setIsRecipeModalOpen(true)} className="px-3 py-2 bg-purple-50 text-purple-700 text-[10px] sm:text-xs font-bold rounded-lg hover:bg-purple-100 flex items-center gap-2"><Package size={14}/> Fichas</button>
            </div>
        </header>

        {/* MOBILE TABS */}
        <div className="md:hidden flex bg-white border-b border-gray-200 shrink-0">
            <button onClick={() => setMobileTab('supplies')} className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 ${mobileTab === 'supplies' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400'}`}><List size={16}/> Insumos</button>
            <button onClick={() => setMobileTab('recipe')} className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 relative ${mobileTab === 'recipe' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400'}`}><Package size={16}/> Montagem</button>
            <button onClick={() => setMobileTab('results')} className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 ${mobileTab === 'results' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-400'}`}><Coins size={16}/> Lucro</button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            
            {/* COLUNA 1: INSUMOS */}
            <div className={`w-full md:w-1/4 bg-white border-r border-gray-200 flex-col z-10 ${mobileTab === 'supplies' ? 'flex h-full' : 'hidden md:flex h-full'}`}>
                <div className="p-4 border-b border-gray-100 space-y-3 shrink-0">
                    <button onClick={() => { setEditingSupply(null); setIsSupplyModalOpen(true); }} className="w-full bg-green-600 text-white py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-green-700"><Plus size={16}/> Novo Insumo</button>
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full pl-9 p-2 bg-gray-50 rounded-lg text-sm outline-none border border-transparent focus:border-purple-200 bg-gray-50"/></div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{categories.map(cat => (<button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border ${filterCategory === cat ? 'bg-purple-100 border-purple-200 text-purple-700' : 'bg-white border-gray-100 text-gray-500'}`}>{cat}</button>))}</div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 pb-24 md:pb-2">
                    {filteredSupplies.map(s => (
                        <div key={s.id} onClick={() => addSupplyToRecipe(s)} className="p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50 cursor-pointer group relative active:scale-95 transition-transform">
                            <div className="flex justify-between items-start pr-8"><h4 className="font-bold text-sm text-gray-700">{s.name}</h4></div>
                            <div className="flex justify-between mt-1 text-[10px] text-gray-400 pr-8"><span>{s.category || 'Geral'}</span><span>R$ {(s.price/s.amount).toFixed(4)}/{s.unit}</span></div>
                            <div className="absolute right-2 top-2 flex flex-col gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); setEditingSupply(s); setIsSupplyModalOpen(true); }} className="p-1 bg-blue-100 text-blue-600 rounded"><Edit3 size={12}/></button><button onClick={(e) => { e.stopPropagation(); handleDeleteSupply(s.id); }} className="p-1 bg-red-100 text-red-600 rounded"><Trash2 size={12}/></button></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* COLUNA 2: CALCULADORA */}
            <div className={`flex-1 bg-gray-50 flex-col overflow-y-auto ${mobileTab === 'recipe' ? 'flex h-full' : 'hidden md:flex h-full'}`}>
                <div className="p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6 pb-24 md:pb-6">
                    
                    {/* Header */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 relative">
                        <div className="flex justify-between items-start mb-1">
                            <label className="text-xs font-bold text-gray-400 uppercase block">Nome do Produto</label>
                            <button onClick={handleClearCalculator} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-gray-200 hover:text-red-500 transition-colors"><Eraser size={12}/> Limpar / Novo</button>
                        </div>
                        <input value={recipeName} onChange={e => setRecipeName(e.target.value)} placeholder="Ex: Açaí 500ml" className="w-full text-lg font-black text-gray-800 outline-none placeholder-gray-300"/>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3">
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsReusable(!isReusable)}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isReusable ? 'bg-purple-600 border-purple-600' : 'bg-gray-100 border-gray-300'}`}>{isReusable && <CheckCircle size={14} className="text-white"/>}</div>
                                <span className="text-sm font-bold text-gray-700">Este item é um Pré-preparo (Reutilizável)?</span>
                            </div>
                            {isReusable && (
                                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex gap-3">
                                        <div className="flex-1"><label className="text-[10px] font-bold text-purple-800 uppercase">Rendimento Final</label><input type="number" value={yieldAmount} onChange={e => setYieldAmount(e.target.value)} placeholder="Ex: 2000" className="w-full p-2 rounded-lg border border-purple-200 text-sm font-bold outline-none"/></div>
                                        <div className="w-1/3"><label className="text-[10px] font-bold text-purple-800 uppercase">Unidade</label><select value={yieldUnit} onChange={e => setYieldUnit(e.target.value)} className="w-full p-2 rounded-lg border border-purple-200 text-sm font-bold bg-white outline-none"><option value="g">g (Gramas)</option><option value="ml">ml (Líquido)</option><option value="un">un (Unidade)</option></select></div>
                                    </div>
                                    <p className="text-[10px] text-purple-600 mt-2 leading-tight"><Info size={10} className="inline mr-1"/> Ao salvar, um novo insumo será criado automaticamente.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Ingredientes */}
                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 min-h-[300px]">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide"><Package size={16} className="text-purple-600"/> Composição</h3>
                        {items.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-xl"><p className="text-gray-400 text-sm">Lista Vazia.</p><button onClick={() => setMobileTab('supplies')} className="md:hidden mt-2 text-purple-600 font-bold text-sm underline">Ir para Insumos</button></div>
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
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center"><span className="text-sm font-bold text-gray-500">Total CMV</span><span className="text-xl font-black text-gray-800">R$ {cmv.toFixed(2)}</span></div>
                    </div>

                    {/* Modo de Preparo Inteligente */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                             <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><FileText size={14}/> Modo de Preparo</label>
                             <button 
                                onClick={handleImproveWithAI} 
                                disabled={isGeneratingAI}
                                className={`text-[10px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1 transition-all ${isGeneratingAI ? 'bg-gray-100 text-gray-400' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                             >
                                {isGeneratingAI ? <><Loader2 size={12} className="animate-spin"/> Inteligência Artificial...</> : <><Sparkles size={12}/> Melhorar com IA</>}
                             </button>
                        </div>
                        <div className="mb-2 text-[10px] text-gray-400 flex gap-4">
                            <span className="flex items-center gap-1"><Clock size={10}/> Dica: Cite o tempo (10 min)</span>
                            <span className="flex items-center gap-1"><Thermometer size={10}/> Dica: Cite temperatura (180°)</span>
                        </div>
                        <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Escreva o passo a passo resumido (ex: misturar tudo, ferver 10 min, resfriar na geladeira)..." className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm h-64 outline-none focus:border-purple-200 resize-none font-medium leading-relaxed font-mono"/>
                    </div>
                    
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="flex-1 bg-white border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50"><Printer size={18}/> Imprimir</button>
                        <button onClick={handleSaveRecipe} className={`flex-[2] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl transition-colors ${recipeId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-black'}`}>{recipeId ? <><Edit3 size={18}/> Atualizar</> : <><Save size={18}/> Salvar</>}</button>
                    </div>
                </div>
            </div>

            {/* COLUNA 3: RESULTADOS */}
            <div className={`w-full md:w-[380px] bg-white border-l border-gray-200 flex-col overflow-y-auto ${mobileTab === 'results' ? 'flex h-full' : 'hidden md:flex h-full'}`}>
                <div className="p-6 bg-purple-900 text-white shrink-0">
                    <h2 className="font-bold flex items-center gap-2 mb-6"><PieChart size={18} className="text-green-400"/> Configuração de Lucro</h2>
                    <div className="space-y-4">
                        <div><div className="flex justify-between text-xs text-purple-200 mb-1 uppercase font-bold">Custos Fixos/Operacionais</div><div className="relative"><input type="number" value={operationalCostPercent} onChange={e => setOperationalCostPercent(parseFloat(e.target.value)||0)} className="w-full bg-purple-800/50 border border-purple-700 rounded-lg p-2 text-white font-bold outline-none focus:border-green-400"/><span className="absolute right-3 top-2 text-purple-300 font-bold">%</span></div></div>
                        <div><div className="flex justify-between text-xs text-purple-200 mb-1 uppercase font-bold">Margem de Lucro Líquida</div><div className="relative"><input type="number" value={profitMarginPercent} onChange={e => setProfitMarginPercent(parseFloat(e.target.value)||0)} className="w-full bg-purple-800/50 border border-purple-700 rounded-lg p-2 text-white font-bold outline-none focus:border-green-400"/><span className="absolute right-3 top-2 text-purple-300 font-bold">%</span></div></div>
                        <div className="pt-2 border-t border-purple-800/50">
                            <div className="flex items-center justify-between cursor-pointer" onClick={() => { setUseFixedProfit(!useFixedProfit); setManualPrices({}); }}>
                                <div><p className="text-xs font-bold text-green-400">{useFixedProfit ? 'Modo Lucro Fixo (Padrão)' : 'Modo Cálculo Completo'}</p><p className="text-[10px] text-purple-300">{useFixedProfit ? 'Preço Automático (Não Editável)' : 'Permite editar preço de venda'}</p></div>
                                <div className="text-green-400">{useFixedProfit ? <ToggleRight size={32}/> : <ToggleLeft size={32} className="text-purple-400"/>}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex-1 p-4 space-y-4 pb-24 md:pb-4 overflow-y-auto">
                    {results.map((res, idx) => (
                        <div key={idx} className={`bg-white p-4 rounded-xl shadow-lg border relative overflow-hidden group ${res.name.includes('iFood') ? 'border-red-100' : 'border-gray-100'} ${res.isManual ? 'ring-2 ring-yellow-200' : ''}`}>
                            <div className={`absolute top-0 left-0 w-1 h-full ${res.color || 'bg-gray-200'}`}></div>
                            <div className="pl-2">
                                <div className="flex justify-between items-start mb-1"><span className="font-bold text-sm text-gray-700">{res.name}</span><span className="text-[9px] bg-gray-100 px-1 rounded text-gray-500 font-bold">Fee: {res.commission_percent}%</span></div>
                                <div className="flex items-center gap-2 mb-2"><span className="text-xs text-gray-400">Venda:</span>{useFixedProfit ? (<span className="text-2xl font-black text-gray-800">R$ {res.suggestedPrice.toFixed(2)}</span>) : (<div className="relative flex-1"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">R$</span><input type="number" value={manualPrices[res.id] !== undefined ? manualPrices[res.id] : res.suggestedPrice.toFixed(2)} onChange={(e) => handlePriceChange(res.id, e.target.value)} onFocus={(e) => e.target.select()} className={`w-full pl-8 pr-2 py-1 rounded-lg border font-black text-lg outline-none transition-all ${res.isManual ? 'border-yellow-400 bg-yellow-50 text-yellow-900' : 'border-gray-200 text-gray-800 bg-transparent focus:border-purple-300'}`}/>{res.isManual && (<button onClick={() => handleResetPrice(res.id)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500"><RotateCcw size={14}/></button>)}</div>)}</div>
                                <div className="text-[10px] space-y-1 pt-2 border-t border-gray-50 text-gray-400"><div className="flex justify-between"><span>Taxas (Plat + Fixa):</span> <span className="text-red-400">- R$ {res.breakdown.platformFee.toFixed(2)}</span></div><div className="flex justify-between"><span>Custos Fixos ({operationalCostPercent}%):</span> <span className="text-orange-400">- R$ {res.breakdown.operational.toFixed(2)}</span></div><div className="flex justify-between"><span>Ingredientes:</span> <span className="text-gray-500">- R$ {res.breakdown.cmv.toFixed(2)}</span></div><div className={`flex justify-between font-bold px-1 rounded mt-1 ${res.breakdown.profit < 0 ? 'bg-red-100 text-red-600' : 'bg-green-50 text-green-600'}`}><span>Lucro Real {res.isManual ? '(Manual)' : useFixedProfit ? '(Fixo)' : `(${profitMarginPercent}%)`}:</span> <span>R$ {res.breakdown.profit.toFixed(2)} ({res.calculatedMargin.toFixed(1)}%)</span></div></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* --- MODAIS E DIALOGOS --- */}
        {isChannelModalOpen && <ChannelsModal channels={channels} close={() => setIsChannelModalOpen(false)} refresh={refreshData} saveData={saveData} deleteData={deleteData} confirmDialog={showDialog} />}
        {isSupplyModalOpen && <SupplyForm data={editingSupply} categories={uniqueCategories} close={() => setIsSupplyModalOpen(false)} save={handleSaveSupply} />}
        {isRecipeModalOpen && <RecipesModal recipes={recipes} channels={channels} close={() => setIsRecipeModalOpen(false)} onLoad={loadRecipe} onPrint={handlePrintFromModal} onDelete={handleDeleteRecipe} />}
        
        {/* MODAL GLOBAL */}
        {dialog.isOpen && (
            <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl scale-100 animate-in zoom-in-95">
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${dialog.type === 'confirm' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>{dialog.type === 'confirm' ? <AlertTriangle size={32}/> : <CheckCircle size={32}/>}</div>
                        <h3 className="text-xl font-black text-gray-800 mb-2">{dialog.title}</h3>
                        <p className="text-gray-500 text-sm mb-6 leading-relaxed">{dialog.message}</p>
                        <div className="flex gap-3 w-full">
                            {dialog.type === 'confirm' && (<button onClick={closeDialog} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">Cancelar</button>)}
                            <button onClick={handleDialogConfirm} className={`flex-1 py-3 font-bold rounded-xl text-white shadow-lg ${dialog.type === 'confirm' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-green-600 hover:bg-green-700 shadow-green-200'}`}>{dialog.type === 'confirm' ? 'Confirmar' : 'Entendido'}</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

// ------------------------------------
// SUB-COMPONENTES
// ------------------------------------

function SupplyForm({ data, categories, close, save }) {
    const [form, setForm] = useState(data || { name: '', price: '', amount: '', unit: 'g', category: '' });
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black uppercase">{data ? 'Editar' : 'Novo'} Insumo</h2><button onClick={close} className="bg-gray-100 p-1 rounded-full"><X size={20}/></button></div>
                <div className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-400 uppercase">Nome</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:border-purple-300" placeholder="Ex: Açaí 5 Litros" autoFocus /></div>
                    <div className="flex gap-3">
                        <div className="flex-1"><label className="text-xs font-bold text-gray-400 uppercase">Categoria</label><input list="cat-options" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:border-purple-300" placeholder="Ex: Frutas"/><datalist id="cat-options">{categories.map(c => <option key={c} value={c}/>)}</datalist></div>
                        <div className="w-1/3"><label className="text-xs font-bold text-gray-400 uppercase">Unid.</label><select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold bg-white outline-none"><option value="g">g</option><option value="ml">ml</option><option value="un">un</option></select></div>
                    </div>
                    <div className="flex gap-3"><div className="flex-1"><label className="text-xs font-bold text-gray-400 uppercase">Preço (R$)</label><input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:border-purple-300" /></div><div className="flex-1"><label className="text-xs font-bold text-gray-400 uppercase">Qtd Emb.</label><input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold outline-none focus:border-purple-300" /></div></div>
                </div>
                <button onClick={() => save({...form, price: parseFloat(form.price), amount: parseFloat(form.amount)})} className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold mt-6 shadow-lg shadow-green-200">Salvar Insumo</button>
            </div>
        </div>
    )
}

function RecipesModal({ recipes, channels, close, onLoad, onDelete, onPrint }) {
    const [search, setSearch] = useState('');
    const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

    const getRecipeSnapshot = (recipe) => {
        let cmv = 0; recipe.ingredients?.forEach(i => { cmv += (i.price / i.amount) * i.usedAmount; });
        if (!channels || channels.length === 0) return { cmv, priceBalcao: 0, priceIfood: 0 };
        const baseChannel = channels.find(c => c.name.toLowerCase().match(/balcão|balcao|propria|própria/)) || channels[0];
        if (!baseChannel) return { cmv, priceBalcao: 0, priceIfood: 0 };
        const opCost = recipe.operational_percent || 30; const profit = recipe.profit_percent || 20;
        const baseTotalVars = parseFloat(baseChannel.commission_percent) + parseFloat(baseChannel.payment_fee_percent) + parseFloat(opCost) + parseFloat(profit);
        const baseTotalFixed = cmv + parseFloat(baseChannel.fixed_fee);
        const baseDivisor = Math.max(0.01, 1 - (Math.min(baseTotalVars, 95) / 100));
        const basePrice = baseTotalFixed / baseDivisor;
        const targetProfitMoney = basePrice * (profit / 100);
        const calcPrice = (searchName) => {
            const channel = channels.find(c => c.name.toLowerCase().includes(searchName)); if (!channel) return 0; if (channel.id === baseChannel.id) return basePrice;
            const variableTaxPercent = parseFloat(channel.commission_percent) + parseFloat(channel.payment_fee_percent) + parseFloat(opCost);
            const numerator = cmv + parseFloat(channel.fixed_fee) + targetProfitMoney; const divisor = Math.max(0.01, 1 - (Math.min(variableTaxPercent, 95) / 100));
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
                                <div><h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">{r.name} {r.is_reusable && <span className="text-[9px] bg-purple-100 text-purple-700 px-2 rounded-full font-bold">PREP</span>}</h3><p className="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-2"><span>{r.ingredients?.length || 0} itens</span><span>•</span><span>Lucro: <span className="text-green-600 font-bold">{r.profit_percent}%</span></span><span>•</span><span>CMV: R$ {snap.cmv.toFixed(2)}</span>{snap.priceBalcao > 0 && (<><span>•</span><span>Balcão: <strong className="text-gray-600">R$ {snap.priceBalcao.toFixed(2)}</strong></span></>)}{snap.priceIfood > 0 && (<><span>•</span><span>iFood: <strong className="text-gray-600">R$ {snap.priceIfood.toFixed(2)}</strong></span></>)}</p></div>
                                <div className="flex gap-2">
                                    <button onClick={() => onPrint(r)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200" title="Imprimir"><Printer size={16}/></button>
                                    <button onClick={() => onLoad(r)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 flex items-center gap-2"><Upload size={14}/> Abrir</button>
                                    <button onClick={() => onDelete(r.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"><Trash2 size={16}/></button>
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

function ChannelsModal({ channels, close, refresh, saveData, deleteData, confirmDialog }) {
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({});
    const handleEdit = (c) => { setEditingId(c.id); setForm(c); };
    const handleNew = () => { setEditingId('new'); setForm({ name: '', commission_percent: 0, payment_fee_percent: 0, fixed_fee: 0, color: 'bg-gray-200' }); };
    const handleSave = async () => { const payload = { ...form }; if (editingId === 'new') delete payload.id; await saveData('sales_channels', payload); await refresh(); setEditingId(null); };
    const handleDelete = (id) => { if (confirmDialog) confirmDialog('confirm', 'Excluir Canal?', 'Tem certeza?', async () => { await deleteData('sales_channels', id); await refresh(); }); }
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