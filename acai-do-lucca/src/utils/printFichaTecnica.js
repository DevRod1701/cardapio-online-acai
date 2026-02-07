export const printFichaTecnica = (recipe, cmvTotal) => {
    // Abre uma nova janela em branco
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
        alert("Por favor, permita pop-ups para imprimir.");
        return;
    }

    const date = new Date().toLocaleDateString('pt-BR');
    
    // Calcula ingredientes
    const ingredientsHtml = recipe.ingredients.map(item => `
        <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px;">${item.name}</td>
            <td style="padding: 8px; text-align: right; font-weight: bold;">${item.usedAmount} ${item.unit}</td>
        </tr>
    `).join('');

    // Formata o conteúdo HTML
    const htmlContent = `
        <html>
        <head>
            <title>Ficha Técnica - ${recipe.name}</title>
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #333; }
                h1 { text-transform: uppercase; font-size: 24px; margin-bottom: 5px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 14px; }
                .box { border: 1px solid #ccc; padding: 10px; border-radius: 4px; background: #f9f9f9; }
                h3 { border-bottom: 1px solid #999; padding-bottom: 5px; margin-top: 30px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
                th { text-align: left; background: #eee; padding: 8px; }
                .instructions { white-space: pre-wrap; line-height: 1.6; font-size: 14px; }
                .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
                @media print {
                    .no-print { display: none; }
                    body { -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <h1>${recipe.name} ${recipe.is_reusable ? '<span style="font-size:12px; background:#eee; padding:2px 6px; border-radius:4px; vertical-align:middle">PRÉ-PREPARO</span>' : ''}</h1>
            
            <div class="meta">
                <div class="box"><strong>Rendimento:</strong> ${recipe.yield_amount ? recipe.yield_amount + ' ' + recipe.yield_unit : 'N/A'}</div>
                <div class="box"><strong>Custo Total (CMV):</strong> R$ ${parseFloat(cmvTotal).toFixed(2)}</div>
            </div>

            <h3>Ingredientes</h3>
            <table>
                <thead>
                    <tr><th>Item</th><th style="text-align: right;">Qtd</th></tr>
                </thead>
                <tbody>
                    ${ingredientsHtml}
                </tbody>
            </table>

            ${recipe.instructions ? `
                <h3>Modo de Preparo</h3>
                <div class="instructions">${recipe.instructions}</div>
            ` : ''}

            <div class="footer">Gerado pelo Sistema Açaí do Lucca em ${date}</div>

            <script>
                window.onload = function() { window.print(); window.close(); }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};