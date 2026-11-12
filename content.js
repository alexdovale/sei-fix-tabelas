(function () {
  'use strict';

  // Transforma a string HTML gerada pelo CKEditor 5, injetando estilos inline nas células
  function processarHtmlTabelas(htmlString) {
    if (!htmlString || !htmlString.includes('<table')) return htmlString;

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const tabelas = doc.querySelectorAll('table');

    let alterou = false;

    tabelas.forEach((tabela) => {
      const estiloTabela = (tabela.getAttribute('style') || '').toLowerCase();
      
      // Se o usuário definiu explicitamente a tabela sem borda, respeita
      if (estiloTabela.includes('border-style:none') || estiloTabela.includes('border:none')) {
        return;
      }

      // 1. Garante atributos na própria <table> para o conversor de PDF (wkhtmltopdf / Dompdf)
      tabela.style.borderCollapse = 'collapse';
      if (!tabela.getAttribute('border')) {
        tabela.setAttribute('border', '1');
      }

      // Extrai estilo da tabela ou assume padrão 1px solid #000000
      const corBorda = tabela.style.borderColor || '#000000';
      const larguraBorda = tabela.style.borderWidth || '1px';
      const tipoBorda =
        tabela.style.borderStyle && tabela.style.borderStyle !== 'none'
          ? tabela.style.borderStyle
          : 'solid';

      const bordaPadrao = `${larguraBorda} ${tipoBorda} ${corBorda}`;

      // Se a própria tabela não tiver border inline definido, aplica também
      if (!tabela.style.border && !tabela.style.borderStyle) {
        tabela.style.border = bordaPadrao;
      }

      // 2. Propaga a borda inline para todas as células (td e th)
      const celulas = tabela.querySelectorAll('td, th');
      celulas.forEach((celula) => {
        const estiloCelula = (celula.getAttribute('style') || '').toLowerCase();
        
        // Só não aplica se a célula individual foi marcada como sem borda
        if (estiloCelula.includes('border-style:none') || estiloCelula.includes('border:none')) {
          return;
        }

        if (!celula.style.border || celula.style.borderStyle === 'none') {
          celula.style.border = bordaPadrao;
        }
      });

      alterou = true;
    });

    return alterou ? doc.body.innerHTML : htmlString;
  }

  // Varre os textareas do formulário de edição do SEI e aplica a correção
  function interceptarDadosFormulario() {
    // No SEI, o conteúdo das seções do documento vai para textareas dentro do form de edição
    const textareas = document.querySelectorAll('form textarea, textarea[name^="txa"]');
    textareas.forEach((textarea) => {
      if (textarea.value && textarea.value.includes('<table')) {
        textarea.value = processarHtmlTabelas(textarea.value);
      }
    });
  }

  // Sincroniza instâncias ativas do CKEditor 5 (caso o script rode no mesmo contexto ou antes do submit)
  function instalarGatilhos() {
    const formEditor = document.getElementById('frmEditor') || document.querySelector('form');
    if (!formEditor) return;

    // 1. Intercepta o evento submit padrão
    formEditor.addEventListener('submit', () => {
      // Pequeno delay síncrono ou execução na fase de bubble para garantir que o CKEditor já populou o textarea
      interceptarDadosFormulario();
    }, false);

    // 2. No SEI, o botão Salvar muitas vezes chama o submit via JS (form.submit()), o que pula o listener 'submit'
    // Por isso, fazemos monkey-patch no método nativo submit() deste formulário
    const submitOriginal = formEditor.submit;
    formEditor.submit = function () {
      interceptarDadosFormulario();
      return submitOriginal.apply(this, arguments);
    };

    console.log('[SEI Fix Tabelas] Monitoramento de tabelas do CKEditor 5 ativo.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', instalarGatilhos);
  } else {
    instalarGatilhos();
  }
})();
