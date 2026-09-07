/* =========================================================
   NEXA MANAGEMENT
   SCRIPT PRINCIPAL
   Banco online via Vercel API + Supabase
   Sem login para funcionários
   ========================================================= */

const API_URL = "/api/nexa-data.js";

let data = defaultData();
let currentUser = {
    nome: "Administrador",
    cargo: "Administrador",
    permissao: "admin",
    avatar: "A"
};

let isAdmin = false;
let adminToken = localStorage.getItem("nexaAdminToken") || "";
let isSaving = false;
let isLoading = false;
let pollTimer = null;
let currentModalType = null;
let currentModalId = null;


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
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHTML(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function initials(name = "") {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0])
        .join("")
        .toUpperCase();
}

function currency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatDate(date) {
    if (!date) return "—";

    const d = new Date(date + (String(date).length === 10 ? "T12:00:00" : ""));

    if (Number.isNaN(d.getTime())) return "—";

    return d.toLocaleDateString("pt-BR");
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function findUser(name) {
    return USERS.find(user => user.nome === name) || null;
}

function getEmployees() {
    return USERS.filter(user => user.permissao !== "admin");
}

function getClient(id) {
    return data.clients.find(client => client.id === id);
}

function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");

    if (!container) return;

    const toast = document.createElement("div");

    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${escapeHTML(message)}</span>
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


/* =========================================================
   NORMALIZAÇÃO
   ========================================================= */

function normalizeData(raw) {
    const base = defaultData();

    if (!raw || typeof raw !== "object") {
        return base;
    }

    return {
        clients: Array.isArray(raw.clients) ? raw.clients : [],
        sales: Array.isArray(raw.sales) ? raw.sales : [],
        tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
        activities: Array.isArray(raw.activities) ? raw.activities : [],
        notifications: Array.isArray(raw.notifications) ? raw.notifications : [],
        goals: {
            general: Number(raw.goals?.general || 0),
            employees: raw.goals?.employees || {}
        },
        settings: raw.settings || {}
    };
}

function normalizeClient(client) {
    return {
        id: client.id || uid("client"),
        name: client.name || "",
        company: client.company || "",
        phone: client.phone || "",
        email: client.email || "",
        status: client.status || "lead",
        responsible: client.responsible || "Administrador",
        potential: Number(client.potential || 0),
        notes: client.notes || "",
        createdAt: client.createdAt || today()
    };
}

function normalizeSale(sale) {
    return {
        id: sale.id || uid("sale"),
        clientId: sale.clientId || "",
        value: Number(sale.value || 0),
        date: sale.date || today(),
        responsible: sale.responsible || "Administrador",
        status: sale.status || "pending",
        payment: sale.payment || "pix",
        notes: sale.notes || "",
        createdAt: sale.createdAt || new Date().toISOString()
    };
}

function normalizeTask(task) {
    return {
        id: task.id || uid("task"),
        title: task.title || "",
        description: task.description || "",
        dueDate: task.dueDate || today(),
        priority: task.priority || "medium",
        owner: task.owner || "Administrador",
        completed: Boolean(task.completed),
        createdAt: task.createdAt || new Date().toISOString()
    };
}


/* =========================================================
   API — CARREGAR DADOS
   ========================================================= */

async function loadData(showMessage = false) {

    if (isLoading) return;

    isLoading = true;

    try {

        const response = await fetch(`${API_URL}?t=${Date.now()}`, {
            method: "GET",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.data) {
            throw new Error("API não retornou os dados do NEXA.");
        }

        data = normalizeData(result.data);

        data.clients = data.clients.map(normalizeClient);
        data.sales = data.sales.map(normalizeSale);
        data.tasks = data.tasks.map(normalizeTask);

        renderAll();

        if (showMessage) {
            showToast("Dados sincronizados.");
        }

    } catch (error) {

        console.error("Erro ao carregar NEXA:", error);

        showToast(
            "Não foi possível carregar os dados online.",
            "error"
        );

    } finally {

        isLoading = false;
    }
}


/* =========================================================
   API — SALVAR DADOS
   ========================================================= */

async function saveData(showMessage = false) {

    if (!isAdmin) {
        showToast(
            "Somente o administrador pode alterar os dados.",
            "error"
        );

        return false;
    }

    if (!adminToken) {
        showToast(
            "Ative o modo administrador primeiro.",
            "error"
        );

        return false;
    }

    if (isSaving) return false;

    isSaving = true;

    try {

        const response = await fetch(API_URL, {
            method: "PUT",

            headers: {
                "Content-Type": "application/json",
                "x-nexa-admin-token": adminToken
            },

            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Erro ao salvar os dados."
            );
        }

        data = normalizeData(result.data || data);

        if (showMessage) {
            showToast("Alterações salvas online.");
        }

        return true;

    } catch (error) {

        console.error("Erro ao salvar:", error);

        showToast(
            error.message || "Erro ao salvar os dados.",
            "error"
        );

        return false;

    } finally {

        isSaving = false;
    }
}


/* =========================================================
   ATIVIDADES
   ========================================================= */

function addActivity(text, type = "system") {

    data.activities.unshift({
        id: uid("activity"),
        text,
        type,
        date: new Date().toISOString(),
        user: currentUser.nome
    });

    data.activities = data.activities.slice(0, 100);
}


/* =========================================================
   PERFIL / ADMIN
   ========================================================= */

function updateProfileUI() {

    const name = document.getElementById("topUserName");
    const role = document.getElementById("topUserRole");
    const avatar = document.getElementById("topAvatar");

    if (name) {
        name.textContent = isAdmin
            ? "Administrador"
            : "Visualização";
    }

    if (role) {
        role.textContent = isAdmin
            ? "Administrador"
            : "Funcionário";
    }

    if (avatar) {
        avatar.textContent = isAdmin ? "A" : "N";
    }

    document.querySelectorAll(".admin-only").forEach(element => {
        element.style.display = isAdmin ? "" : "none";
    });
}


/* =========================================================
   MODO ADMINISTRADOR
   ========================================================= */

function requestAdminAccess() {

    if (isAdmin) {
        exitAdminMode();
        return;
    }

    const token = prompt(
        "Digite o token do administrador:"
    );

    if (!token) return;

    adminToken = token;

    localStorage.setItem(
        "nexaAdminToken",
        token
    );

    isAdmin = true;

    updateProfileUI();

    showToast("Modo administrador ativado.");

    renderAll();
}

function exitAdminMode() {

    isAdmin = false;
    adminToken = "";

    localStorage.removeItem("nexaAdminToken");

    updateProfileUI();

    showToast("Modo administrador encerrado.");

    renderAll();
}


/* =========================================================
   NAVEGAÇÃO
   ========================================================= */

function navigateTo(page) {

    if (!page) return;

    const adminPages = [
        "team",
        "reports",
        "settings"
    ];

    if (
        adminPages.includes(page) &&
        !isAdmin
    ) {
        showToast(
            "Essa área é exclusiva do administrador.",
            "error"
        );

        return;
    }

    document.querySelectorAll(".page").forEach(section => {
        section.classList.remove("active");
    });

    const target = document.getElementById(page);

    if (target) {
        target.classList.add("active");
    }

    document.querySelectorAll("[data-page]").forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.page === page
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

    const pageTitle = document.getElementById("pageTitle");

    if (pageTitle) {
        pageTitle.textContent =
            titles[page] || "NEXA Management";
    }

    document.body.classList.remove("mobile-menu-open");
}


/* =========================================================
   MODAL
   ========================================================= */

function openModal(type, id = null) {

    if (!isAdmin) {
        showToast(
            "Somente o administrador pode editar.",
            "error"
        );

        return;
    }

    const overlay = document.getElementById("modalOverlay");
    const title = document.getElementById("modalTitle");
    const eyebrow = document.getElementById("modalEyebrow");
    const body = document.getElementById("modalBody");
    const submit = document.getElementById("modalSubmit");

    if (!overlay || !body) return;

    currentModalType = type;
    currentModalId = id;

    let html = "";

    /* =========================
       VENDA
       ========================= */

    if (type === "sale") {

        const sale = id
            ? data.sales.find(item => item.id === id)
            : null;

        eyebrow.textContent = sale
            ? "Editar"
            : "Nova";

        title.textContent = "Venda";

        submit.textContent = sale
            ? "Salvar alterações"
            : "Cadastrar venda";

        html = `
            <div class="form-group">
                <label>Cliente</label>

                <select id="modalSaleClient" required>
                    <option value="">Selecione um cliente</option>

                    ${data.clients.map(client => `
                        <option
                            value="${escapeHTML(client.id)}"
                            ${sale?.clientId === client.id ? "selected" : ""}
                        >
                            ${escapeHTML(
                                client.name ||
                                client.company ||
                                "Cliente"
                            )}
                        </option>
                    `).join("")}
                </select>
            </div>

            <div class="form-grid">

                <div class="form-group">
                    <label>Valor</label>

                    <input
                        id="modalSaleValue"
                        type="number"
                        step="0.01"
                        min="0"
                        value="${sale?.value || ""}"
                        placeholder="0,00"
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

            </div>

            <div class="form-grid">

                <div class="form-group">
                    <label>Responsável</label>

                    <select id="modalSaleResponsible">

                        <option value="Administrador"
                            ${sale?.responsible === "Administrador" ? "selected" : ""}
                        >
                            Administrador
                        </option>

                        <option value="Arthur Rodrigues"
                            ${sale?.responsible === "Arthur Rodrigues" ? "selected" : ""}
                        >
                            Arthur Rodrigues
                        </option>

                        <option value="Pietro de Jesus"
                            ${sale?.responsible === "Pietro de Jesus" ? "selected" : ""}
                        >
                            Pietro de Jesus
                        </option>

                    </select>
                </div>

                <div class="form-group">
                    <label>Status</label>

                    <select id="modalSaleStatus">

                        <option value="pending"
                            ${sale?.status === "pending" ? "selected" : ""}
                        >
                            Pendente
                        </option>

                        <option value="received"
                            ${sale?.status === "received" ? "selected" : ""}
                        >
                            Recebida
                        </option>

                        <option value="cancelled"
                            ${sale?.status === "cancelled" ? "selected" : ""}
                        >
                            Cancelada
                        </option>

                    </select>
                </div>

            </div>

            <div class="form-group">
                <label>Pagamento</label>

                <select id="modalSalePayment">

                    <option value="pix"
                        ${sale?.payment === "pix" ? "selected" : ""}
                    >
                        PIX
                    </option>

                    <option value="card"
                        ${sale?.payment === "card" ? "selected" : ""}
                    >
                        Cartão
                    </option>

                    <option value="cash"
                        ${sale?.payment === "cash" ? "selected" : ""}
                    >
                        Dinheiro
                    </option>

                    <option value="other"
                        ${sale?.payment === "other" ? "selected" : ""}
                    >
                        Outro
                    </option>

                </select>
            </div>

            <div class="form-group">
                <label>Observações</label>

                <textarea
                    id="modalSaleNotes"
                    rows="4"
                    placeholder="Observações da venda..."
                >${escapeHTML(sale?.notes || "")}</textarea>
            </div>
        `;
    }


    /* =========================
       CLIENTE
       ========================= */

    if (type === "client") {

        const client = id
            ? getClient(id)
            : null;

        eyebrow.textContent = client
            ? "Editar"
            : "Novo";

        title.textContent = "Cliente";

        submit.textContent = client
            ? "Salvar alterações"
            : "Cadastrar cliente";

        html = `
            <div class="form-grid">

                <div class="form-group">
                    <label>Nome</label>

                    <input
                        id="modalClientName"
                        value="${escapeHTML(client?.name || "")}"
                        placeholder="Nome do cliente"
                        required
                    >
                </div>

                <div class="form-group">
                    <label>Empresa</label>

                    <input
                        id="modalClientCompany"
                        value="${escapeHTML(client?.company || "")}"
                        placeholder="Empresa"
                    >
                </div>

            </div>

            <div class="form-grid">

                <div class="form-group">
                    <label>Telefone</label>

                    <input
                        id="modalClientPhone"
                        value="${escapeHTML(client?.phone || "")}"
                        placeholder="(00) 00000-0000"
                    >
                </div>

                <div class="form-group">
                    <label>E-mail</label>

                    <input
                        id="modalClientEmail"
                        type="email"
                        value="${escapeHTML(client?.email || "")}"
                        placeholder="cliente@email.com"
                    >
                </div>

            </div>

            <div class="form-grid">

                <div class="form-group">
                    <label>Status</label>

                    <select id="modalClientStatus">

                        <option value="lead"
                            ${client?.status === "lead" ? "selected" : ""}
                        >
                            Lead
                        </option>

                        <option value="negotiation"
                            ${client?.status === "negotiation" ? "selected" : ""}
                        >
                            Negociação
                        </option>

                        <option value="customer"
                            ${client?.status === "customer" ? "selected" : ""}
                        >
                            Cliente
                        </option>

                    </select>
                </div>

                <div class="form-group">
                    <label>Responsável</label>

                    <select id="modalClientResponsible">

                        <option value="Administrador"
                            ${client?.responsible === "Administrador" ? "selected" : ""}
                        >
                            Administrador
                        </option>

                        <option value="Arthur Rodrigues"
                            ${client?.responsible === "Arthur Rodrigues" ? "selected" : ""}
                        >
                            Arthur Rodrigues
                        </option>

                        <option value="Pietro de Jesus"
                            ${client?.responsible === "Pietro de Jesus" ? "selected" : ""}
                        >
                            Pietro de Jesus
                        </option>

                    </select>
                </div>

            </div>

            <div class="form-group">
                <label>Potencial</label>

                <input
                    id="modalClientPotential"
                    type="number"
                    step="0.01"
                    min="0"
                    value="${client?.potential || ""}"
                    placeholder="0,00"
                >
            </div>

            <div class="form-group">
                <label>Observações</label>

                <textarea
                    id="modalClientNotes"
                    rows="4"
                    placeholder="Observações..."
                >${escapeHTML(client?.notes || "")}</textarea>
            </div>
        `;
    }


    /* =========================
       TAREFA
       ========================= */

    if (type === "task") {

        const task = id
            ? data.tasks.find(item => item.id === id)
            : null;

        eyebrow.textContent = task
            ? "Editar"
            : "Nova";

        title.textContent = "Tarefa";

        submit.textContent = task
            ? "Salvar alterações"
            : "Criar tarefa";

        html = `
            <div class="form-group">
                <label>Título</label>

                <input
                    id="modalTaskTitle"
                    value="${escapeHTML(task?.title || "")}"
                    placeholder="Ex: Entrar em contato com cliente"
                    required
                >
            </div>

            <div class="form-group">
                <label>Descrição</label>

                <textarea
                    id="modalTaskDescription"
                    rows="4"
                    placeholder="Descrição da tarefa..."
                >${escapeHTML(task?.description || "")}</textarea>
            </div>

            <div class="form-grid">

                <div class="form-group">
                    <label>Prazo</label>

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
                            ${task?.priority === "low" ? "selected" : ""}
                        >
                            Baixa
                        </option>

                        <option value="medium"
                            ${task?.priority === "medium" ? "selected" : ""}
                        >
                            Média
                        </option>

                        <option value="high"
                            ${task?.priority === "high" ? "selected" : ""}
                        >
                            Alta
                        </option>

                    </select>
                </div>

            </div>

            <div class="form-group">
                <label>Responsável</label>

                <select id="modalTaskOwner">

                    <option value="Administrador"
                        ${task?.owner === "Administrador" ? "selected" : ""}
                    >
                        Administrador
                    </option>

                    <option value="Arthur Rodrigues"
                        ${task?.owner === "Arthur Rodrigues" ? "selected" : ""}
                    >
                        Arthur Rodrigues
                    </option>

                    <option value="Pietro de Jesus"
                        ${task?.owner === "Pietro de Jesus" ? "selected" : ""}
                    >
                        Pietro de Jesus
                    </option>

                </select>
            </div>
        `;
    }


    /* =========================
       META
       ========================= */

    if (type === "goal") {

        eyebrow.textContent = "Configuração";
        title.textContent = "Meta geral";
        submit.textContent = "Salvar meta";

        html = `
            <div class="form-group">
                <label>Meta mensal</label>

                <input
                    id="modalGoalValue"
                    type="number"
                    min="0"
                    step="0.01"
                    value="${Number(data.goals.general || 0)}"
                    placeholder="0,00"
                >
            </div>
        `;
    }

    body.innerHTML = html;

    overlay.classList.add("active");
    document.body.classList.add("modal-open");
}

function closeModal() {

    const overlay = document.getElementById("modalOverlay");

    if (overlay) {
        overlay.classList.remove("active");
    }

    document.body.classList.remove("modal-open");

    currentModalType = null;
    currentModalId = null;
}


/* =========================================================
   SALVAR MODAL
   ========================================================= */

async function submitModal() {

    if (!isAdmin) {
        showToast(
            "Modo administrador necessário.",
            "error"
        );

        return;
    }

    /* =========================
       VENDA
       ========================= */

    if (currentModalType === "sale") {

        const clientId =
            document.getElementById("modalSaleClient")?.value;

        const value =
            Number(
                document.getElementById("modalSaleValue")?.value
            );

        const date =
            document.getElementById("modalSaleDate")?.value;

        const responsible =
            document.getElementById("modalSaleResponsible")?.value;

        const status =
            document.getElementById("modalSaleStatus")?.value;

        const payment =
            document.getElementById("modalSalePayment")?.value;

        const notes =
            document.getElementById("modalSaleNotes")?.value;

        if (!clientId) {
            showToast("Selecione um cliente.", "error");
            return;
        }

        if (!value || value <= 0) {
            showToast("Digite um valor válido.", "error");
            return;
        }

        const existing =
            data.sales.find(item => item.id === currentModalId);

        const sale = normalizeSale({
            ...(existing || {}),
            id: existing?.id || uid("sale"),
            clientId,
            value,
            date,
            responsible,
            status,
            payment,
            notes,
            createdAt:
                existing?.createdAt ||
                new Date().toISOString()
        });

        if (existing) {

            const index =
                data.sales.findIndex(
                    item => item.id === currentModalId
                );

            data.sales[index] = sale;

            addActivity(
                `Venda de ${currency(value)} atualizada.`
            );

        } else {

            data.sales.unshift(sale);

            const client = getClient(clientId);

            addActivity(
                `Nova venda de ${currency(value)} para ${
                    client?.name ||
                    client?.company ||
                    "cliente"
                }.`
            );
        }

        closeModal();

        renderAll();

        await saveData(true);

        return;
    }


    /* =========================
       CLIENTE
       ========================= */

    if (currentModalType === "client") {

        const name =
            document.getElementById("modalClientName")?.value.trim();

        const company =
            document.getElementById("modalClientCompany")?.value.trim();

        const phone =
            document.getElementById("modalClientPhone")?.value.trim();

        const email =
            document.getElementById("modalClientEmail")?.value.trim();

        const status =
            document.getElementById("modalClientStatus")?.value;

        const responsible =
            document.getElementById("modalClientResponsible")?.value;

        const potential =
            Number(
                document.getElementById("modalClientPotential")?.value || 0
            );

        const notes =
            document.getElementById("modalClientNotes")?.value;

        if (!name && !company) {
            showToast(
                "Informe o nome ou a empresa.",
                "error"
            );

            return;
        }

        const existing =
            getClient(currentModalId);

        const client = normalizeClient({
            ...(existing || {}),
            id: existing?.id || uid("client"),
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
                today()
        });

        if (existing) {

            const index =
                data.clients.findIndex(
                    item => item.id === currentModalId
                );

            data.clients[index] = client;

            addActivity(
                `Cliente ${name || company} atualizado.`
            );

        } else {

            data.clients.unshift(client);

            addActivity(
                `Novo cliente ${name || company} cadastrado.`
            );
        }

        closeModal();

        renderAll();

        await saveData(true);

        return;
    }


    /* =========================
       TAREFA
       ========================= */

    if (currentModalType === "task") {

        const title =
            document.getElementById("modalTaskTitle")?.value.trim();

        const description =
            document.getElementById("modalTaskDescription")?.value;

        const dueDate =
            document.getElementById("modalTaskDueDate")?.value;

        const priority =
            document.getElementById("modalTaskPriority")?.value;

        const owner =
            document.getElementById("modalTaskOwner")?.value;

        if (!title) {
            showToast(
                "Digite o título da tarefa.",
                "error"
            );

            return;
        }

        const existing =
            data.tasks.find(item => item.id === currentModalId);

        const task = normalizeTask({
            ...(existing || {}),
            id: existing?.id || uid("task"),
            title,
            description,
            dueDate,
            priority,
            owner,
            completed: existing?.completed || false,
            createdAt:
                existing?.createdAt ||
                new Date().toISOString()
        });

        if (existing) {

            const index =
                data.tasks.findIndex(
                    item => item.id === currentModalId
                );

            data.tasks[index] = task;

            addActivity(
                `Tarefa "${title}" atualizada.`
            );

        } else {

            data.tasks.unshift(task);

            addActivity(
                `Nova tarefa "${title}" criada.`
            );
        }

        closeModal();

        renderAll();

        await saveData(true);

        return;
    }


    /* =========================
       META
       ========================= */

    if (currentModalType === "goal") {

        const value =
            Number(
                document.getElementById("modalGoalValue")?.value || 0
            );

        data.goals.general = value;

        addActivity(
            `Meta geral definida em ${currency(value)}.`
        );

        closeModal();

        renderAll();

        await saveData(true);

        return;
    }
}


/* =========================================================
   EXCLUIR VENDA
   ========================================================= */

async function deleteSale(id) {

    if (!isAdmin) return;

    const sale =
        data.sales.find(item => item.id === id);

    if (!sale) return;

    if (!confirm("Deseja realmente excluir esta venda?")) {
        return;
    }

    data.sales =
        data.sales.filter(
            item => item.id !== id
        );

    addActivity(
        `Venda de ${currency(sale.value)} excluída.`
    );

    renderAll();

    await saveData(true);
}


/* =========================================================
   EXCLUIR CLIENTE
   ========================================================= */

async function deleteClient(id) {

    if (!isAdmin) return;

    const client = getClient(id);

    if (!client) return;

    if (
        !confirm(
            `Excluir o cliente "${client.name || client.company}"?`
        )
    ) {
        return;
    }

    data.clients =
        data.clients.filter(
            item => item.id !== id
        );

    addActivity(
        `Cliente ${client.name || client.company} excluído.`
    );

    renderAll();

    await saveData(true);
}


/* =========================================================
   EXCLUIR TAREFA
   ========================================================= */

async function deleteTask(id) {

    if (!isAdmin) return;

    const task =
        data.tasks.find(item => item.id === id);

    if (!task) return;

    if (!confirm(`Excluir a tarefa "${task.title}"?`)) {
        return;
    }

    data.tasks =
        data.tasks.filter(
            item => item.id !== id
        );

    addActivity(
        `Tarefa "${task.title}" excluída.`
    );

    renderAll();

    await saveData(true);
}


/* =========================================================
   CONCLUIR TAREFA
   ========================================================= */

async function toggleTask(id) {

    if (!isAdmin) {
        showToast(
            "Somente o administrador pode alterar tarefas.",
            "error"
        );

        return;
    }

    const task =
        data.tasks.find(item => item.id === id);

    if (!task) return;

    task.completed = !task.completed;

    addActivity(
        task.completed
            ? `Tarefa "${task.title}" concluída.`
            : `Tarefa "${task.title}" reaberta.`
    );

    renderAll();

    await saveData(true);
}


/* =========================================================
   STATUS / LABELS
   ========================================================= */

function saleStatusLabel(status) {

    const labels = {
        pending: "Pendente",
        received: "Recebida",
        cancelled: "Cancelada"
    };

    return labels[status] || status;
}

function clientStatusLabel(status) {

    const labels = {
        lead: "Lead",
        negotiation: "Negociação",
        customer: "Cliente"
    };

    return labels[status] || status;
}

function priorityLabel(priority) {

    const labels = {
        low: "Baixa",
        medium: "Média",
        high: "Alta"
    };

    return labels[priority] || priority;
}


/* =========================================================
   RENDER — VENDAS
   ========================================================= */

function renderSales() {

    const list =
        document.getElementById("salesList");

    if (!list) return;

    const search =
        document.getElementById("salesSearch")?.value
            .toLowerCase()
            .trim() || "";

    const statusFilter =
        document.getElementById("salesStatusFilter")?.value || "all";

    const responsibleFilter =
        document.getElementById("salesResponsibleFilter")?.value || "all";

    let sales = [...data.sales];

    sales = sales.filter(sale => {

        const client = getClient(sale.clientId);

        const clientName =
            client?.name ||
            client?.company ||
            "";

        const matchesSearch =
            !search ||
            clientName.toLowerCase().includes(search) ||
            sale.responsible.toLowerCase().includes(search);

        const matchesStatus =
            statusFilter === "all" ||
            sale.status === statusFilter;

        const matchesResponsible =
            responsibleFilter === "all" ||
            sale.responsible === responsibleFilter;

        return (
            matchesSearch &&
            matchesStatus &&
            matchesResponsible
        );
    });

    if (!sales.length) {

        list.innerHTML = `
            <div class="empty-state">
                <strong>Nenhuma venda encontrada</strong>
                <span>As vendas cadastradas aparecerão aqui.</span>
            </div>
        `;

        return;
    }

    list.innerHTML = sales.map(sale => {

        const client =
            getClient(sale.clientId);

        const clientName =
            client?.name ||
            client?.company ||
            "Cliente";

        return `
            <div class="data-row">

                <div class="row-main">
                    <strong>${escapeHTML(clientName)}</strong>

                    <span>
                        ${formatDate(sale.date)}
                        · ${escapeHTML(sale.responsible)}
                    </span>
                </div>

                <div class="row-value">
                    ${currency(sale.value)}
                </div>

                <div class="row-status">
                    <span class="status-badge ${escapeHTML(sale.status)}">
                        ${escapeHTML(
                            saleStatusLabel(sale.status)
                        )}
                    </span>
                </div>

                ${
                    isAdmin
                        ? `
                            <div class="row-actions">

                                <button
                                    type="button"
                                    data-action="edit-sale"
                                    data-id="${sale.id}"
                                >
                                    Editar
                                </button>

                                <button
                                    type="button"
                                    data-action="delete-sale"
                                    data-id="${sale.id}"
                                >
                                    Excluir
                                </button>

                            </div>
                        `
                        : ""
                }

            </div>
        `;
    }).join("");
}


/* =========================================================
   RENDER — CLIENTES
   ========================================================= */

function renderClients() {

    const list =
        document.getElementById("clientList");

    if (!list) return;

    const search =
        document.getElementById("clientSearch")?.value
            .toLowerCase()
            .trim() || "";

    const statusFilter =
        document.getElementById("clientStatusFilter")?.value || "all";

    let clients =
        [...data.clients];

    clients = clients.filter(client => {

        const matchesSearch =
            !search ||
            client.name.toLowerCase().includes(search) ||
            client.company.toLowerCase().includes(search) ||
            client.phone.toLowerCase().includes(search);

        const matchesStatus =
            statusFilter === "all" ||
            client.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    if (!clients.length) {

        list.innerHTML = `
            <div class="empty-state">
                <strong>Nenhum cliente encontrado</strong>
                <span>Os clientes cadastrados aparecerão aqui.</span>
            </div>
        `;

        return;
    }

    list.innerHTML = clients.map(client => {

        const displayName =
            client.name ||
            client.company ||
            "Cliente";

        return `
            <div class="data-row">

                <div class="row-main">

                    <div class="avatar-small">
                        ${escapeHTML(
                            initials(displayName)
                        )}
                    </div>

                    <div>
                        <strong>
                            ${escapeHTML(displayName)}
                        </strong>

                        <span>
                            ${escapeHTML(
                                client.company || "Sem empresa"
                            )}
                        </span>
                    </div>

                </div>

                <div>
                    <span>
                        ${escapeHTML(client.responsible)}
                    </span>
                </div>

                <div>
                    <span class="status-badge ${escapeHTML(client.status)}">
                        ${escapeHTML(
                            clientStatusLabel(client.status)
                        )}
                    </span>
                </div>

                <div>
                    ${
                        client.potential
                            ? currency(client.potential)
                            : "—"
                    }
                </div>

                <div class="row-actions">

                    ${
                        client.phone
                            ? `
                                <button
                                    type="button"
                                    data-action="whatsapp"
                                    data-phone="${escapeHTML(client.phone)}"
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
                                    data-id="${client.id}"
                                >
                                    Editar
                                </button>

                                <button
                                    type="button"
                                    data-action="delete-client"
                                    data-id="${client.id}"
                                >
                                    Excluir
                                </button>
                            `
                            : ""
                    }

                </div>

            </div>
        `;
    }).join("");
}


/* =========================================================
   RENDER — TAREFAS
   ========================================================= */

function renderTasks() {

    const list =
        document.getElementById("fullTaskList");

    if (!list) return;

    const filter =
        document.querySelector(
            "[data-task-filter].active"
        )?.dataset.taskFilter || "all";

    let tasks =
        [...data.tasks];

    if (filter === "pending") {
        tasks = tasks.filter(
            task => !task.completed
        );
    }

    if (filter === "completed") {
        tasks = tasks.filter(
            task => task.completed
        );
    }

    if (filter === "overdue") {
        tasks = tasks.filter(task =>
            !task.completed &&
            task.dueDate &&
            task.dueDate < today()
        );
    }

    tasks.sort((a, b) => {

        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }

        return String(a.dueDate)
            .localeCompare(String(b.dueDate));
    });

    if (!tasks.length) {

        list.innerHTML = `
            <div class="empty-state">
                <strong>Nenhuma tarefa encontrada</strong>
                <span>As tarefas compartilhadas aparecerão aqui.</span>
            </div>
        `;

        return;
    }

    list.innerHTML = tasks.map(task => {

        const overdue =
            !task.completed &&
            task.dueDate &&
            task.dueDate < today();

        return `
            <div class="task-row ${task.completed ? "completed" : ""}">

                <button
                    type="button"
                    class="task-check"
                    data-action="toggle-task"
                    data-id="${task.id}"
                    ${!isAdmin ? "disabled" : ""}
                    aria-label="Concluir tarefa"
                >
                    ${task.completed ? "✓" : ""}
                </button>

                <div class="task-content">

                    <strong>
                        ${escapeHTML(task.title)}
                    </strong>

                    ${
                        task.description
                            ? `
                                <span>
                                    ${escapeHTML(
                                        task.description
                                    )}
                                </span>
                            `
                            : ""
                    }

                    <div class="task-meta">

                        <span>
                            ${formatDate(task.dueDate)}
                        </span>

                        <span>
                            ${escapeHTML(task.owner)}
                        </span>

                        <span class="priority-${escapeHTML(task.priority)}">
                            ${escapeHTML(
                                priorityLabel(task.priority)
                            )}
                        </span>

                        ${
                            overdue
                                ? `
                                    <span class="overdue">
                                        Atrasada
                                    </span>
                                `
                                : ""
                        }

                    </div>

                </div>

                ${
                    isAdmin
                        ? `
                            <div class="row-actions">

                                <button
                                    type="button"
                                    data-action="edit-task"
                                    data-id="${task.id}"
                                >
                                    Editar
                                </button>

                                <button
                                    type="button"
                                    data-action="delete-task"
                                    data-id="${task.id}"
                                >
                                    Excluir
                                </button>

                            </div>
                        `
                        : ""
                }

            </div>
        `;
    }).join("");
}


/* =========================================================
   RENDER — DASHBOARD
   ========================================================= */

function renderDashboard() {

    const revenue =
        data.sales
            .filter(sale => sale.status !== "cancelled")
            .reduce(
                (sum, sale) =>
                    sum + Number(sale.value || 0),
                0
            );

    const received =
        data.sales
            .filter(sale => sale.status === "received")
            .reduce(
                (sum, sale) =>
                    sum + Number(sale.value || 0),
                0
            );

    const activeTasks =
        data.tasks.filter(
            task => !task.completed
        ).length;

    const completedTasks =
        data.tasks.filter(
            task => task.completed
        ).length;

    const goal =
        Number(data.goals.general || 0);

    const goalPercent =
        goal > 0
            ? Math.min(
                100,
                Math.round(
                    (received / goal) * 100
                )
            )
            : 0;


    const setText = (id, value) => {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    };


    setText(
        "welcomeName",
        isAdmin
            ? "Administrador"
            : "NEXA"
    );

    setText(
        "currentDate",
        new Date().toLocaleDateString(
            "pt-BR",
            {
                weekday: "long",
                day: "numeric",
                month: "long"
            }
        )
    );

    setText(
        "dashboardRevenue",
        currency(revenue)
    );

    setText(
        "dashboardSales",
        data.sales.length
    );

    setText(
        "dashboardClients",
        data.clients.length
    );

    setText(
        "dashboardTasks",
        activeTasks
    );

    setText(
        "dashboardRevenueInfo",
        `${currency(received)} recebidos`
    );

    setText(
        "dashboardSalesInfo",
        `${data.sales.length} vendas cadastradas`
    );

    setText(
        "dashboardTasksInfo",
        `${completedTasks} concluídas`
    );

    setText(
        "dashboardRevenueLarge",
        currency(received)
    );

    setText(
        "dashboardGoalPercent",
        `${goalPercent}%`
    );

    setText(
        "dashboardGoalText",
        goal > 0
            ? `${currency(received)} de ${currency(goal)}`
            : "Nenhuma meta definida"
    );

    const bar =
        document.getElementById("dashboardGoalBar");

    if (bar) {
        bar.style.width =
            `${goalPercent}%`;
    }


    /* =========================
       VENDAS RECENTES
       ========================= */

    const salesList =
        document.getElementById("dashboardSalesList");

    if (salesList) {

        const recent =
            [...data.sales]
                .sort(
                    (a, b) =>
                        String(b.date)
                            .localeCompare(
                                String(a.date)
                            )
                )
                .slice(0, 5);

        if (!recent.length) {

            salesList.innerHTML = `
                <div class="empty-state">
                    <strong>Nenhuma venda ainda</strong>
                    <span>As vendas aparecerão aqui.</span>
                </div>
            `;

        } else {

            salesList.innerHTML =
                recent.map(sale => {

                    const client =
                        getClient(sale.clientId);

                    return `
                        <div class="mini-row">

                            <div>
                                <strong>
                                    ${escapeHTML(
                                        client?.name ||
                                        client?.company ||
                                        "Cliente"
                                    )}
                                </strong>

                                <span>
                                    ${formatDate(sale.date)}
                                </span>
                            </div>

                            <strong>
                                ${currency(sale.value)}
                            </strong>

                        </div>
                    `;

                }).join("");
        }
    }
}


/* =========================================================
   RANKING
   ========================================================= */

function renderRanking() {

    const element =
        document.getElementById("rankingList");

    if (!element) return;

    const ranking = {};

    data.sales.forEach(sale => {

        if (sale.status === "cancelled") return;

        const name =
            sale.responsible ||
            "Administrador";

        ranking[name] =
            (ranking[name] || 0) +
            Number(sale.value || 0);
    });

    const items =
        Object.entries(ranking)
            .sort((a, b) => b[1] - a[1]);

    if (!items.length) {

        element.innerHTML = `
            <div class="empty-state">
                <strong>Sem dados</strong>
                <span>O ranking aparecerá após as primeiras vendas.</span>
            </div>
        `;

        return;
    }

    element.innerHTML =
        items.map(([name, value], index) => `
            <div class="ranking-row">

                <span class="ranking-position">
                    ${index + 1}
                </span>

                <div class="ranking-person">

                    <div class="avatar-small">
                        ${escapeHTML(
                            initials(name)
                        )}
                    </div>

                    <strong>
                        ${escapeHTML(name)}
                    </strong>

                </div>

                <strong>
                    ${currency(value)}
                </strong>

            </div>
        `).join("");
}


/* =========================================================
   ATIVIDADES
   ========================================================= */

function renderActivity() {

    const element =
        document.getElementById("activityList");

    if (!element) return;

    const activities =
        data.activities.slice(0, 8);

    if (!activities.length) {

        element.innerHTML = `
            <div class="empty-state">
                <strong>Nenhuma atividade</strong>
                <span>As ações do sistema aparecerão aqui.</span>
            </div>
        `;

        return;
    }

    element.innerHTML =
        activities.map(activity => `
            <div class="activity-row">

                <div class="activity-dot"></div>

                <div>
                    <strong>
                        ${escapeHTML(activity.text)}
                    </strong>

                    <span>
                        ${escapeHTML(
                            activity.user || "NEXA"
                        )}
                        ·
                        ${formatDate(
                            activity.date?.slice(0, 10)
                        )}
                    </span>
                </div>

            </div>
        `).join("");
}


/* =========================================================
   TAREFAS PRIORITÁRIAS
   ========================================================= */

function renderPriorityTasks() {

    const element =
        document.getElementById("priorityTasks");

    if (!element) return;

    const tasks =
        data.tasks
            .filter(task => !task.completed)
            .sort((a, b) => {

                const priority = {
                    high: 0,
                    medium: 1,
                    low: 2
                };

                return (
                    priority[a.priority] -
                    priority[b.priority]
                );
            })
            .slice(0, 5);

    if (!tasks.length) {

        element.innerHTML = `
            <div class="empty-state">
                <strong>Tudo em dia</strong>
                <span>Nenhuma tarefa pendente.</span>
            </div>
        `;

        return;
    }

    element.innerHTML =
        tasks.map(task => `
            <div class="priority-task">

                <div>
                    <strong>
                        ${escapeHTML(task.title)}
                    </strong>

                    <span>
                        ${formatDate(task.dueDate)}
                    </span>
                </div>

                <span class="priority-${escapeHTML(task.priority)}">
                    ${escapeHTML(
                        priorityLabel(task.priority)
                    )}
                </span>

            </div>
        `).join("");
}


/* =========================================================
   CONTADORES DE CLIENTES
   ========================================================= */

function renderClientStats() {

    const total =
        data.clients.length;

    const leads =
        data.clients.filter(
            client => client.status === "lead"
        ).length;

    const negotiation =
        data.clients.filter(
            client => client.status === "negotiation"
        ).length;

    const customers =
        data.clients.filter(
            client => client.status === "customer"
        ).length;

    const set = (id, value) => {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    };

    set("clientTotal", total);
    set("clientLeads", leads);
    set("clientNegotiation", negotiation);
    set("clientCustomers", customers);
}


/* =========================================================
   CONTADORES DE VENDAS
   ========================================================= */

function renderSalesStats() {

    const validSales =
        data.sales.filter(
            sale => sale.status !== "cancelled"
        );

    const revenue =
        validSales.reduce(
            (sum, sale) =>
                sum + Number(sale.value || 0),
            0
        );

    const received =
        data.sales
            .filter(
                sale => sale.status === "received"
            )
            .reduce(
                (sum, sale) =>
                    sum + Number(sale.value || 0),
                0
            );

    const average =
        validSales.length
            ? revenue / validSales.length
            : 0;

    const set = (id, value) => {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    };

    set(
        "salesRevenue",
        currency(revenue)
    );

    set(
        "salesCount",
        data.sales.length
    );

    set(
        "salesReceived",
        currency(received)
    );

    set(
        "salesAverage",
        currency(average)
    );
}


/* =========================================================
   CONTADORES DE TAREFAS
   ========================================================= */

function renderTaskStats() {

    const total =
        data.tasks.length;

    const pending =
        data.tasks.filter(
            task => !task.completed
        ).length;

    const completed =
        data.tasks.filter(
            task => task.completed
        ).length;

    const overdue =
        data.tasks.filter(
            task =>
                !task.completed &&
                task.dueDate &&
                task.dueDate < today()
        ).length;

    const set = (id, value) => {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    };

    set("taskTotal", total);
    set("taskPending", pending);
    set("taskCompleted", completed);
    set("taskOverdue", overdue);
}


/* =========================================================
   METAS
   ========================================================= */

function renderGoals() {

    const generalGoal =
        document.getElementById("generalGoal");

    if (generalGoal) {

        const goal =
            Number(data.goals.general || 0);

        const revenue =
            data.sales
                .filter(
                    sale => sale.status !== "cancelled"
                )
                .reduce(
                    (sum, sale) =>
                        sum + Number(sale.value || 0),
                    0
                );

        const percent =
            goal > 0
                ? Math.min(
                    100,
                    Math.round(
                        (revenue / goal) * 100
                    )
                )
                : 0;

        generalGoal.innerHTML = `
            <div class="goal-value">
                ${currency(revenue)}
            </div>

            <div class="goal-target">
                Meta: ${currency(goal)}
            </div>

            <div class="goal-progress">
                <div
                    class="goal-progress-bar"
                    style="width:${percent}%"
                ></div>
            </div>

            <div class="goal-percent">
                ${percent}%
            </div>
        `;
    }


    const employeeGoals =
        document.getElementById("employeeGoals");

    if (!employeeGoals) return;

    const employees = getEmployees();

    if (!employees.length) {

        employeeGoals.innerHTML = `
            <div class="empty-state">
                Nenhum funcionário cadastrado.
            </div>
        `;

        return;
    }

    employeeGoals.innerHTML =
        employees.map(employee => {

            const goal =
                Number(
                    data.goals.employees?.[
                        employee.nome
                    ] || 0
                );

            const revenue =
                data.sales
                    .filter(
                        sale =>
                            sale.responsible ===
                            employee.nome &&
                            sale.status !== "cancelled"
                    )
                    .reduce(
                        (sum, sale) =>
                            sum +
                            Number(sale.value || 0),
                        0
                    );

            const percent =
                goal > 0
                    ? Math.min(
                        100,
                        Math.round(
                            (revenue / goal) * 100
                        )
                    )
                    : 0;

            return `
                <div class="employee-goal">

                    <div>
                        <strong>
                            ${escapeHTML(employee.nome)}
                        </strong>

                        <span>
                            ${currency(revenue)}
                            /
                            ${currency(goal)}
                        </span>
                    </div>

                    <div class="goal-progress">
                        <div
                            class="goal-progress-bar"
                            style="width:${percent}%"
                        ></div>
                    </div>

                    <span>
                        ${percent}%
                    </span>

                </div>
            `;

        }).join("");
}


/* =========================================================
   EQUIPE
   ========================================================= */

function renderTeam() {

    const element =
        document.getElementById("teamList");

    if (!element) return;

    element.innerHTML =
        USERS.map(user => {

            const sales =
                data.sales.filter(
                    sale =>
                        sale.responsible ===
                        user.nome
                );

            const revenue =
                sales.reduce(
                    (sum, sale) =>
                        sum +
                        Number(sale.value || 0),
                    0
                );

            return `
                <div class="team-row">

                    <div class="team-person">

                        <div class="avatar-small">
                            ${escapeHTML(user.avatar)}
                        </div>

                        <div>
                            <strong>
                                ${escapeHTML(user.nome)}
                            </strong>

                            <span>
                                ${escapeHTML(user.cargo)}
                            </span>
                        </div>

                    </div>

                    <div>
                        ${sales.length} vendas
                    </div>

                    <div>
                        ${currency(revenue)}
                    </div>

                </div>
            `;

        }).join("");
}


/* =========================================================
   RELATÓRIOS
   ========================================================= */

function renderReports() {

    const revenue =
        data.sales
            .filter(
                sale => sale.status !== "cancelled"
            )
            .reduce(
                (sum, sale) =>
                    sum + Number(sale.value || 0),
                0
            );

    const completed =
        data.tasks.filter(
            task => task.completed
        ).length;

    const average =
        data.sales.length
            ? revenue / data.sales.length
            : 0;

    const values = {
        reportClients: data.clients.length,
        reportSales: data.sales.length,
        reportRevenue: currency(revenue),
        reportTasks: data.tasks.length,
        reportCompleted: completed,
        reportAverage: currency(average)
    };

    Object.entries(values).forEach(
        ([id, value]) => {

            const element =
                document.getElementById(id);

            if (element) {
                element.textContent = value;
            }
        }
    );

    const ranking =
        document.getElementById("reportRanking");

    if (ranking) {

        const totals = {};

        data.sales.forEach(sale => {

            if (sale.status === "cancelled") {
                return;
            }

            totals[sale.responsible] =
                (totals[sale.responsible] || 0) +
                Number(sale.value || 0);
        });

        const items =
            Object.entries(totals)
                .sort((a, b) => b[1] - a[1]);

        ranking.innerHTML =
            items.length
                ? items.map(
                    ([name, value], index) => `
                        <div class="report-ranking-row">

                            <span>
                                ${index + 1}
                            </span>

                            <strong>
                                ${escapeHTML(name)}
                            </strong>

                            <strong>
                                ${currency(value)}
                            </strong>

                        </div>
                    `
                ).join("")
                : `
                    <div class="empty-state">
                        Nenhum dado disponível.
                    </div>
                `;
    }
}


/* =========================================================
   NOTIFICAÇÕES
   ========================================================= */

function renderNotifications() {

    const count =
        document.getElementById("notificationCount");

    if (!count) return;

    const unread =
        data.notifications.filter(
            notification =>
                !notification.read
        ).length;

    count.textContent =
        unread > 99
            ? "99+"
            : unread;
}


/* =========================================================
   WHATSAPP
   ========================================================= */

function openWhatsApp(phone) {

    if (!phone) {
        showToast(
            "Telefone não informado.",
            "error"
        );

        return;
    }

    const numbers =
        String(phone).replace(/\D/g, "");

    if (!numbers) {
        showToast(
            "Número inválido.",
            "error"
        );

        return;
    }

    const url =
        `https://wa.me/55${numbers}`;

    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );
}


/* =========================================================
   EXPORTAR
   ========================================================= */

function exportData() {

    if (!isAdmin) {
        showToast(
            "Somente o administrador pode exportar.",
            "error"
        );

        return;
    }

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
                type: "application/json"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        `nexa-management-${today()}.json`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    showToast("Backup exportado.");
}


/* =========================================================
   IMPORTAR
   ========================================================= */

async function importData(file) {

    if (!isAdmin) {
        showToast(
            "Somente o administrador pode importar.",
            "error"
        );

        return;
    }

    if (!file) return;

    try {

        const text =
            await file.text();

        const imported =
            JSON.parse(text);

        data =
            normalizeData(imported);

        data.clients =
            data.clients.map(normalizeClient);

        data.sales =
            data.sales.map(normalizeSale);

        data.tasks =
            data.tasks.map(normalizeTask);

        addActivity(
            "Backup importado."
        );

        renderAll();

        await saveData(true);

    } catch (error) {

        console.error(error);

        showToast(
            "Arquivo JSON inválido.",
            "error"
        );
    }
}


/* =========================================================
   RESETAR BANCO
   ========================================================= */

async function resetData() {

    if (!isAdmin) {
        showToast(
            "Somente o administrador pode resetar.",
            "error"
        );

        return;
    }

    const confirmed =
        confirm(
            "ATENÇÃO!\n\nIsso apagará clientes, vendas, tarefas, atividades e metas.\n\nDeseja continuar?"
        );

    if (!confirmed) return;

    data = defaultData();

    renderAll();

    await saveData(true);
}


/* =========================================================
   DELEGAÇÃO DE EVENTOS
   ========================================================= */

document.addEventListener(
    "click",
    async event => {

        const target =
            event.target.closest("[data-action]");

        if (!target) return;

        const action =
            target.dataset.action;

        const id =
            target.dataset.id;


        /* =========================
           NAVEGAÇÃO
           ========================= */

        if (action === "navigate") {

            navigateTo(
                target.dataset.page
            );

            return;
        }


        /* =========================
           ADMIN
           ========================= */

        if (action === "admin-login") {

            requestAdminAccess();

            return;
        }


        if (action === "logout") {

            exitAdminMode();

            return;
        }


        /* =========================
           NOVA VENDA
           ========================= */

        if (action === "new-sale") {

            openModal("sale");

            return;
        }


        /* =========================
           EDITAR VENDA
           ========================= */

        if (action === "edit-sale") {

            openModal(
                "sale",
                id
            );

            return;
        }


        /* =========================
           EXCLUIR VENDA
           ========================= */

        if (action === "delete-sale") {

            await deleteSale(id);

            return;
        }


        /* =========================
           NOVO CLIENTE
           ========================= */

        if (action === "new-client") {

            openModal("client");

            return;
        }


        /* =========================
           EDITAR CLIENTE
           ========================= */

        if (action === "edit-client") {

            openModal(
                "client",
                id
            );

            return;
        }


        /* =========================
           EXCLUIR CLIENTE
           ========================= */

        if (action === "delete-client") {

            await deleteClient(id);

            return;
        }


        /* =========================
           WHATSAPP
           ========================= */

        if (action === "whatsapp") {

            openWhatsApp(
                target.dataset.phone
            );

            return;
        }


        /* =========================
           NOVA TAREFA
           ========================= */

        if (action === "new-task") {

            openModal("task");

            return;
        }


        /* =========================
           EDITAR TAREFA
           ========================= */

        if (action === "edit-task") {

            openModal(
                "task",
                id
            );

            return;
        }


        /* =========================
           EXCLUIR TAREFA
           ========================= */

        if (action === "delete-task") {

            await deleteTask(id);

            return;
        }


        /* =========================
           CONCLUIR TAREFA
           ========================= */

        if (action === "toggle-task") {

            await toggleTask(id);

            return;
        }


        /* =========================
           META
           ========================= */

        if (action === "edit-general-goal") {

            openModal("goal");

            return;
        }


        /* =========================
           NOTIFICAÇÕES
           ========================= */

        if (action === "notifications") {

            data.notifications =
                data.notifications.map(
                    notification => ({
                        ...notification,
                        read: true
                    })
                );

            renderNotifications();

            if (isAdmin) {
                await saveData();
            }

            return;
        }


        /* =========================
           EXPORTAR
           ========================= */

        if (action === "export") {

            exportData();

            return;
        }


        /* =========================
           RESETAR
           ========================= */

        if (action === "reset") {

            await resetData();

            return;
        }


        /* =========================
           FECHAR MODAL
           ========================= */

        if (
            action === "close-modal" ||
            action === "cancel-modal"
        ) {

            closeModal();

            return;
        }


        /* =========================
           SUBMIT MODAL
           ========================= */

        if (action === "submit-modal") {

            await submitModal();

            return;
        }
    }
);


/* =========================================================
   FORMULÁRIO DO MODAL
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
   FILTROS
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
                importData(file);
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
            .forEach(item => {
                item.classList.remove(
                    "active"
                );
            });

        filter.classList.add("active");

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
   BOTÃO MOBILE
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
   NAVEGAÇÃO SIDEBAR
   ========================================================= */

document.querySelectorAll(
    "[data-page]"
).forEach(element => {

    element.addEventListener(
        "click",
        () => {

            navigateTo(
                element.dataset.page
            );
        }
    );
});


/* =========================================================
   MODAL BUTTONS
   ========================================================= */

const modalClose =
    document.getElementById(
        "modalClose"
    );

const modalCancel =
    document.getElementById(
        "modalCancel"
    );

if (modalClose) {
    modalClose.addEventListener(
        "click",
        closeModal
    );
}

if (modalCancel) {
    modalCancel.addEventListener(
        "click",
        closeModal
    );
}

const modalSubmit =
    document.getElementById(
        "modalSubmit"
    );

if (modalSubmit) {

    modalSubmit.addEventListener(
        "click",
        async () => {

            await submitModal();

        }
    );
}


/* =========================================================
   NOTIFICAÇÕES
   ========================================================= */

const notificationButton =
    document.getElementById(
        "notificationButton"
    );

if (notificationButton) {

    notificationButton.addEventListener(
        "click",
        async () => {

            data.notifications =
                data.notifications.map(
                    item => ({
                        ...item,
                        read: true
                    })
                );

            renderNotifications();

            if (isAdmin) {
                await saveData();
            }

            showToast(
                "Notificações visualizadas."
            );
        }
    );
}


/* =========================================================
   PERFIL — CLIQUE PARA ADMIN
   ========================================================= */

const topAvatar =
    document.getElementById(
        "topAvatar"
    );

if (topAvatar) {

    topAvatar.style.cursor = "pointer";

    topAvatar.addEventListener(
        "click",
        requestAdminAccess
    );
}


/* =========================================================
   SINCRONIZAÇÃO AUTOMÁTICA
   ========================================================= */

function startPolling() {

    if (pollTimer) {
        clearInterval(pollTimer);
    }

    pollTimer =
        setInterval(
            async () => {

                /*
                 * Não buscamos dados enquanto o administrador
                 * está digitando em um modal.
                 */

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

                await loadData(false);

            },
            8000
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

    /*
     * Não existe mais login.
     *
     * O visitante entra como visualização.
     * Se houver token salvo neste navegador,
     * o modo administrador é ativado.
     */

    isAdmin =
        Boolean(adminToken);

    updateProfileUI();

    renderAll();

    await loadData();

    startPolling();
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