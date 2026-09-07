/* =========================================================
   NEXA MANAGEMENT
   SCRIPT PRINCIPAL
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

const API_URL = "/api/nexa-data.js";
const ADMIN_TOKEN_KEY = "nexaAdminToken";
const USER_NAME_KEY = "nexaCurrentUserName";

const POLL_INTERVAL = 8000;

let data = defaultData();
let currentUser = {
    nome: "Administrador",
    cargo: "Administrador",
    permissao: "admin",
    avatar: "A"
};

let adminToken =
    localStorage.getItem(ADMIN_TOKEN_KEY) || "";

let selectedUserName =
    localStorage.getItem(USER_NAME_KEY) || "";

let isAdmin = Boolean(adminToken);

let currentPage = "dashboard";
let currentModal = null;
let editingId = null;

let isSaving = false;
let isLoading = false;
let pollTimer = null;

/* =========================================================
   USUÁRIOS
   ========================================================= */

const USERS = [
    {
        id: "admin",
        nome: "Administrador",
        cargo: "Administrador",
        permissao: "admin",
        avatar: "A"
    },
    {
        id: "arthur",
        nome: "Arthur Rodrigues",
        cargo: "Funcionário",
        permissao: "employee",
        avatar: "AR"
    },
    {
        id: "pietro",
        nome: "Pietro de Jesus",
        cargo: "Funcionário",
        permissao: "employee",
        avatar: "PJ"
    }
];

/* =========================================================
   DADOS PADRÃO
   ========================================================= */

function defaultData() {
    return {
        clients: [],
        sales: [],
        tasks: [],
        activities: [],
        notifications: [],
        goals: {
            general: 0,
            employees: {}
        },
        settings: {}
    };
}

/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function uid(prefix = "id") {
    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).substring(2, 9)
    );
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function initials(name) {
    if (!name) return "?";

    return String(name)
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0])
        .join("")
        .toUpperCase();
}

function currency(value) {
    const number = Number(value) || 0;

    return number.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatDate(date) {
    if (!date) return "-";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "-";
    }

    return parsed.toLocaleDateString("pt-BR");
}

function today() {
    return new Date().toISOString().split("T")[0];
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value ?? "";
    }
}

function setHTML(id, html) {
    const element = document.getElementById(id);

    if (element) {
        element.innerHTML = html;
    }
}

function showToast(message, type = "success") {
    const container =
        document.getElementById("toastContainer");

    if (!container) {
        alert(message);
        return;
    }

    const toast = document.createElement("div");

    toast.className = `toast toast-${type}`;

    toast.innerHTML = `
        <div class="toast-content">
            ${escapeHTML(message)}
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 10);

    setTimeout(() => {
        toast.classList.remove("show");

        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

function findUser(name) {
    return (
        USERS.find(
            user => user.nome === name
        ) || USERS[0]
    );
}

function getEmployees() {
    return USERS.filter(
        user => user.permissao !== "admin"
    );
}

function getClient(id) {
    return data.clients.find(
        client => client.id === id
    );
}

function addActivity(
    type,
    title,
    description = ""
) {
    data.activities.unshift({
        id: uid("activity"),
        type,
        title,
        description,
        date: new Date().toISOString()
    });

    data.activities =
        data.activities.slice(0, 100);
}

function addNotification(
    title,
    message,
    type = "info"
) {
    data.notifications.unshift({
        id: uid("notification"),
        title,
        message,
        type,
        read: false,
        date: new Date().toISOString()
    });

    data.notifications =
        data.notifications.slice(0, 50);
}

/* =========================================================
   USUÁRIO ATUAL
   ========================================================= */

function updateCurrentUser() {

    if (isAdmin) {
        currentUser = {
            id: "admin",
            nome: "Administrador",
            cargo: "Administrador",
            permissao: "admin",
            avatar: "A"
        };

        return;
    }

    const selected =
        USERS.find(
            user =>
                user.nome === selectedUserName
        );

    if (selected) {
        currentUser = {
            ...selected
        };

        return;
    }

    currentUser = {
        id: "viewer",
        nome: "NEXA",
        cargo: "Visualização",
        permissao: "employee",
        avatar: "N"
    };
}

function updateProfileUI() {

    updateCurrentUser();

    setText(
        "topUserName",
        currentUser.nome
    );

    setText(
        "topUserRole",
        currentUser.cargo
    );

    setText(
        "topAvatar",
        currentUser.avatar ||
            initials(currentUser.nome)
    );

    const welcomeName =
        isAdmin
            ? "Administrador"
            : currentUser.nome;

    setText(
        "welcomeName",
        welcomeName
    );

    document
        .querySelectorAll(".admin-only")
        .forEach(element => {
            element.style.display =
                isAdmin ? "" : "none";
        });
}

/* =========================================================
   ESCOLHER USUÁRIO
   ========================================================= */

function requestUserSelection() {

    if (isAdmin) return;

    const existing =
        document.getElementById(
            "nexaUserSelector"
        );

    if (existing) {
        existing.remove();
    }

    const overlay =
        document.createElement("div");

    overlay.id =
        "nexaUserSelector";

    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(0,0,0,.82);
        backdrop-filter: blur(16px);
    `;

    overlay.innerHTML = `
        <div style="
            width:min(440px,100%);
            background:#11111a;
            border:1px solid rgba(255,255,255,.1);
            border-radius:24px;
            padding:28px;
            box-shadow:0 25px 80px rgba(0,0,0,.5);
        ">

            <div style="
                color:#8b5cf6;
                font-size:12px;
                font-weight:700;
                text-transform:uppercase;
                letter-spacing:.12em;
                margin-bottom:10px;
            ">
                NEXA MANAGEMENT
            </div>

            <h2 style="
                color:#fff;
                margin:0 0 8px;
                font-size:24px;
            ">
                Quem está acessando?
            </h2>

            <p style="
                color:#8c8d9b;
                margin:0 0 22px;
                line-height:1.5;
            ">
                Escolha seu nome para personalizar
                o painel. Isso não é um login.
            </p>

            <div style="
                display:grid;
                gap:10px;
            ">

                ${getEmployees()
                    .map(
                        user => `
                        <button
                            type="button"
                            data-nexa-user="${escapeHTML(
                                user.nome
                            )}"
                            style="
                                width:100%;
                                display:flex;
                                align-items:center;
                                gap:14px;
                                padding:15px;
                                border-radius:16px;
                                border:1px solid rgba(255,255,255,.08);
                                background:rgba(255,255,255,.04);
                                color:#fff;
                                cursor:pointer;
                                text-align:left;
                            "
                        >
                            <span style="
                                width:42px;
                                height:42px;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                border-radius:50%;
                                background:rgba(139,92,246,.16);
                                color:#a78bfa;
                                font-weight:800;
                            ">
                                ${escapeHTML(
                                    user.avatar
                                )}
                            </span>

                            <span>
                                <strong style="display:block;">
                                    ${escapeHTML(
                                        user.nome
                                    )}
                                </strong>

                                <small style="
                                    color:#8c8d9b;
                                ">
                                    ${escapeHTML(
                                        user.cargo
                                    )}
                                </small>
                            </span>
                        </button>
                    `
                    )
                    .join("")}

            </div>

            <button
                type="button"
                data-nexa-admin-access
                style="
                    width:100%;
                    margin-top:14px;
                    padding:13px;
                    border:0;
                    border-radius:14px;
                    background:#8b5cf6;
                    color:white;
                    font-weight:700;
                    cursor:pointer;
                "
            >
                Entrar como administrador
            </button>

        </div>
    `;

    document.body.appendChild(overlay);

    overlay
        .querySelectorAll(
            "[data-nexa-user]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    selectedUserName =
                        button.dataset.nexaUser;

                    localStorage.setItem(
                        USER_NAME_KEY,
                        selectedUserName
                    );

                    overlay.remove();

                    updateProfileUI();
                    renderAll();
                }
            );
        });

    const adminButton =
        overlay.querySelector(
            "[data-nexa-admin-access]"
        );

    adminButton?.addEventListener(
        "click",
        () => {

            overlay.remove();

            requestAdminAccess();
        }
    );
}

/* =========================================================
   ADMIN
   ========================================================= */

function requestAdminAccess() {

    const token = prompt(
        "Digite o token de administrador:"
    );

    if (!token) return;

    adminToken =
        token.trim();

    localStorage.setItem(
        ADMIN_TOKEN_KEY,
        adminToken
    );

    isAdmin = true;

    updateProfileUI();
    renderAll();

    showToast(
        "Modo administrador ativado."
    );
}

function exitAdminMode() {

    adminToken = "";

    localStorage.removeItem(
        ADMIN_TOKEN_KEY
    );

    isAdmin = false;

    updateCurrentUser();
    updateProfileUI();
    renderAll();

    showToast(
        "Modo visualização ativado."
    );
}

/* =========================================================
   API — CARREGAR
   ========================================================= */

async function loadData(showLoading = true) {

    if (isLoading) return;

    isLoading = true;

    try {

        if (showLoading) {
            showToast(
                "Sincronizando dados..."
            );
        }

        const response =
            await fetch(
                `${API_URL}?t=${Date.now()}`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        const result =
            await response.json();

        if (!response.ok) {
            throw new Error(
                result?.details ||
                result?.error ||
                "Erro ao carregar dados."
            );
        }

        data =
            normalizeData(
                result.data
            );

        renderAll();

    } catch (error) {

        console.error(
            "Erro ao carregar dados:",
            error
        );

        showToast(
            "Não foi possível sincronizar os dados.",
            "error"
        );

    } finally {

        isLoading = false;
    }
}

/* =========================================================
   API — SALVAR
   ========================================================= */

async function saveData(showMessage = true) {

    if (!isAdmin) {
        showToast(
            "Apenas o administrador pode alterar dados.",
            "error"
        );

        return false;
    }

    if (!adminToken) {
        showToast(
            "Token de administrador não encontrado.",
            "error"
        );

        return false;
    }

    if (isSaving) {
        return false;
    }

    isSaving = true;

    try {

        const response =
            await fetch(
                API_URL,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json",
                        "x-nexa-admin-token":
                            adminToken
                    },
                    body:
                        JSON.stringify(data)
                }
            );

        const result =
            await response.json();

        if (!response.ok) {

            if (
                response.status === 401
            ) {

                exitAdminMode();

                throw new Error(
                    "Token de administrador inválido."
                );
            }

            throw new Error(
                result?.details ||
                result?.error ||
                "Erro ao salvar dados."
            );
        }

        if (result.data) {
            data =
                normalizeData(
                    result.data
                );
        }

        if (showMessage) {
            showToast(
                "Alterações salvas."
            );
        }

        renderAll();

        return true;

    } catch (error) {

        console.error(
            "Erro ao salvar:",
            error
        );

        showToast(
            error.message ||
                "Erro ao salvar alterações.",
            "error"
        );

        return false;

    } finally {

        isSaving = false;
    }
}

/* =========================================================
   NORMALIZAÇÃO DOS DADOS
   ========================================================= */

function normalizeData(raw) {

    const base =
        defaultData();

    if (!raw || typeof raw !== "object") {
        return base;
    }

    return {
        clients:
            Array.isArray(raw.clients)
                ? raw.clients.map(
                      normalizeClient
                  )
                : [],

        sales:
            Array.isArray(raw.sales)
                ? raw.sales.map(
                      normalizeSale
                  )
                : [],

        tasks:
            Array.isArray(raw.tasks)
                ? raw.tasks.map(
                      normalizeTask
                  )
                : [],

        activities:
            Array.isArray(raw.activities)
                ? raw.activities
                : [],

        notifications:
            Array.isArray(raw.notifications)
                ? raw.notifications
                : [],

        goals: {
            general:
                Number(
                    raw.goals?.general
                ) || 0,

            employees:
                raw.goals?.employees &&
                typeof raw.goals.employees ===
                    "object"
                    ? raw.goals.employees
                    : {}
        },

        settings:
            raw.settings &&
            typeof raw.settings ===
                "object"
                ? raw.settings
                : {}
    };
}

function normalizeClient(client) {

    return {
        id:
            client?.id ||
            uid("client"),

        name:
            client?.name ||
            client?.nome ||
            "",

        company:
            client?.company ||
            client?.empresa ||
            "",

        phone:
            client?.phone ||
            client?.telefone ||
            "",

        email:
            client?.email ||
            "",

        status:
            client?.status ||
            "lead",

        responsible:
            client?.responsible ||
            client?.responsavel ||
            "Arthur Rodrigues",

        potential:
            Number(
                client?.potential
            ) || 0,

        notes:
            client?.notes ||
            client?.observacoes ||
            "",

        createdAt:
            client?.createdAt ||
            new Date().toISOString()
    };
}

function normalizeSale(sale) {

    return {
        id:
            sale?.id ||
            uid("sale"),

        clientId:
            sale?.clientId ||
            sale?.clienteId ||
            "",

        value:
            Number(
                sale?.value
            ) || 0,

        date:
            sale?.date ||
            today(),

        responsible:
            sale?.responsible ||
            sale?.responsavel ||
            "Arthur Rodrigues",

        status:
            sale?.status ||
            "pending",

        payment:
            sale?.payment ||
            "pending",

        notes:
            sale?.notes ||
            "",

        createdAt:
            sale?.createdAt ||
            new Date().toISOString()
    };
}

function normalizeTask(task) {

    return {
        id:
            task?.id ||
            uid("task"),

        title:
            task?.title ||
            task?.titulo ||
            "",

        description:
            task?.description ||
            task?.descricao ||
            "",

        dueDate:
            task?.dueDate ||
            task?.data ||
            today(),

        priority:
            task?.priority ||
            "medium",

        owner:
            task?.owner ||
            task?.responsible ||
            task?.responsavel ||
            "Arthur Rodrigues",

        completed:
            Boolean(
                task?.completed
            ),

        createdAt:
            task?.createdAt ||
            new Date().toISOString()
    };
}

/* =========================================================
   NAVEGAÇÃO
   ========================================================= */

function navigateTo(page) {

    if (!page) return;

    const restrictedPages = [
        "team",
        "reports",
        "settings"
    ];

    if (
        restrictedPages.includes(page) &&
        !isAdmin
    ) {
        showToast(
            "Essa área é exclusiva do administrador.",
            "error"
        );

        return;
    }

    currentPage = page;

    document
        .querySelectorAll("[data-page]")
        .forEach(item => {

            item.classList.toggle(
                "active",
                item.dataset.page === page
            );
        });

    document
        .querySelectorAll(".page")
        .forEach(section => {

            const shouldShow =
                section.id === page ||
                section.dataset.page === page;

            section.classList.toggle(
                "active",
                shouldShow
            );
        });

    const titles = {
        dashboard: "Dashboard",
        sales: "Vendas",
        clients: "Clientes",
        tasks: "Tarefas",
        goals: "Metas",
        team: "Equipe",
        reports: "Relatórios",
        settings: "Configurações"
    };

    setText(
        "pageTitle",
        titles[page] || "NEXA Management"
    );

    document.body.classList.remove(
        "mobile-menu-open"
    );
}

/* =========================================================
   MODAL
   ========================================================= */

function openModal(type, id = null) {

    if (!isAdmin) {

        showToast(
            "Apenas o administrador pode editar.",
            "error"
        );

        return;
    }

    const overlay =
        document.getElementById(
            "modalOverlay"
        );

    const body =
        document.getElementById(
            "modalBody"
        );

    const title =
        document.getElementById(
            "modalTitle"
        );

    const eyebrow =
        document.getElementById(
            "modalEyebrow"
        );

    const form =
        document.getElementById(
            "modalForm"
        );

    if (
        !overlay ||
        !body ||
        !title ||
        !form
    ) {
        return;
    }

    currentModal = type;
    editingId = id;

    form.reset();

    let content = "";

    if (type === "sale") {

        const sale =
            data.sales.find(
                item => item.id === id
            );

        eyebrow.textContent =
            id ? "Editar venda" : "Nova venda";

        title.textContent =
            id ? "Editar venda" : "Registrar venda";

        content = `
            <div class="form-grid">

                <div class="form-group">
                    <label>Cliente</label>

                    <select id="modalClient" required>
                        <option value="">
                            Selecione um cliente
                        </option>

                        ${data.clients
                            .map(
                                client => `
                                <option
                                    value="${escapeHTML(client.id)}"
                                    ${
                                        sale?.clientId ===
                                        client.id
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ${escapeHTML(
                                        client.name ||
                                        client.company ||
                                        "Cliente"
                                    )}
                                </option>
                            `
                            )
                            .join("")}
                    </select>
                </div>

                <div class="form-group">
                    <label>Valor</label>

                    <input
                        id="modalSaleValue"
                        type="number"
                        step="0.01"
                        min="0"
                        value="${sale?.value || ""}"
                        required
                    >
                </div>

                <div class="form-group">
                    <label>Data</label>

                    <input
                        id="modalSaleDate"
                        type="date"
                        value="${sale?.date || today()}"
                        required
                    >
                </div>

                <div class="form-group">
                    <label>Responsável</label>

                    <select id="modalSaleResponsible">

                        ${USERS
                            .map(
                                user => `
                                <option
                                    value="${escapeHTML(user.nome)}"
                                    ${
                                        (
                                            sale?.responsible ||
                                            "Arthur Rodrigues"
                                        ) ===
                                        user.nome
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ${escapeHTML(user.nome)}
                                </option>
                            `
                            )
                            .join("")}

                    </select>
                </div>

                <div class="form-group">
                    <label>Status</label>

                    <select id="modalSaleStatus">
                        <option value="pending"
                            ${
                                sale?.status ===
                                "pending"
                                    ? "selected"
                                    : ""
                            }>
                            Pendente
                        </option>

                        <option value="paid"
                            ${
                                sale?.status ===
                                "paid"
                                    ? "selected"
                                    : ""
                            }>
                            Recebida
                        </option>

                        <option value="cancelled"
                            ${
                                sale?.status ===
                                "cancelled"
                                    ? "selected"
                                    : ""
                            }>
                            Cancelada
                        </option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Pagamento</label>

                    <select id="modalSalePayment">

                        <option value="pending"
                            ${
                                sale?.payment ===
                                "pending"
                                    ? "selected"
                                    : ""
                            }>
                            Pendente
                        </option>

                        <option value="pix"
                            ${
                                sale?.payment ===
                                "pix"
                                    ? "selected"
                                    : ""
                            }>
                            PIX
                        </option>

                        <option value="card"
                            ${
                                sale?.payment ===
                                "card"
                                    ? "selected"
                                    : ""
                            }>
                            Cartão
                        </option>

                        <option value="cash"
                            ${
                                sale?.payment ===
                                "cash"
                                    ? "selected"
                                    : ""
                            }>
                            Dinheiro
                        </option>
                    </select>
                </div>

                <div class="form-group full">
                    <label>Observações</label>

                    <textarea id="modalSaleNotes">${escapeHTML(
                        sale?.notes || ""
                    )}</textarea>
                </div>

            </div>
        `;
    }

    if (type === "client") {

        const client =
            data.clients.find(
                item => item.id === id
            );

        eyebrow.textContent =
            id ? "Editar cliente" : "Novo cliente";

        title.textContent =
            id ? "Editar cliente" : "Cadastrar cliente";

        content = `
            <div class="form-grid">

                <div class="form-group">
                    <label>Nome</label>

                    <input
                        id="modalClientName"
                        value="${escapeHTML(
                            client?.name || ""
                        )}"
                        required
                    >
                </div>

                <div class="form-group">
                    <label>Empresa</label>

                    <input
                        id="modalClientCompany"
                        value="${escapeHTML(
                            client?.company || ""
                        )}"
                    >
                </div>

                <div class="form-group">
                    <label>Telefone</label>

                    <input
                        id="modalClientPhone"
                        value="${escapeHTML(
                            client?.phone || ""
                        )}"
                    >
                </div>

                <div class="form-group">
                    <label>E-mail</label>

                    <input
                        id="modalClientEmail"
                        type="email"
                        value="${escapeHTML(
                            client?.email || ""
                        )}"
                    >
                </div>

                <div class="form-group">
                    <label>Status</label>

                    <select id="modalClientStatus">

                        <option value="lead"
                            ${
                                client?.status ===
                                "lead"
                                    ? "selected"
                                    : ""
                            }>
                            Lead
                        </option>

                        <option value="negotiation"
                            ${
                                client?.status ===
                                "negotiation"
                                    ? "selected"
                                    : ""
                            }>
                            Negociação
                        </option>

                        <option value="customer"
                            ${
                                client?.status ===
                                "customer"
                                    ? "selected"
                                    : ""
                            }>
                            Cliente
                        </option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Responsável</label>

                    <select id="modalClientResponsible">

                        ${USERS
                            .map(
                                user => `
                                <option
                                    value="${escapeHTML(user.nome)}"
                                    ${
                                        (
                                            client?.responsible ||
                                            "Arthur Rodrigues"
                                        ) ===
                                        user.nome
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ${escapeHTML(user.nome)}
                                </option>
                            `
                            )
                            .join("")}

                    </select>
                </div>

                <div class="form-group">
                    <label>Potencial</label>

                    <input
                        id="modalClientPotential"
                        type="number"
                        step="0.01"
                        min="0"
                        value="${client?.potential || ""}"
                    >
                </div>

                <div class="form-group full">
                    <label>Observações</label>

                    <textarea id="modalClientNotes">${escapeHTML(
                        client?.notes || ""
                    )}</textarea>
                </div>

            </div>
        `;
    }

    if (type === "task") {

        const task =
            data.tasks.find(
                item => item.id === id
            );

        eyebrow.textContent =
            id ? "Editar tarefa" : "Nova tarefa";

        title.textContent =
            id ? "Editar tarefa" : "Criar tarefa";

        content = `
            <div class="form-grid">

                <div class="form-group full">
                    <label>Título</label>

                    <input
                        id="modalTaskTitle"
                        value="${escapeHTML(
                            task?.title || ""
                        )}"
                        required
                    >
                </div>

                <div class="form-group full">
                    <label>Descrição</label>

                    <textarea id="modalTaskDescription">${escapeHTML(
                        task?.description || ""
                    )}</textarea>
                </div>

                <div class="form-group">
                    <label>Data de entrega</label>

                    <input
                        id="modalTaskDueDate"
                        type="date"
                        value="${task?.dueDate || today()}"
                        required
                    >
                </div>

                <div class="form-group">
                    <label>Prioridade</label>

                    <select id="modalTaskPriority">

                        <option value="low"
                            ${
                                task?.priority ===
                                "low"
                                    ? "selected"
                                    : ""
                            }>
                            Baixa
                        </option>

                        <option value="medium"
                            ${
                                !task ||
                                task.priority ===
                                "medium"
                                    ? "selected"
                                    : ""
                            }>
                            Média
                        </option>

                        <option value="high"
                            ${
                                task?.priority ===
                                "high"
                                    ? "selected"
                                    : ""
                            }>
                            Alta
                        </option>

                    </select>
                </div>

                <div class="form-group full">
                    <label>Responsável</label>

                    <select id="modalTaskOwner">

                        ${USERS
                            .map(
                                user => `
                                <option
                                    value="${escapeHTML(user.nome)}"
                                    ${
                                        (
                                            task?.owner ||
                                            "Arthur Rodrigues"
                                        ) ===
                                        user.nome
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ${escapeHTML(user.nome)}
                                </option>
                            `
                            )
                            .join("")}

                    </select>
                </div>

            </div>
        `;
    }

    if (type === "goal") {

        eyebrow.textContent =
            "Meta geral";

        title.textContent =
            "Definir meta";

        content = `
            <div class="form-grid">

                <div class="form-group full">

                    <label>
                        Meta mensal
                    </label>

                    <input
                        id="modalGeneralGoal"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${data.goals.general || 0}"
                        required
                    >

                </div>

            </div>
        `;
    }

    body.innerHTML = content;

    overlay.classList.add("active");
}

/* =========================================================
   FECHAR MODAL
   ========================================================= */

function closeModal() {

    const overlay =
        document.getElementById(
            "modalOverlay"
        );

    if (overlay) {
        overlay.classList.remove(
            "active"
        );
    }

    currentModal = null;
    editingId = null;
}

/* =========================================================
   SUBMIT MODAL
   ========================================================= */

async function submitModal() {

    if (!isAdmin) {
        showToast(
            "Apenas o administrador pode editar.",
            "error"
        );

        return;
    }

    if (!currentModal) return;

    if (currentModal === "sale") {

        const clientId =
            document.getElementById(
                "modalClient"
            )?.value;

        const value =
            Number(
                document.getElementById(
                    "modalSaleValue"
                )?.value
            );

        const date =
            document.getElementById(
                "modalSaleDate"
            )?.value;

        const responsible =
            document.getElementById(
                "modalSaleResponsible"
            )?.value;

        const status =
            document.getElementById(
                "modalSaleStatus"
            )?.value;

        const payment =
            document.getElementById(
                "modalSalePayment"
            )?.value;

        const notes =
            document.getElementById(
                "modalSaleNotes"
            )?.value || "";

        if (!clientId) {
            showToast(
                "Selecione um cliente.",
                "error"
            );

            return;
        }

        if (!value || value <= 0) {
            showToast(
                "Informe um valor válido.",
                "error"
            );

            return;
        }

        const existing =
            data.sales.find(
                sale =>
                    sale.id === editingId
            );

        const sale = {
            id:
                editingId ||
                uid("sale"),

            clientId,
            value,
            date:
                date || today(),
            responsible,
            status,
            payment,
            notes,

            createdAt:
                existing?.createdAt ||
                new Date().toISOString()
        };

        if (editingId) {

            const index =
                data.sales.findIndex(
                    sale =>
                        sale.id ===
                        editingId
                );

            if (index !== -1) {
                data.sales[index] =
                    sale;
            }

            addActivity(
                "sale",
                "Venda atualizada",
                currency(value)
            );

        } else {

            data.sales.unshift(
                sale
            );

            addActivity(
                "sale",
                "Nova venda registrada",
                currency(value)
            );

            addNotification(
                "Nova venda",
                `Venda de ${currency(value)} registrada.`,
                "success"
            );
        }
    }

    if (currentModal === "client") {

        const name =
            document.getElementById(
                "modalClientName"
            )?.value.trim();

        const company =
            document.getElementById(
                "modalClientCompany"
            )?.value.trim();

        const phone =
            document.getElementById(
                "modalClientPhone"
            )?.value.trim();

        const email =
            document.getElementById(
                "modalClientEmail"
            )?.value.trim();

        const status =
            document.getElementById(
                "modalClientStatus"
            )?.value;

        const responsible =
            document.getElementById(
                "modalClientResponsible"
            )?.value;

        const potential =
            Number(
                document.getElementById(
                    "modalClientPotential"
                )?.value
            ) || 0;

        const notes =
            document.getElementById(
                "modalClientNotes"
            )?.value || "";

        if (!name) {
            showToast(
                "Informe o nome do cliente.",
                "error"
            );

            return;
        }

        const existing =
            data.clients.find(
                client =>
                    client.id ===
                    editingId
            );

        const client = {
            id:
                editingId ||
                uid("client"),

            name,
            company,
            phone,
            email,
            status,
            responsible,
            potential,
            notes,

            createdAt:
                existing?.createdAt ||
                new Date().toISOString()
        };

        if (editingId) {

            const index =
                data.clients.findIndex(
                    client =>
                        client.id ===
                        editingId
                );

            if (index !== -1) {
                data.clients[index] =
                    client;
            }

            addActivity(
                "client",
                "Cliente atualizado",
                name
            );

        } else {

            data.clients.unshift(
                client
            );

            addActivity(
                "client",
                "Novo cliente cadastrado",
                name
            );

            addNotification(
                "Novo cliente",
                `${name} foi cadastrado.`,
                "info"
            );
        }
    }

    if (currentModal === "task") {

        const title =
            document.getElementById(
                "modalTaskTitle"
            )?.value.trim();

        const description =
            document.getElementById(
                "modalTaskDescription"
            )?.value.trim();

        const dueDate =
            document.getElementById(
                "modalTaskDueDate"
            )?.value;

        const priority =
            document.getElementById(
                "modalTaskPriority"
            )?.value;

        const owner =
            document.getElementById(
                "modalTaskOwner"
            )?.value;

        if (!title) {
            showToast(
                "Informe o título da tarefa.",
                "error"
            );

            return;
        }

        const existing =
            data.tasks.find(
                task =>
                    task.id ===
                    editingId
            );

        const task = {
            id:
                editingId ||
                uid("task"),

            title,
            description,
            dueDate:
                dueDate || today(),

            priority,
            owner,

            completed:
                existing?.completed ||
                false,

            createdAt:
                existing?.createdAt ||
                new Date().toISOString()
        };

        if (editingId) {

            const index =
                data.tasks.findIndex(
                    task =>
                        task.id ===
                        editingId
                );

            if (index !== -1) {
                data.tasks[index] =
                    task;
            }

            addActivity(
                "task",
                "Tarefa atualizada",
                title
            );

        } else {

            data.tasks.unshift(
                task
            );

            addActivity(
                "task",
                "Nova tarefa criada",
                title
            );

            addNotification(
                "Nova tarefa",
                title,
                "info"
            );
        }
    }

    if (currentModal === "goal") {

        const value =
            Number(
                document.getElementById(
                    "modalGeneralGoal"
                )?.value
            );

        if (value < 0) {
            showToast(
                "Informe uma meta válida.",
                "error"
            );

            return;
        }

        data.goals.general =
            value;

        addActivity(
            "goal",
            "Meta geral atualizada",
            currency(value)
        );
    }

    closeModal();

    renderAll();

    await saveData();
}

/* =========================================================
   EXCLUIR VENDA
   ========================================================= */

async function deleteSale(id) {

    if (!isAdmin) return;

    const sale =
        data.sales.find(
            item => item.id === id
        );

    if (!sale) return;

    if (
        !confirm(
            "Deseja excluir esta venda?"
        )
    ) {
        return;
    }

    data.sales =
        data.sales.filter(
            item => item.id !== id
        );

    addActivity(
        "sale",
        "Venda excluída",
        currency(sale.value)
    );

    renderAll();

    await saveData();
}

/* =========================================================
   EXCLUIR CLIENTE
   ========================================================= */

async function deleteClient(id) {

    if (!isAdmin) return;

    const client =
        getClient(id);

    if (!client) return;

    if (
        !confirm(
            `Deseja excluir ${client.name}?`
        )
    ) {
        return;
    }

    data.clients =
        data.clients.filter(
            item => item.id !== id
        );

    addActivity(
        "client",
        "Cliente excluído",
        client.name
    );

    renderAll();

    await saveData();
}

/* =========================================================
   EXCLUIR TAREFA
   ========================================================= */

async function deleteTask(id) {

    if (!isAdmin) return;

    const task =
        data.tasks.find(
            item => item.id === id
        );

    if (!task) return;

    if (
        !confirm(
            `Excluir a tarefa "${task.title}"?`
        )
    ) {
        return;
    }

    data.tasks =
        data.tasks.filter(
            item => item.id !== id
        );

    addActivity(
        "task",
        "Tarefa excluída",
        task.title
    );

    renderAll();

    await saveData();
}

/* =========================================================
   CONCLUIR TAREFA
   ========================================================= */

async function toggleTask(id) {

    if (!isAdmin) {
        showToast(
            "Apenas o administrador pode alterar tarefas.",
            "error"
        );

        return;
    }

    const task =
        data.tasks.find(
            item => item.id === id
        );

    if (!task) return;

    task.completed =
        !task.completed;

    addActivity(
        "task",
        task.completed
            ? "Tarefa concluída"
            : "Tarefa reaberta",
        task.title
    );

    renderAll();

    await saveData();
}

/* =========================================================
   WHATSAPP
   ========================================================= */

function openWhatsApp(phone) {

    if (!phone) {
        showToast(
            "Este cliente não possui telefone.",
            "error"
        );

        return;
    }

    const numbers =
        String(phone)
            .replace(/\D/g, "");

    if (!numbers) {
        showToast(
            "Telefone inválido.",
            "error"
        );

        return;
    }

    const normalized =
        numbers.startsWith("55")
            ? numbers
            : `55${numbers}`;

    window.open(
        `https://wa.me/${normalized}`,
        "_blank"
    );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {

    const totalRevenue =
        data.sales
            .filter(
                sale =>
                    sale.status !==
                    "cancelled"
            )
            .reduce(
                (sum, sale) =>
                    sum +
                    Number(sale.value || 0),
                0
            );

    const salesCount =
        data.sales.length;

    const clientsCount =
        data.clients.length;

    const pendingTasks =
        data.tasks.filter(
            task =>
                !task.completed
        ).length;

    const goal =
        Number(
            data.goals.general
        ) || 0;

    const goalPercent =
        goal > 0
            ? Math.min(
                  100,
                  Math.round(
                      (totalRevenue /
                          goal) *
                          100
                  )
              )
            : 0;

    setText(
        "dashboardRevenue",
        currency(totalRevenue)
    );

    setText(
        "dashboardSales",
        salesCount
    );

    setText(
        "dashboardClients",
        clientsCount
    );

    setText(
        "dashboardTasks",
        pendingTasks
    );

    setText(
        "dashboardRevenueLarge",
        currency(totalRevenue)
    );

    setText(
        "dashboardGoalPercent",
        `${goalPercent}%`
    );

    const bar =
        document.getElementById(
            "dashboardGoalBar"
        );

    if (bar) {
        bar.style.width =
            `${goalPercent}%`;
    }

    setText(
        "dashboardGoalText",
        goal > 0
            ? `${currency(totalRevenue)} de ${currency(goal)}`
            : "Nenhuma meta definida"
    );

    setText(
        "dashboardRevenueInfo",
        `${data.sales.length} venda(s)`
    );

    setText(
        "dashboardSalesInfo",
        `${salesCount} registrada(s)`
    );

    setText(
        "dashboardTasksInfo",
        `${pendingTasks} pendente(s)`
    );

    setText(
        "currentDate",
        new Date().toLocaleDateString(
            "pt-BR",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        )
    );

    renderDashboardSales();
}

/* =========================================================
   VENDAS DO DASHBOARD
   ========================================================= */

function renderDashboardSales() {

    const container =
        document.getElementById(
            "dashboardSalesList"
        );

    if (!container) return;

    const sales =
        [...data.sales]
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            )
            .slice(0, 5);

    if (!sales.length) {

        container.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma venda registrada.</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        sales
            .map(
                sale => {

                    const client =
                        getClient(
                            sale.clientId
                        );

                    return `
                        <div class="list-item">

                            <div class="list-item-main">

                                <strong>
                                    ${escapeHTML(
                                        client?.name ||
                                        "Cliente"
                                    )}
                                </strong>

                                <span>
                                    ${formatDate(
                                        sale.date
                                    )}
                                </span>

                            </div>

                            <div class="list-item-value">
                                ${currency(
                                    sale.value
                                )}
                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}

/* =========================================================
   ESTATÍSTICAS DE VENDAS
   ========================================================= */

function renderSalesStats() {

    const validSales =
        data.sales.filter(
            sale =>
                sale.status !==
                "cancelled"
        );

    const revenue =
        validSales.reduce(
            (sum, sale) =>
                sum +
                Number(sale.value || 0),
            0
        );

    const received =
        validSales
            .filter(
                sale =>
                    sale.status ===
                    "paid"
            )
            .reduce(
                (sum, sale) =>
                    sum +
                    Number(sale.value || 0),
                0
            );

    const average =
        validSales.length
            ? revenue /
              validSales.length
            : 0;

    setText(
        "salesRevenue",
        currency(revenue)
    );

    setText(
        "salesCount",
        data.sales.length
    );

    setText(
        "salesReceived",
        currency(received)
    );

    setText(
        "salesAverage",
        currency(average)
    );

    renderSalesResponsibleFilter();
}

/* =========================================================
   FILTRO RESPONSÁVEL
   ========================================================= */

function renderSalesResponsibleFilter() {

    const select =
        document.getElementById(
            "salesResponsibleFilter"
        );

    if (!select) return;

    const current =
        select.value;

    const names = [
        ...new Set(
            data.sales
                .map(
                    sale =>
                        sale.responsible
                )
                .filter(Boolean)
        )
    ];

    select.innerHTML = `
        <option value="">
            Todos os responsáveis
        </option>

        ${names
            .map(
                name => `
                <option value="${escapeHTML(
                    name
                )}">
                    ${escapeHTML(name)}
                </option>
            `
            )
            .join("")}
    `;

    if (
        names.includes(current)
    ) {
        select.value =
            current;
    }
}

/* =========================================================
   RENDER VENDAS
   ========================================================= */

function renderSales() {

    const container =
        document.getElementById(
            "salesList"
        );

    if (!container) return;

    const search =
        (
            document.getElementById(
                "salesSearch"
            )?.value || ""
        )
            .toLowerCase()
            .trim();

    const status =
        document.getElementById(
            "salesStatusFilter"
        )?.value || "";

    const responsible =
        document.getElementById(
            "salesResponsibleFilter"
        )?.value || "";

    let sales =
        [...data.sales];

    if (search) {

        sales =
            sales.filter(
                sale => {

                    const client =
                        getClient(
                            sale.clientId
                        );

                    const text =
                        [
                            client?.name,
                            client?.company,
                            sale.responsible,
                            sale.notes
                        ]
                            .join(" ")
                            .toLowerCase();

                    return text.includes(
                        search
                    );
                }
            );
    }

    if (status) {

        sales =
            sales.filter(
                sale =>
                    sale.status ===
                    status
            );
    }

    if (responsible) {

        sales =
            sales.filter(
                sale =>
                    sale.responsible ===
                    responsible
            );
    }

    sales.sort(
        (a, b) =>
            new Date(b.date) -
            new Date(a.date)
    );

    if (!sales.length) {

        container.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma venda encontrada.</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        sales
            .map(
                sale => {

                    const client =
                        getClient(
                            sale.clientId
                        );

                    return `
                        <div class="table-row">

                            <div>
                                <strong>
                                    ${escapeHTML(
                                        client?.name ||
                                        "Cliente"
                                    )}
                                </strong>

                                <small>
                                    ${formatDate(
                                        sale.date
                                    )}
                                </small>
                            </div>

                            <div>
                                ${currency(
                                    sale.value
                                )}
                            </div>

                            <div>
                                ${escapeHTML(
                                    sale.responsible
                                )}
                            </div>

                            <div>
                                ${escapeHTML(
                                    sale.status
                                )}
                            </div>

                            ${
                                isAdmin
                                    ? `
                                <div class="row-actions">

                                    <button
                                        type="button"
                                        data-action="edit-sale"
                                        data-id="${escapeHTML(
                                            sale.id
                                        )}"
                                    >
                                        Editar
                                    </button>

                                    <button
                                        type="button"
                                        data-action="delete-sale"
                                        data-id="${escapeHTML(
                                            sale.id
                                        )}"
                                    >
                                        Excluir
                                    </button>

                                </div>
                            `
                                    : ""
                            }

                        </div>
                    `;
                }
            )
            .join("");
}

/* =========================================================
   ESTATÍSTICAS CLIENTES
   ========================================================= */

function renderClientStats() {

    const total =
        data.clients.length;

    const leads =
        data.clients.filter(
            client =>
                client.status ===
                "lead"
        ).length;

    const negotiation =
        data.clients.filter(
            client =>
                client.status ===
                "negotiation"
        ).length;

    const customers =
        data.clients.filter(
            client =>
                client.status ===
                "customer"
        ).length;

    setText(
        "clientTotal",
        total
    );

    setText(
        "clientLeads",
        leads
    );

    setText(
        "clientNegotiation",
        negotiation
    );

    setText(
        "clientCustomers",
        customers
    );
}

/* =========================================================
   CLIENTES
   ========================================================= */

function renderClients() {

    const container =
        document.getElementById(
            "clientList"
        );

    if (!container) return;

    const search =
        (
            document.getElementById(
                "clientSearch"
            )?.value || ""
        )
            .toLowerCase()
            .trim();

    const status =
        document.getElementById(
            "clientStatusFilter"
        )?.value || "";

    let clients =
        [...data.clients];

    if (search) {

        clients =
            clients.filter(
                client => {

                    const text =
                        [
                            client.name,
                            client.company,
                            client.phone,
                            client.email,
                            client.responsible
                        ]
                            .join(" ")
                            .toLowerCase();

                    return text.includes(
                        search
                    );
                }
            );
    }

    if (status) {

        clients =
            clients.filter(
                client =>
                    client.status ===
                    status
            );
    }

    if (!clients.length) {

        container.innerHTML = `
            <div class="empty-state">
                <p>Nenhum cliente encontrado.</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        clients
            .map(
                client => `
                    <div class="table-row">

                        <div>
                            <strong>
                                ${escapeHTML(
                                    client.name
                                )}
                            </strong>

                            <small>
                                ${escapeHTML(
                                    client.company ||
                                    ""
                                )}
                            </small>
                        </div>

                        <div>
                            ${escapeHTML(
                                client.phone ||
                                "-"
                            )}
                        </div>

                        <div>
                            ${escapeHTML(
                                client.status
                            )}
                        </div>

                        <div>
                            ${escapeHTML(
                                client.responsible
                            )}
                        </div>

                        <div>
                            ${currency(
                                client.potential
                            )}
                        </div>

                        <div class="row-actions">

                            ${
                                client.phone
                                    ? `
                                <button
                                    type="button"
                                    data-action="whatsapp"
                                    data-phone="${escapeHTML(
                                        client.phone
                                    )}"
                                >
                                    WhatsApp
                                </button>
                            `
                                    : ""
                            }

                            ${
                                isAdmin
                                    ? `
                                <button
                                    type="button"
                                    data-action="edit-client"
                                    data-id="${escapeHTML(
                                        client.id
                                    )}"
                                >
                                    Editar
                                </button>

                                <button
                                    type="button"
                                    data-action="delete-client"
                                    data-id="${escapeHTML(
                                        client.id
                                    )}"
                                >
                                    Excluir
                                </button>
                            `
                                    : ""
                            }

                        </div>

                    </div>
                `
            )
            .join("");
}

/* =========================================================
   ESTATÍSTICAS TAREFAS
   ========================================================= */

function renderTaskStats() {

    const total =
        data.tasks.length;

    const pending =
        data.tasks.filter(
            task =>
                !task.completed
        ).length;

    const completed =
        data.tasks.filter(
            task =>
                task.completed
        ).length;

    const overdue =
        data.tasks.filter(
            task =>
                !task.completed &&
                task.dueDate &&
                task.dueDate < today()
        ).length;

    setText(
        "taskTotal",
        total
    );

    setText(
        "taskPending",
        pending
    );

    setText(
        "taskCompleted",
        completed
    );

    setText(
        "taskOverdue",
        overdue
    );
}

/* =========================================================
   TAREFAS
   ========================================================= */

function renderTasks() {

    const container =
        document.getElementById(
            "fullTaskList"
        );

    if (!container) return;

    const activeFilter =
        document.querySelector(
            "[data-task-filter].active"
        )?.dataset.taskFilter ||
        "all";

    let tasks =
        [...data.tasks];

    if (
        activeFilter ===
        "pending"
    ) {

        tasks =
            tasks.filter(
                task =>
                    !task.completed
            );
    }

    if (
        activeFilter ===
        "completed"
    ) {

        tasks =
            tasks.filter(
                task =>
                    task.completed
            );
    }

    if (
        activeFilter ===
        "overdue"
    ) {

        tasks =
            tasks.filter(
                task =>
                    !task.completed &&
                    task.dueDate &&
                    task.dueDate <
                        today()
            );
    }

    tasks.sort(
        (a, b) => {

            if (
                a.completed !==
                b.completed
            ) {
                return a.completed
                    ? 1
                    : -1;
            }

            return String(
                a.dueDate
            ).localeCompare(
                String(
                    b.dueDate
                )
            );
        }
    );

    if (!tasks.length) {

        container.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma tarefa encontrada.</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        tasks
            .map(
                task => {

                    const overdue =
                        !task.completed &&
                        task.dueDate &&
                        task.dueDate <
                            today();

                    return `
                        <div class="task-item ${
                            task.completed
                                ? "completed"
                                : ""
                        }">

                            <div class="task-check">

                                <button
                                    type="button"
                                    data-action="toggle-task"
                                    data-id="${escapeHTML(
                                        task.id
                                    )}"
                                    ${
                                        task.completed
                                            ? "aria-label=\"Reabrir tarefa\""
                                            : "aria-label=\"Concluir tarefa\""
                                    }
                                >
                                    ${
                                        task.completed
                                            ? "✓"
                                            : "○"
                                    }
                                </button>

                            </div>

                            <div class="task-content">

                                <strong>
                                    ${escapeHTML(
                                        task.title
                                    )}
                                </strong>

                                <p>
                                    ${escapeHTML(
                                        task.description ||
                                        ""
                                    )}
                                </p>

                                <small>
                                    ${escapeHTML(
                                        task.owner
                                    )}
                                    ·
                                    ${formatDate(
                                        task.dueDate
                                    )}
                                    ${
                                        overdue
                                            ? " · Atrasada"
                                            : ""
                                    }
                                </small>

                            </div>

                            <div class="task-actions">

                                ${
                                    isAdmin
                                        ? `
                                    <button
                                        type="button"
                                        data-action="edit-task"
                                        data-id="${escapeHTML(
                                            task.id
                                        )}"
                                    >
                                        Editar
                                    </button>

                                    <button
                                        type="button"
                                        data-action="delete-task"
                                        data-id="${escapeHTML(
                                            task.id
                                        )}"
                                    >
                                        Excluir
                                    </button>
                                `
                                        : ""
                                }

                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}

/* =========================================================
   METAS
   ========================================================= */

function renderGoals() {

    const general =
        Number(
            data.goals.general
        ) || 0;

    setText(
        "generalGoal",
        currency(general)
    );

    const container =
        document.getElementById(
            "employeeGoals"
        );

    if (!container) return;

    const employees =
        getEmployees();

    if (!employees.length) {

        container.innerHTML = "";

        return;
    }

    container.innerHTML =
        employees
            .map(
                employee => {

                    const goal =
                        Number(
                            data.goals
                                .employees?.[
                                employee.nome
                            ]
                        ) || 0;

                    const revenue =
                        data.sales
                            .filter(
                                sale =>
                                    sale.responsible ===
                                    employee.nome &&
                                    sale.status !==
                                        "cancelled"
                            )
                            .reduce(
                                (sum, sale) =>
                                    sum +
                                    Number(
                                        sale.value ||
                                            0
                                    ),
                                0
                            );

                    const percent =
                        goal > 0
                            ? Math.min(
                                  100,
                                  Math.round(
                                      (revenue /
                                          goal) *
                                          100
                                  )
                              )
                            : 0;

                    return `
                        <div class="goal-item">

                            <div>
                                <strong>
                                    ${escapeHTML(
                                        employee.nome
                                    )}
                                </strong>

                                <small>
                                    ${currency(
                                        revenue
                                    )}
                                    ${
                                        goal
                                            ? ` de ${currency(
                                                  goal
                                              )}`
                                            : ""
                                    }
                                </small>
                            </div>

                            <div>
                                ${percent}%
                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}

/* =========================================================
   EQUIPE
   ========================================================= */

function renderTeam() {

    const container =
        document.getElementById(
            "teamList"
        );

    if (!container) return;

    container.innerHTML =
        USERS
            .map(
                user => `
                    <div class="team-item">

                        <div class="team-avatar">
                            ${escapeHTML(
                                user.avatar
                            )}
                        </div>

                        <div>
                            <strong>
                                ${escapeHTML(
                                    user.nome
                                )}
                            </strong>

                            <small>
                                ${escapeHTML(
                                    user.cargo
                                )}
                            </small>
                        </div>

                    </div>
                `
            )
            .join("");
}

/* =========================================================
   RELATÓRIOS
   ========================================================= */

function renderReports() {

    const revenue =
        data.sales
            .filter(
                sale =>
                    sale.status !==
                    "cancelled"
            )
            .reduce(
                (sum, sale) =>
                    sum +
                    Number(
                        sale.value || 0
                    ),
                0
            );

    const completed =
        data.tasks.filter(
            task =>
                task.completed
        ).length;

    const average =
        data.sales.length
            ? revenue /
              data.sales.length
            : 0;

    setText(
        "reportClients",
        data.clients.length
    );

    setText(
        "reportSales",
        data.sales.length
    );

    setText(
        "reportRevenue",
        currency(revenue)
    );

    setText(
        "reportTasks",
        data.tasks.length
    );

    setText(
        "reportCompleted",
        completed
    );

    setText(
        "reportAverage",
        currency(average)
    );

    renderRanking();
}

/* =========================================================
   RANKING
   ========================================================= */

function renderRanking() {

    const container =
        document.getElementById(
            "rankingList"
        );

    if (!container) return;

    const totals = {};

    USERS.forEach(
        user => {
            totals[user.nome] = 0;
        }
    );

    data.sales
        .filter(
            sale =>
                sale.status !==
                "cancelled"
        )
        .forEach(
            sale => {

                if (
                    !totals[
                        sale.responsible
                    ]
                ) {
                    totals[
                        sale.responsible
                    ] = 0;
                }

                totals[
                    sale.responsible
                ] += Number(
                    sale.value || 0
                );
            }
        );

    const ranking =
        Object.entries(
            totals
        )
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );

    const html =
        ranking
            .map(
                ([name, value], index) => `
                    <div class="ranking-item">

                        <span class="ranking-position">
                            ${index + 1}
                        </span>

                        <div class="ranking-person">

                            <strong>
                                ${escapeHTML(
                                    name
                                )}
                            </strong>

                        </div>

                        <strong>
                            ${currency(value)}
                        </strong>

                    </div>
                `
            )
            .join("");

    container.innerHTML =
        html ||
        `
            <div class="empty-state">
                <p>Nenhuma venda registrada.</p>
            </div>
        `;

    setText(
        "reportRanking",
        ranking.length
            ? ranking
                  .map(
                      ([name, value]) =>
                          `${name}: ${currency(
                              value
                          )}`
                  )
                  .join(" • ")
            : "Sem vendas"
    );
}

/* =========================================================
   ATIVIDADES
   ========================================================= */

function renderActivity() {

    const container =
        document.getElementById(
            "activityList"
        );

    if (!container) return;

    const activities =
        data.activities
            .slice(0, 10);

    if (!activities.length) {

        container.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma atividade ainda.</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        activities
            .map(
                activity => `
                    <div class="activity-item">

                        <div>
                            <strong>
                                ${escapeHTML(
                                    activity.title
                                )}
                            </strong>

                            <p>
                                ${escapeHTML(
                                    activity.description ||
                                    ""
                                )}
                            </p>

                            <small>
                                ${formatDate(
                                    activity.date
                                )}
                            </small>
                        </div>

                    </div>
                `
            )
            .join("");
}

/* =========================================================
   TAREFAS PRIORITÁRIAS
   ========================================================= */

function renderPriorityTasks() {

    const container =
        document.getElementById(
            "priorityTasks"
        );

    if (!container) return;

    const tasks =
        data.tasks
            .filter(
                task =>
                    !task.completed
            )
            .sort(
                (a, b) =>
                    new Date(
                        a.dueDate
                    ) -
                    new Date(
                        b.dueDate
                    )
            )
            .slice(0, 5);

    if (!tasks.length) {

        container.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma tarefa pendente.</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        tasks
            .map(
                task => `
                    <div class="priority-task">

                        <strong>
                            ${escapeHTML(
                                task.title
                            )}
                        </strong>

                        <small>
                            ${formatDate(
                                task.dueDate
                            )}
                            ·
                            ${escapeHTML(
                                task.owner
                            )}
                        </small>

                    </div>
                `
            )
            .join("");
}

/* =========================================================
   NOTIFICAÇÕES
   ========================================================= */

function renderNotifications() {

    const count =
        data.notifications.filter(
            item =>
                !item.read
        ).length;

    setText(
        "notificationCount",
        count > 99
            ? "99+"
            : count
    );
}

/* =========================================================
   EXPORTAR
   ========================================================= */

function exportData() {

    const blob =
        new Blob(
            [
                JSON.stringify(
                    data,
                    null,
                    2
                )
            ],
            {
                type:
                    "application/json"
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const link =
        document.createElement(
            "a"
        );

    link.href = url;

    link.download =
        `nexa-management-${today()}.json`;

    link.click();

    URL.revokeObjectURL(url);

    showToast(
        "Dados exportados."
    );
}

/* =========================================================
   IMPORTAR
   ========================================================= */

async function importData(file) {

    if (!isAdmin) {

        showToast(
            "Apenas o administrador pode importar dados.",
            "error"
        );

        return;
    }

    try {

        const text =
            await file.text();

        const imported =
            JSON.parse(text);

        data =
            normalizeData(
                imported
            );

        addActivity(
            "system",
            "Dados importados"
        );

        renderAll();

        await saveData();

    } catch (error) {

        console.error(
            error
        );

        showToast(
            "Arquivo inválido.",
            "error"
        );
    }
}

/* =========================================================
   RESET
   ========================================================= */

async function resetData() {

    if (!isAdmin) {

        showToast(
            "Apenas o administrador pode resetar os dados.",
            "error"
        );

        return;
    }

    const confirmed =
        confirm(
            "ATENÇÃO!\n\nIsso apagará clientes, vendas, tarefas, atividades, notificações e metas.\n\nDeseja continuar?"
        );

    if (!confirmed) return;

    data =
        defaultData();

    renderAll();

    await saveData();

    showToast(
        "Dados resetados."
    );
}

/* =========================================================
   EVENTOS — DATA ACTION
   ========================================================= */

document.addEventListener(
    "click",
    async event => {

        const target =
            event.target.closest(
                "[data-action]"
            );

        if (!target) return;

        const action =
            target.dataset.action;

        const id =
            target.dataset.id;

        if (
            action ===
            "navigate"
        ) {

            navigateTo(
                target.dataset.page
            );

            return;
        }

        if (
            action ===
            "admin-login"
        ) {

            requestAdminAccess();

            return;
        }

        if (
            action ===
            "logout"
        ) {

            exitAdminMode();

            return;
        }

        if (
            action ===
            "new-sale"
        ) {

            openModal(
                "sale"
            );

            return;
        }

        if (
            action ===
            "edit-sale"
        ) {

            openModal(
                "sale",
                id
            );

            return;
        }

        if (
            action ===
            "delete-sale"
        ) {

            await deleteSale(
                id
            );

            return;
        }

        if (
            action ===
            "new-client"
        ) {

            openModal(
                "client"
            );

            return;
        }

        if (
            action ===
            "edit-client"
        ) {

            openModal(
                "client",
                id
            );

            return;
        }

        if (
            action ===
            "delete-client"
        ) {

            await deleteClient(
                id
            );

            return;
        }

        if (
            action ===
            "whatsapp"
        ) {

            openWhatsApp(
                target.dataset.phone
            );

            return;
        }

        if (
            action ===
            "new-task"
        ) {

            openModal(
                "task"
            );

            return;
        }

        if (
            action ===
            "edit-task"
        ) {

            openModal(
                "task",
                id
            );

            return;
        }

        if (
            action ===
            "delete-task"
        ) {

            await deleteTask(
                id
            );

            return;
        }

        if (
            action ===
            "toggle-task"
        ) {

            await toggleTask(
                id
            );

            return;
        }

        if (
            action ===
            "edit-general-goal"
        ) {

            openModal(
                "goal"
            );

            return;
        }

        if (
            action ===
            "notifications"
        ) {

            data.notifications =
                data.notifications.map(
                    notification => ({
                        ...notification,
                        read: true
                    })
                );

            renderNotifications();

            if (isAdmin) {
                await saveData(
                    false
                );
            }

            return;
        }

        if (
            action ===
            "export"
        ) {

            exportData();

            return;
        }

        if (
            action ===
            "reset"
        ) {

            await resetData();

            return;
        }

        if (
            action ===
                "close-modal" ||
            action ===
                "cancel-modal"
        ) {

            closeModal();

            return;
        }

        if (
            action ===
            "submit-modal"
        ) {

            await submitModal();

            return;
        }
    }
);

/* =========================================================
   FORM SUBMIT
   ========================================================= */

document.addEventListener(
    "submit",
    async event => {

        if (
            event.target.id !==
            "modalForm"
        ) {
            return;
        }

        event.preventDefault();

        await submitModal();
    }
);

/* =========================================================
   PESQUISA
   ========================================================= */

document.addEventListener(
    "input",
    event => {

        if (
            event.target.id ===
            "salesSearch"
        ) {
            renderSales();
        }

        if (
            event.target.id ===
            "clientSearch"
        ) {
            renderClients();
        }
    }
);

/* =========================================================
   SELECTS / IMPORT
   ========================================================= */

document.addEventListener(
    "change",
    event => {

        if (
            event.target.id ===
                "salesStatusFilter" ||
            event.target.id ===
                "salesResponsibleFilter"
        ) {

            renderSales();
        }

        if (
            event.target.id ===
            "clientStatusFilter"
        ) {

            renderClients();
        }

        if (
            event.target.id ===
            "importFile"
        ) {

            const file =
                event.target.files?.[0];

            if (file) {
                importData(
                    file
                );
            }
        }
    }
);

/* =========================================================
   FILTROS DE TAREFAS
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const filter =
            event.target.closest(
                "[data-task-filter]"
            );

        if (!filter) return;

        document
            .querySelectorAll(
                "[data-task-filter]"
            )
            .forEach(
                item =>
                    item.classList.remove(
                        "active"
                    )
            );

        filter.classList.add(
            "active"
        );

        renderTasks();
    }
);

/* =========================================================
   MODAL — FECHAR CLICANDO FORA
   ========================================================= */

const modalOverlay =
    document.getElementById(
        "modalOverlay"
    );

if (modalOverlay) {

    modalOverlay.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modalOverlay
            ) {
                closeModal();
            }
        }
    );
}

/* =========================================================
   MENU MOBILE
   ========================================================= */

const mobileMenu =
    document.getElementById(
        "mobileMenu"
    );

if (mobileMenu) {

    mobileMenu.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "mobile-menu-open"
            );
        }
    );
}

/* =========================================================
   BOTÕES DO MODAL
   ========================================================= */

const modalClose =
    document.getElementById(
        "modalClose"
    );

const modalCancel =
    document.getElementById(
        "modalCancel"
    );

const modalSubmit =
    document.getElementById(
        "modalSubmit"
    );

modalClose?.addEventListener(
    "click",
    closeModal
);

modalCancel?.addEventListener(
    "click",
    closeModal
);

modalSubmit?.addEventListener(
    "click",
    async () => {
        await submitModal();
    }
);

/* =========================================================
   NOTIFICAÇÕES
   ========================================================= */

const notificationButton =
    document.getElementById(
        "notificationButton"
    );

notificationButton?.addEventListener(
    "click",
    async () => {

        data.notifications =
            data.notifications.map(
                notification => ({
                    ...notification,
                    read: true
                })
            );

        renderNotifications();

        if (isAdmin) {
            await saveData(
                false
            );
        }

        showToast(
            "Notificações visualizadas."
        );
    }
);

/* =========================================================
   AVATAR — ADMIN
   ========================================================= */

const topAvatar =
    document.getElementById(
        "topAvatar"
    );

if (topAvatar) {

    topAvatar.style.cursor =
        "pointer";

    topAvatar.title =
        "Selecionar usuário / administrador";

    topAvatar.addEventListener(
        "click",
        () => {

            if (isAdmin) {

                const change =
                    confirm(
                        "Você está no modo administrador.\n\nOK = sair do modo administrador\nCancelar = continuar"
                    );

                if (change) {
                    exitAdminMode();
                }

                return;
            }

            requestUserSelection();
        }
    );
}

/* =========================================================
   SINCRONIZAÇÃO AUTOMÁTICA
   ========================================================= */

function startPolling() {

    if (pollTimer) {
        clearInterval(
            pollTimer
        );
    }

    pollTimer =
        setInterval(
            async () => {

                const modal =
                    document.getElementById(
                        "modalOverlay"
                    );

                const modalOpen =
                    modal?.classList.contains(
                        "active"
                    );

                if (
                    modalOpen ||
                    isSaving
                ) {
                    return;
                }

                await loadData(
                    false
                );
            },
            POLL_INTERVAL
        );
}

/* =========================================================
   RENDER GERAL
   ========================================================= */

function renderAll() {

    updateProfileUI();

    renderDashboard();

    renderSalesStats();
    renderSales();

    renderClientStats();
    renderClients();

    renderTaskStats();
    renderTasks();

    renderGoals();

    renderTeam();

    renderReports();

    renderRanking();

    renderActivity();

    renderPriorityTasks();

    renderNotifications();
}

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

async function init() {

    isAdmin =
        Boolean(
            localStorage.getItem(
                ADMIN_TOKEN_KEY
            )
        );

    adminToken =
        localStorage.getItem(
            ADMIN_TOKEN_KEY
        ) || "";

    selectedUserName =
        localStorage.getItem(
            USER_NAME_KEY
        ) || "";

    updateCurrentUser();

    renderAll();

    /*
     * Se ainda não escolheu um nome
     * e não está no modo administrador,
     * mostra a identificação.
     */

    if (
        !isAdmin &&
        !selectedUserName
    ) {
        requestUserSelection();
    }

    await loadData();

    startPolling();

    navigateTo(
        currentPage
    );
}

/* =========================================================
   INICIAR
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

} else {

    init();
}