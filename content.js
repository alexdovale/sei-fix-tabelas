(function () {
  'use strict';

  function obterInstanciaCKEditor() {
    const editaveis = document.querySelectorAll('.ck-editor__editable');
    for (const el of editaveis) {
      if (el.ckeditorInstance) {
        return el.ckeditorInstance;
      }
    }
    return null;
  }

  function aplicarBordasInternas() {
    const editor = obterInstanciaCKEditor();

    if (!editor) {
      alert('Editor do SEI (CKEditor 5) não encontrado nesta tela.');
      return;
    }

    const model = editor.model;
    const root = model.document.getRoot();
    const celulas = [];

    const range = model.createRangeIn(root);
    for (const item of range.getItems()) {
      if (item.is('element', 'tableCell')) {
        celulas.push(item);
      }
    }

    if (celulas.length === 0) {
      alert('Nenhuma tabela encontrada neste documento.');
      return;
    }

    model.change((writer) => {
      const selecoes = celulas.map((celula) => writer.createRangeOn(celula));
      writer.setSelection(selecoes);

      const comandos = [
        { nome: 'tableCellBorderStyle', valor: 'solid' },
        { nome: 'tableCellBorderColor', valor: '#000000' },
        { nome: 'tableCellBorderWidth', valor: '1px' }
      ];

      for (const cmd of comandos) {
        if (editor.commands.get(cmd.nome)) {
          editor.execute(cmd.nome, { value: cmd.valor });
        } else {
          for (const celula of celulas) {
            writer.setAttribute(cmd.nome, cmd.valor, celula);
          }
        }
      }
    });

    alert(`Bordas aplicadas em ${celulas.length} células. Clique em Salvar e teste o Gerar PDF.`);
  }

  function injetarBotao() {
    if (document.getElementById('btn-sei-fix-bordas')) return;

    const checkInterval = setInterval(() => {
      const editor = obterInstanciaCKEditor();
      if (editor) {
        clearInterval(checkInterval);

        const btn = document.createElement('button');
        btn.id = 'btn-sei-fix-bordas';
        btn.type = 'button';
        btn.innerText = 'Corrigir Bordas Tabela';
        Object.assign(btn.style, {
          position: 'fixed',
          top: '12px',
          right: '20px',
          zIndex: '99999',
          backgroundColor: '#0056b3',
          color: '#ffffff',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 14px',
          fontSize: '13px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
        });

        btn.addEventListener('click', aplicarBordasInternas);
        document.body.appendChild(btn);
      }
    }, 1000);
  }

  injetarBotao();
})();
