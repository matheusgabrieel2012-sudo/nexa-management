// ========================================
// NEXA — LOGIN
// ========================================


// Perfis do sistema

const usuarios = {

    admin: {
        nome: "Administrador",
        cargo: "Administrador",
        senha: "NEXA-DEMO",
        permissao: "admin",
        iniciais: "A"
    },

    arthur: {
        nome: "Arthur Rodrigues",
        cargo: "Funcionário",
        senha: "1199",
        permissao: "funcionario",
        iniciais: "AR"
    },

    pietro: {
        nome: "Pietro de Jesus",
        cargo: "Funcionário",
        senha: "9911",
        permissao: "funcionario",
        iniciais: "PJ"
    }

};


// Elementos

const profileCards =
    document.querySelectorAll(".profile-card");

const passwordArea =
    document.getElementById("passwordArea");

const passwordInput =
    document.getElementById("password");

const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");

const selectedName =
    document.getElementById("selectedName");

const selectedRole =
    document.getElementById("selectedRole");

const selectedAvatar =
    document.getElementById("selectedAvatar");

const backButton =
    document.getElementById("backButton");

const togglePassword =
    document.getElementById("togglePassword");


// Usuário selecionado

let usuarioSelecionado = null;


// ========================================
// SELECIONAR PERFIL
// ========================================

profileCards.forEach(card => {

    card.addEventListener("click", () => {

        const usuario =
            card.dataset.user;

        usuarioSelecionado =
            usuarios[usuario];

        if (!usuarioSelecionado) {
            return;
        }


        selectedName.textContent =
            usuarioSelecionado.nome;

        selectedRole.textContent =
            usuarioSelecionado.cargo;

        selectedAvatar.textContent =
            usuarioSelecionado.iniciais;


        // Esconde os perfis

        document.querySelector(".profiles")
            .style.display = "none";

        document.querySelector(".welcome")
            .style.display = "none";


        // Mostra senha

        passwordArea.classList.add("active");

        passwordInput.value = "";

        loginMessage.textContent = "";

        passwordInput.focus();

    });

});


// ========================================
// VOLTAR PARA PERFIS
// ========================================

backButton.addEventListener("click", () => {

    usuarioSelecionado = null;

    passwordArea.classList.remove("active");

    document.querySelector(".profiles")
        .style.display = "flex";

    document.querySelector(".welcome")
        .style.display = "block";

    passwordInput.value = "";

    loginMessage.textContent = "";

});


// ========================================
// MOSTRAR / ESCONDER SENHA
// ========================================

togglePassword.addEventListener("click", () => {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";

        togglePassword.textContent = "◉";

    } else {

        passwordInput.type = "password";

        togglePassword.textContent = "◉";

    }

});


// ========================================
// ENTRAR
// ========================================

loginForm.addEventListener("submit", (event) => {

    event.preventDefault();


    if (!usuarioSelecionado) {

        loginMessage.textContent =
            "Selecione um perfil.";

        loginMessage.style.color =
            "#f87171";

        return;

    }


    const senha =
        passwordInput.value;


    // Verifica senha

    if (senha !== usuarioSelecionado.senha) {

        loginMessage.textContent =
            "Senha incorreta.";

        loginMessage.style.color =
            "#f87171";

        passwordInput.value = "";

        passwordInput.focus();

        return;

    }


    // ========================================
    // LOGIN APROVADO
    // ========================================

    loginMessage.textContent =
        `Bem-vindo, ${usuarioSelecionado.nome}!`;

    loginMessage.style.color =
        "#a78bfa";


    // Salva sessão

    sessionStorage.setItem(
        "nexaUsuario",
        JSON.stringify({
            nome: usuarioSelecionado.nome,
            cargo: usuarioSelecionado.cargo,
            permissao: usuarioSelecionado.permissao,
            iniciais: usuarioSelecionado.iniciais
        })
    );


    // Vai para dashboard

    setTimeout(() => {

        window.location.href =
            "index.html";

    }, 700);

});