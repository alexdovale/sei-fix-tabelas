(function () {
  'use strict';

  // 1. Limpa e força a borda inline em todas as tabelas e células (incluindo coladas do Excel)
  function corrigirHtmlTabelas(html) {
    if (!html || !html.includes('<table')) return html;

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const tabelas = doc.querySelectorAll('table');
    let alterou = false;

    tabelas.forEach((tabela) => {
      const styleAttr = (tabela.getAttribute('style') || '').toLowerCase().replace(/\s+/g, '');

      // Só ignora se o usuário explicitamente marcou border-style:none (e não for tabela colada do Excel com 0px)
      const temCelulaExcel = tabela.querySelector('td[class^="xl"], th[class^="xl"]');
      if (!temCelulaExcel && (styleAttr.includes('border-style:none') || styleAttr.includes('border:none'))) {
        return;
      }

      // Garante atributos na tag <table> para o gerador de PDF do SEI
      tabela.style.borderCollapse = 'collapse';
      tabela.setAttribute('border', '1');

      // Corrige border-width: 0px vindo do Excel
      let largura = tabela.style.borderWidth;
      if (!largura || largura === '0px' || largura === '0pt' || largura === '0') {
        largura = '1px';
      }

      let estilo = tabela.style.borderStyle;
      if (!estilo || estilo === 'none' || estilo === 'hidden') {
        estilo = 'solid';
      }

      let cor = tabela.style.borderColor;
      if (!cor || cor === 'windowtext' || cor === 'initial' || cor === 'inherit') {
        cor = '#000000';
      }

      const bordaPadrao = `${largura} ${estilo} ${cor}`;
      tabela.style.border = bordaPadrao;

      // Aplica em cada <td> e <th>
      const celulas = tabela.querySelectorAll('td, th');
      celulas.forEach((celula) => {
        const styleCelula = (celula.getAttribute('style') || '').toLowerCase().replace(/\s+/g, '');

        if (!temCelulaExcel && (styleCelula.includes('border-style:none') || styleCelula.includes('border:none'))) {
          return;
        }

        // Corrige células sem border-style ou com windowtext do Excel
        let cLargura = celula.style.borderWidth;
        if (!cLargura || cLargura === '0px' || cLargura === '0pt' || cLargura === '0') {
          cLargura = largura;
        }

        let cEstilo = celula.style.borderStyle;
        if (!cEstilo || cEstilo === 'none' || cEstilo === 'hidden') {
          cEstilo = 'solid';
        }

        let cCor = celula.style.borderColor;
        if (!cCor || cCor === 'windowtext' || cCor === 'initial' || cCor === 'inherit') {
          cCor = '#000000';
        }

        celula.style.border = `${cLargura} ${cEstilo} ${cCor}`;
      });

      alterou = true;
    });

    return alterou ? doc.body.innerHTML : html;
  }

  // 2. Aplica a correção em todas as instâncias do CKEditor 5, no modo Código-Fonte (>_ ) e nos textareas do SEI
  function aplicarCorrecaoGeral() {
    let totalCorrigido = 0;

    // A) Se o modo Código-Fonte (>_ ) estiver aberto, corrige direto no textarea do Source Editing
    const sourceTextareas = document.querySelectorAll('.ck-source-editing-area textarea');
    sourceTextareas.forEach((ta) => {
      if (ta.value && ta.value.includes('<table')) {
        const novo = corrigirHtmlTabelas(ta.value);
        if (novo !== ta.value) {
          ta.value = novo;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          totalCorrigido++;
        }
      }
    });

    // B) Instâncias visuais do CKEditor 5 (.ck-editor__editable)
    const editaveis = document.querySelectorAll('.ck-editor__editable');
    editaveis.forEach((el) => {
      const editor = el.ckeditorInstance;
      if (editor && typeof editor.getData === 'function') {
        const atual = editor.getData();
        if (atual && atual.includes('<table')) {
          const novo = corrigirHtmlTabelas(atual);
          if (novo !== atual) {
            editor.setData(novo);
            totalCorrigido++;
          }
        }
      }
    });

    // C) Textareas ocultos do formulário do SEI (que vão para o banco no submit)
    const formTextareas = document.querySelectorAll('form textarea, textarea[name^="txa"]');
    formTextareas.forEach((ta) => {
      if (ta.value && ta.value.includes('<table')) {
        const novo = corrigirHtmlTabelas(ta.value);
        if (novo !== ta.value) {
          ta.value = novo;
          totalCorrigido++;
        }
      }
    });

    return totalCorrigido;
  }

  // 3. Cria um botão flutuante discreto no canto inferior direito do editor para teste e uso manual imediato
  function criarBotaoFlutuante() {
    if (document.getElementById('btn-sei-fix-tabelas')) return;
    if (!document.querySelector('.ck-editor__editable, #frmEditor, table.infra-doc-tabela')) return;

    const btn = document.createElement('button');
    btn.id = 'btn-sei-fix-tabelas';
    btn.type = 'button';
    btn.innerText = '🔧 Fixar Bordas PDF';
    btn.style.cssText =
      'position:fixed;bottom:42px;right:16px;z-index:999999;background:#059669;color:#fff;border:none;border-radius:8px;padding:8px 14px;font:600 13px system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.25);transition:all 0.2s;';

    btn.addEventListener('click', () => {
      const qtd = aplicarCorrecaoGeral();
      btn.innerText = qtd > 0 ? '✓ Bordas Aplicadas!' : '✓ Tabelas já OK!';
      btn.style.background = '#2563eb';
      setTimeout(() => {
        btn.innerText = '🔧 Fixar Bordas PDF';
        btn.style.background = '#059669';
      }, 2000);
    });

    document.body.appendChild(btn);
  }

  // 4. Intercepta cliques no botão Salvar, no botão Código-Fonte (>_ ) e atalhos
  function iniciar() {
    criarBotaoFlutuante();
    // Verifica periodicamente caso o CKEditor demore alguns milissegundos para montar na tela
    setInterval(criarBotaoFlutuante, 2000);

    document.addEventListener(
      'click',
      (e) => {
        const btn = e.target.closest('button, a, input, [data-cke-tooltip-text]');
        if (!btn) return;

        const info = (
          (btn.getAttribute('title') || '') +
          ' ' +
          (btn.getAttribute('aria-label') || '') +
          ' ' +
          (btn.getAttribute('data-cke-tooltip-text') || '') +
          ' ' +
          (btn.innerText || '')
        ).toLowerCase();

        // Roda antes de Salvar ou antes de abrir o Código-Fonte (>_ )
        if (info.includes('salvar') || info.includes('código') || info.includes('codigo') || info.includes('source')) {
          aplicarCorrecaoGeral();
        }
      },
      true
    );

    document.addEventListener(
      'keydown',
      (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          aplicarCorrecaoGeral();
        }
      },
      true
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
