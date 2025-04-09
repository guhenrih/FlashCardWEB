document.addEventListener("DOMContentLoaded", function() {
  // Configura modo escuro e botão Início
  const toggleDark = document.getElementById("toggle-dark");
  if (toggleDark) {
    toggleDark.addEventListener("click", toggleDarkMode);
    loadTheme();
  }
  
  const btnHome = document.getElementById("btn-home");
  if (btnHome) {
    btnHome.addEventListener("click", function() {
      // Volta para a tela inicial
      location.reload();
    });
  }

  // Carrega as matérias salvas
  const subjects = JSON.parse(localStorage.getItem("subjects")) || [];
  subjects.forEach(subject => addSubjectButton(subject));

  // Cadastro de nova matéria
  const subjectForm = document.getElementById("subject-form");
  if (subjectForm) {
    subjectForm.addEventListener("submit", function(e) {
      e.preventDefault();
      const subject = document.getElementById("subject-input").value.trim();
      if (subject) {
        let subjects = JSON.parse(localStorage.getItem("subjects")) || [];
        if (!subjects.includes(subject)) {
          subjects.push(subject);
          localStorage.setItem("subjects", JSON.stringify(subjects));
          addSubjectButton(subject);
        }
        document.getElementById("subject-input").value = "";
      }
    });
  }
});

// Retorna os conteúdos salvos (array de strings) do localStorage
function getContentOptions() {
  return JSON.parse(localStorage.getItem("contentOptions")) || [];
}

// Salva o array de conteúdos no localStorage
function setContentOptions(options) {
  localStorage.setItem("contentOptions", JSON.stringify(options));
}

// Adiciona uma nova opção de conteúdo caso ainda não esteja salva
function addContentOption(newOption) {
  let options = getContentOptions();
  if (!options.includes(newOption)) {
    options.push(newOption);
    setContentOptions(options);
  }
}

// Gera o HTML das opções do dropdown de conteúdos
function getContentOptionsHtml() {
  let options = getContentOptions();
  let html = `<option value="" disabled selected>Selecione um conteúdo</option>`;
  // Popula o dropdown com os conteúdos salvos
  options.forEach(option => {
    html += `<option value="${option}">${option}</option>`;
  });
  // Sempre adiciona a opção para inserir um novo conteúdo
  html += `<option value="outro">Outro...</option>`;
  return html;
}

// Adiciona um botão com o nome da matéria na página inicial, juntamente com um botão para excluí-la
function addSubjectButton(subject) {
  const container = document.getElementById("subject-buttons");
  const div = document.createElement("div");
  div.className = "d-flex align-items-center mb-2";
  
  const btn = document.createElement("button");
  btn.className = "btn btn-outline-primary mr-2";
  btn.textContent = subject;
  btn.addEventListener("click", function() {
    document.getElementById("subject-selection").style.display = "none";
    container.style.display = "none";
    createFlashcardsInterface(subject);
  });
  div.appendChild(btn);
  
  const delBtn = document.createElement("button");
  delBtn.className = "btn btn-outline-danger btn-sm";
  delBtn.textContent = "Excluir";
  delBtn.addEventListener("click", function(e) {
    e.stopPropagation();
    if (confirm("Deseja realmente excluir a matéria " + subject + "?")) {
      // Remove do localStorage as matérias
      let subjects = JSON.parse(localStorage.getItem("subjects")) || [];
      subjects = subjects.filter(s => s !== subject);
      localStorage.setItem("subjects", JSON.stringify(subjects));
      // Remove os flashcards associados
      localStorage.removeItem("flashcards_" + subject);
      // Remove o elemento da interface
      div.remove();
    }
  });
  div.appendChild(delBtn);
  
  container.appendChild(div);
}

// Cria a interface dos flashcards dinamicamente
function createFlashcardsInterface(subject) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <h3>Matéria: ${subject}</h3>
    <nav class="mb-3">
      <button id="btn-add-tab" class="btn btn-primary">Adicionar Flashcards</button>
      <button id="btn-study-tab" class="btn btn-secondary">Estudar Flashcards</button>
    </nav>
    <section id="section-add">
      <h4>Adicionar Flashcard</h4>
      <form id="flashcard-form">
        <div class="form-group">
          <input type="text" id="input-question" class="form-control" placeholder="Digite a pergunta" required>
        </div>
        <div class="form-group">
          <label for="input-content">Conteúdo do Flashcard</label>
          <select id="input-content" class="form-control" required>
            ${getContentOptionsHtml()}
          </select>
          <input type="text" id="input-content-other" class="form-control mt-2 d-none" placeholder="Digite o conteúdo do flashcard">
        </div>
        <div class="form-group">
          <textarea id="input-answer" class="form-control" placeholder="Digite a resposta" rows="3" required></textarea>
        </div>
        <button type="submit" class="btn btn-success">Salvar Flashcard</button>
      </form>
      <hr>
    </section>
    <section id="section-study" class="d-none">
      <div class="text-center">
        <div id="flashcard-container" class="flashcard">
          <div class="flashcard-inner">
            <div class="flashcard-front">
              <p id="card-question"></p>
              <p id="card-content" class="flashcard-extra"></p>
            </div>
            <div class="flashcard-back">
              <p id="card-answer"></p>
            </div>
          </div>
        </div>
        <div class="mt-3">
          <button id="btn-edit" class="btn btn-info">Editar Flashcard</button>
          <button id="btn-delete" class="btn btn-danger">Excluir Flashcard</button>
          <button id="btn-restart" class="btn btn-warning">Reiniciar Perguntas</button>
          <button id="btn-print" class="btn btn-secondary">Imprimir Flashcards</button>
          <button id="btn-exit" class="btn btn-secondary">Sair</button>
        </div>
        <div class="d-flex justify-content-center mt-3 nav-buttons">
          <button id="btn-prev" class="btn btn-primary mr-2">&larr;</button>
          <button id="btn-next" class="btn btn-primary">&rarr;</button>
        </div>
      </div>
    </section>
  `;

  // Alterna entre abas
  document.getElementById("btn-add-tab").addEventListener("click", function() {
    document.getElementById("section-add").classList.remove("d-none");
    document.getElementById("section-study").classList.add("d-none");
  });
  document.getElementById("btn-study-tab").addEventListener("click", function() {
    document.getElementById("section-add").classList.add("d-none");
    document.getElementById("section-study").classList.remove("d-none");
    startStudy();
  });

  let editingMode = false;
  let editingCardGlobalIndex = null;

  // Cadastro de flashcards – utiliza o dropdown dinâmico de conteúdo
  document.getElementById("flashcard-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const question = document.getElementById("input-question").value.trim();
    
    // Obtém o conteúdo a partir do dropdown ou do campo “Outro”
    const selectContent = document.getElementById("input-content");
    let content = selectContent.value;
    if (content === "outro") {
      const otherContent = document.getElementById("input-content-other").value.trim();
      if(otherContent){
        content = otherContent;
      } else{
        alert("Por favor, digite o conteúdo do flashcard.");
        return;
      }
    }
    
    const answer = document.getElementById("input-answer").value.trim();
    if (question && content && answer) {
      let cards = JSON.parse(localStorage.getItem("flashcards_" + subject)) || [];
      if (editingMode) {
        cards[editingCardGlobalIndex] = { question, content, answer };
        localStorage.setItem("flashcards_" + subject, JSON.stringify(cards));
        editingMode = false;
        editingCardGlobalIndex = null;
        document.querySelector("#flashcard-form button[type='submit']").textContent = "Salvar Flashcard";
        alert("Flashcard atualizado!");
      } else {
        cards.push({ question, content, answer });
        localStorage.setItem("flashcards_" + subject, JSON.stringify(cards));
        alert("Flashcard salvo!");
        // Se o conteúdo inserido não estiver no dropdown, adiciona para uso futuro
        addContentOption(content);
        // Atualiza o dropdown de conteúdo
        updateContentDropdown();
      }
      document.getElementById("flashcard-form").reset();
      // Esconde o campo extra se estiver visível
      document.getElementById("input-content-other").classList.add("d-none");
      updateFlashcardMessage(subject);
    }
  });

  // Atualiza as opções do dropdown de conteúdo com os valores salvos
  function updateContentDropdown() {
    const selectContent = document.getElementById("input-content");
    selectContent.innerHTML = getContentOptionsHtml();
  }

  // Event listener para mostrar/ocultar o campo “Outro...” do conteúdo
  document.getElementById("input-content").addEventListener("change", function(){
    const select = document.getElementById("input-content");
    const otherInput = document.getElementById("input-content-other");
    if(select.value === "outro"){
      otherInput.classList.remove("d-none");
      otherInput.required = true;
    } else{
      otherInput.classList.add("d-none");
      otherInput.required = false;
    }
  });

  // Variáveis do modo de estudo
  let studyOrder = [];
  let currentIndex = 0;
  let flashcards = [];
  const flashcardContainer = document.getElementById("flashcard-container");
  const cardQuestion = document.getElementById("card-question");
  const cardContent = document.getElementById("card-content");
  const cardAnswer = document.getElementById("card-answer");

  // Botão Próximo (seta →)
  document.getElementById("btn-next").addEventListener("click", function() {
    if (!flashcards || flashcards.length === 0) {
      alert("NENHUM FLASHCARD CADASTRADO");
      return;
    }
    if (currentIndex < studyOrder.length - 1) {
      currentIndex++;
      displayCurrentCard();
    } else {
      alert("Você chegou ao final dos flashcards. Clique em Reiniciar para começar de novo.");
    }
  });

  // Botão Retroceder (seta ←)
  document.getElementById("btn-prev").addEventListener("click", function() {
    if (!flashcards || flashcards.length === 0) {
      alert("NENHUM FLASHCARD CADASTRADO");
      return;
    }
    if (currentIndex > 0) {
      currentIndex--;
      displayCurrentCard();
    } else {
      alert("Você está no primeiro flashcard.");
    }
  });

  // Botão Reiniciar
  document.getElementById("btn-restart").addEventListener("click", function() {
    if (!flashcards || flashcards.length === 0) {
      alert("NENHUM FLASHCARD CADASTRADO");
      return;
    }
    startStudy();
  });

  // Botão Imprimir Flashcards – layout modificado para exibir 8 pares por página, com quebra de página ajustada
  document.getElementById("btn-print").addEventListener("click", function() {
    printFlashcards(subject);
  });

  // Botão Sair
  document.getElementById("btn-exit").addEventListener("click", function() {
    location.reload();
  });

  // Efeito flip
  flashcardContainer.addEventListener("click", function() {
    flashcardContainer.classList.toggle("flipped");
  });

  // Botão Editar
  document.getElementById("btn-edit").addEventListener("click", function() {
    if (!flashcards || flashcards.length === 0) {
      alert("NENHUM FLASHCARD CADASTRADO");
      return;
    }
    if (currentIndex < studyOrder.length) {
      const idx = studyOrder[currentIndex];
      const currentCard = flashcards[idx];
      document.getElementById("section-add").classList.remove("d-none");
      document.getElementById("section-study").classList.add("d-none");
      document.getElementById("input-question").value = currentCard.question;
      
      // Para o conteúdo, se o valor bater com alguma opção, seta o select; caso contrário, seta “Outro…” e preenche o campo
      const selectContent = document.getElementById("input-content");
      const otherInput = document.getElementById("input-content-other");
      let optionFound = false;
      for (let i = 0; i < selectContent.options.length; i++) {
        if (selectContent.options[i].value === currentCard.content) {
          selectContent.value = currentCard.content;
          optionFound = true;
          otherInput.classList.add("d-none");
          break;
        }
      }
      if (!optionFound) {
        selectContent.value = "outro";
        otherInput.classList.remove("d-none");
        otherInput.value = currentCard.content;
      }
      
      document.getElementById("input-answer").value = currentCard.answer;
      editingMode = true;
      editingCardGlobalIndex = idx;
      document.querySelector("#flashcard-form button[type='submit']").textContent = "Atualizar Flashcard";
    }
  });

  // Botão Excluir Flashcard
  document.getElementById("btn-delete").addEventListener("click", function() {
    if (!flashcards || flashcards.length === 0) {
      alert("NENHUM FLASHCARD CADASTRADO");
      return;
    }
    if (currentIndex < studyOrder.length) {
      const idx = studyOrder[currentIndex];
      if (confirm("Deseja realmente excluir este flashcard?")) {
        flashcards.splice(idx, 1);
        localStorage.setItem("flashcards_" + subject, JSON.stringify(flashcards));
        alert("Flashcard excluído!");
        startStudy();
      }
    }
  });

  // Se não houver flashcards, mostra mensagem nas faces do cartão
  function updateFlashcardMessage(subject) {
    const cards = JSON.parse(localStorage.getItem("flashcards_" + subject)) || [];
    if (cards.length === 0) {
      cardQuestion.textContent = "Crie Um Novo Flashcard";
      cardContent.textContent = "";
      cardAnswer.textContent = "Crie Um Novo Flashcard";
    }
  }

  // Inicia o modo de estudo
  function startStudy() {
    flashcards = JSON.parse(localStorage.getItem("flashcards_" + subject)) || [];
    updateFlashcardMessage(subject);
    if (flashcards.length === 0) {
      return;
    }
    studyOrder = shuffleArray([...Array(flashcards.length).keys()]);
    currentIndex = 0;
    displayCurrentCard();
  }

  // Exibe o flashcard atual
  function displayCurrentCard() {
    flashcardContainer.classList.remove("flipped");
    if (currentIndex < studyOrder.length) {
      const idx = studyOrder[currentIndex];
      cardQuestion.textContent = flashcards[idx].question;
      cardContent.textContent = flashcards[idx].content;
      cardAnswer.textContent = flashcards[idx].answer;
    } else {
      alert("Você já visualizou todos os flashcards.");
    }
  }

  // Função para imprimir flashcards com 8 pares por página, utilizando grid de 4 colunas (4 x 2 = 8 pares)
  function printFlashcards(subject) {
    const cards = JSON.parse(localStorage.getItem("flashcards_" + subject)) || [];
    if (cards.length === 0) {
      alert("NENHUM FLASHCARD CADASTRADO");
      return;
    }
    let printContent = '<html><head><title>Imprimir Flashcards</title>';
    printContent += '<style>';
    printContent += `
      @page { size: A4; margin: 20mm; }
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
      h1 { text-align: center; margin-bottom: 20px; }
      .flashcards-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-gap: 10px;
      }
      .flashcard-pair {
        border: 1px solid #000;
        padding: 5px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        width: 100%;
      }
      .flashcard-rect {
        border: 1px solid #000;
        padding: 5px;
        margin-bottom: 5px;
        height: 200px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
      }
      .flashcard-rect:last-child {
        margin-bottom: 0;
      }
      /* Estilo adicional para exibir o conteúdo abaixo da pergunta */
      .print-question {
        font-weight: bold;
      }
      .print-content {
        font-size: 0.9em;
        margin-top: 5px;
      }
      .page-break { 
        display: block; 
        page-break-after: always; 
      }
    `;
    printContent += '</style></head><body>';
    printContent += `<h1>Flashcards - ${subject}</h1>`;
    printContent += '<div class="flashcards-grid">';
    cards.forEach((card, index) => {
      printContent += `
        <div class="flashcard-pair">
          <div class="flashcard-rect">
            <div class="print-question">${card.question}</div>
            <div class="print-content">${card.content}</div>
          </div>
          <div class="flashcard-rect">${card.answer}</div>
        </div>
      `;
      // Insere quebra de página após cada 8 pares, se houver mais flashcards
      if ((index + 1) % 8 === 0 && (index + 1) < cards.length) {
        printContent += '</div><div class="page-break"></div><div class="flashcards-grid">';
      }
    });
    printContent += '</div>';
    printContent += '</body></html>';
    
    const printWindow = window.open('', '', 'height=842,width=595');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }
}

// Embaralha um array (Fisher-Yates)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Alterna o modo escuro e atualiza o header
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  document.body.classList.toggle("light-mode");
  const mode = document.body.classList.contains("dark-mode") ? "dark" : "light";
  localStorage.setItem("theme", mode);
  
  const toggleDark = document.getElementById("toggle-dark");
  if (toggleDark) {
    toggleDark.textContent = mode === "dark" ? "Modo Claro" : "Modo Escuro";
  }
  
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    if (mode === "dark") {
      navbar.classList.remove("navbar-light", "bg-light");
      navbar.classList.add("navbar-dark", "bg-dark");
    } else {
      navbar.classList.remove("navbar-dark", "bg-dark");
      navbar.classList.add("navbar-light", "bg-light");
    }
  }
}

function loadTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  const toggleDark = document.getElementById("toggle-dark");
  const navbar = document.querySelector('.navbar');
  if (savedTheme === "dark") {
    document.body.classList.remove("light-mode");
    document.body.classList.add("dark-mode");
    if (toggleDark) {
      toggleDark.textContent = "Modo Claro";
    }
    if (navbar) {
      navbar.classList.remove("navbar-light", "bg-light");
      navbar.classList.add("navbar-dark", "bg-dark");
    }
  } else {
    document.body.classList.remove("dark-mode");
    document.body.classList.add("light-mode");
    if (toggleDark) {
      toggleDark.textContent = "Modo Escuro";
    }
    if (navbar) {
      navbar.classList.remove("navbar-dark", "bg-dark");
      navbar.classList.add("navbar-light", "bg-light");
    }
  }
}
