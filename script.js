document.addEventListener("DOMContentLoaded", function() {
    // Modo Escuro
    const toggleDark = document.getElementById("toggle-dark");
    if (toggleDark) {
      toggleDark.addEventListener("click", toggleDarkMode);
      loadTheme();
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
  
  // Adiciona um botão com o nome da matéria na página inicial
  function addSubjectButton(subject) {
    const container = document.getElementById("subject-buttons");
    const btn = document.createElement("button");
    btn.className = "btn btn-outline-primary m-1";
    btn.textContent = subject;
    btn.addEventListener("click", function() {
      // Oculta a seleção e os botões de matérias
      document.getElementById("subject-selection").style.display = "none";
      container.style.display = "none";
      // Cria a interface dos flashcards para a matéria selecionada
      createFlashcardsInterface(subject);
    });
    container.appendChild(btn);
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
            <input type="text" id="input-content" class="form-control" placeholder="Digite o conteúdo do flashcard" required>
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
          <!-- Container onde os flashcards serão exibidos -->
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
          <button id="btn-edit" class="btn btn-info mt-3">Editar Flashcard</button>
          <button id="btn-delete" class="btn btn-danger mt-3">Excluir Flashcard</button>
          <button id="btn-next" class="btn btn-primary mt-3">Próximo</button>
          <button id="btn-restart" class="btn btn-warning mt-3">Reiniciar Perguntas</button>
          <button id="btn-exit" class="btn btn-secondary mt-3">Sair</button>
        </div>
      </section>
    `;
  
    // Alterna entre abas: Adicionar e Estudar
    document.getElementById("btn-add-tab").addEventListener("click", function() {
      document.getElementById("section-add").classList.remove("d-none");
      document.getElementById("section-study").classList.add("d-none");
    });
    document.getElementById("btn-study-tab").addEventListener("click", function() {
      document.getElementById("section-add").classList.add("d-none");
      document.getElementById("section-study").classList.remove("d-none");
      startStudy();
    });
  
    // Variáveis para controle de edição
    let editingMode = false;
    let editingCardGlobalIndex = null; // Índice do flashcard no array original
  
    // Cadastro de flashcards
    document.getElementById("flashcard-form").addEventListener("submit", function(e) {
      e.preventDefault();
      const question = document.getElementById("input-question").value.trim();
      const content = document.getElementById("input-content").value.trim();
      const answer = document.getElementById("input-answer").value.trim();
      if (question && content && answer) {
        let cards = JSON.parse(localStorage.getItem("flashcards_" + subject)) || [];
        if (editingMode) {
          // Atualiza o flashcard existente
          cards[editingCardGlobalIndex] = { question, content, answer };
          localStorage.setItem("flashcards_" + subject, JSON.stringify(cards));
          editingMode = false;
          editingCardGlobalIndex = null;
          document.querySelector("#flashcard-form button[type='submit']").textContent = "Salvar Flashcard";
          alert("Flashcard atualizado!");
        } else {
          // Adiciona novo flashcard
          cards.push({ question, content, answer });
          localStorage.setItem("flashcards_" + subject, JSON.stringify(cards));
          alert("Flashcard salvo!");
        }
        document.getElementById("flashcard-form").reset();
        // Atualiza a mensagem de aviso após alteração na lista de flashcards
        updateFlashcardMessage(subject);
      }
    });
  
    // Funcionalidades do modo de estudo
    let studyOrder = [];
    let currentIndex = 0;
    let flashcards = [];
  
    const flashcardContainer = document.getElementById("flashcard-container");
    const cardQuestion = document.getElementById("card-question");
    const cardContent = document.getElementById("card-content");
    const cardAnswer = document.getElementById("card-answer");
  
    document.getElementById("btn-next").addEventListener("click", function() {
      if (currentIndex < studyOrder.length - 1) {
        currentIndex++;
        displayCurrentCard();
      } else {
        alert("Você chegou ao final dos flashcards. Clique em Reiniciar para começar de novo.");
      }
    });
  
    document.getElementById("btn-restart").addEventListener("click", function() {
      startStudy();
    });
  
    document.getElementById("btn-exit").addEventListener("click", function() {
      // Retorna para a tela inicial
      location.reload();
    });
  
    // Efeito de flip ao clicar no flashcard
    flashcardContainer.addEventListener("click", function() {
      flashcardContainer.classList.toggle("flipped");
    });
  
    // Botão de editar flashcard
    document.getElementById("btn-edit").addEventListener("click", function() {
      if (currentIndex < studyOrder.length) {
        const idx = studyOrder[currentIndex];
        const currentCard = flashcards[idx];
        // Alterna para a seção de adição e preenche os campos para edição
        document.getElementById("section-add").classList.remove("d-none");
        document.getElementById("section-study").classList.add("d-none");
        document.getElementById("input-question").value = currentCard.question;
        document.getElementById("input-content").value = currentCard.content;
        document.getElementById("input-answer").value = currentCard.answer;
        editingMode = true;
        editingCardGlobalIndex = idx;
        document.querySelector("#flashcard-form button[type='submit']").textContent = "Atualizar Flashcard";
      }
    });
  
    // Botão de excluir flashcard
    document.getElementById("btn-delete").addEventListener("click", function() {
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
  
    // Função para atualizar a exibição do flashcard com a mensagem de aviso
    function updateFlashcardMessage(subject) {
      const cards = JSON.parse(localStorage.getItem("flashcards_" + subject)) || [];
      // Se não houver flashcards, mostra a mensagem "Crie Um Novo Flashcard" tanto na frente quanto no verso.
      if (cards.length === 0) {
        cardQuestion.textContent = "CRIE UM NOVO FLASHCARD";
        cardContent.textContent = "";
        cardAnswer.textContent = "CRIE UM NOVO FLASHCARD";
      }
    }
  
    // Função para iniciar o modo de estudo
    function startStudy() {
      flashcards = JSON.parse(localStorage.getItem("flashcards_" + subject)) || [];
      // Atualiza a mensagem de aviso conforme a quantidade de flashcards
      updateFlashcardMessage(subject);
      if (flashcards.length === 0) {
        // Se não houver flashcards, não prossegue para exibir nenhum cartão
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
  }
  
  // Função para embaralhar um array (algoritmo Fisher-Yates)
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  // Funções de Modo Escuro
  function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    document.body.classList.toggle("light-mode");
    const mode = document.body.classList.contains("dark-mode") ? "dark" : "light";
    localStorage.setItem("theme", mode);
    const toggleDark = document.getElementById("toggle-dark");
    if (toggleDark) {
      toggleDark.textContent = mode === "dark" ? "Modo Claro" : "Modo Escuro";
    }
  }
  
  function loadTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    if (savedTheme === "dark") {
      document.body.classList.remove("light-mode");
      document.body.classList.add("dark-mode");
      const toggleDark = document.getElementById("toggle-dark");
      if (toggleDark) {
        toggleDark.textContent = "Modo Claro";
      }
    } else {
      document.body.classList.remove("dark-mode");
      document.body.classList.add("light-mode");
      const toggleDark = document.getElementById("toggle-dark");
      if (toggleDark) {
        toggleDark.textContent = "Modo Escuro";
      }
    }
  }
  