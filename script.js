document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       CONFIGURAÇÃO
    ========================================================= */

    const STORAGE_KEY = "nexaAppData_v5";

    const currentUser =
        JSON.parse(sessionStorage.getItem("nexaUsuario") || "null");

    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    const isAdmin =
        currentUser.permissao === "admin" ||
        currentUser.cargo === "Administrador";

    const USERS = [
        {
            id: "admin",
            nome: "Administrador",
            cargo: "Administrador",
            iniciais: "A"
        },
        {
            id: "arthur",
            nome: "Arthur Rodrigues",
            cargo: "Funcionário",
            iniciais: "AR"
        },
        {
            id: "pietro",
            nome: "Pietro de Jesus",
            cargo: "Funcionário",
            iniciais: "PJ"
        }
    ];


    /* =========================================================
       ESTADO PADRÃO
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


    function loadData() {

        try {

            const saved =
                JSON.parse(localStorage.getItem(STORAGE_KEY));

            if (!saved) {
                return defaultData();
            }

            return normalizeData(saved);

        } catch {

            return defaultData();
        }
    }


    function normalizeData(data) {

        const normalized = {
            ...defaultData(),
            ...data
        };

        normalized.clients =
            Array.isArray(data.clients)
                ? data.clients.map(normalizeClient)
                : [];

        normalized.sales =
            Array.isArray(data.sales)
                ? data.sales.map(normalizeSale)
                : [];

        normalized.tasks =
            Array.isArray(data.tasks)
                ? data.tasks
                : [];

        normalized.activities =
            Array.isArray(data.activities)
                ? data.activities
                : [];

        normalized.notifications =
            Array.isArray(data.notifications)
                ? data.notifications
                : [];

        normalized.goals = {
            general: Number(data.goals?.general || 0),
            employees: data.goals?.employees || {}
        };

        return normalized;
    }


    function normalizeClient(client) {

        return {
            id: client.id || uid(),

            name:
                client.name ||
                client.nome ||
                "",

            company:
                client.company ||
                client.empresa ||
                "",

            phone:
                client.phone ||
                client.telefone ||
                "",

            email:
                client.email ||
                "",

            status:
                client.status ||
                "lead",

            responsible:
                client.responsible ||
                client.responsavel ||
                currentUser.nome,

            potentialValue:
                Number(
                    client.potentialValue ||
                    client.valor ||
                    0
                ),

            notes:
                client.notes ||
                "",

            createdAt:
                client.createdAt ||
                new Date().toISOString(),

            updatedAt:
                client.updatedAt ||
                new Date().toISOString()
        };
    }


    function normalizeSale(sale) {

        return {
            id: sale.id || uid(),

            clientId:
                sale.clientId ||
                "",

            clientName:
                sale.clientName ||
                sale.cliente ||
                "",

            value:
                Number(
                    sale.value ||
                    sale.valor ||
                    0
                ),

            date:
                sale.date ||
                new Date().toISOString().slice(0, 10),

            responsible:
                sale.responsible ||
                sale.responsavel ||
                currentUser.nome,

            payment:
                sale.payment ||
                "Não informado",

            status:
                sale.status ||
                "pending",

            notes:
                sale.notes ||
                "",

            createdAt:
                sale.createdAt ||
                new Date().toISOString(),

            updatedAt:
                sale.updatedAt ||
                new Date().toISOString()
        };
    }


    let data = loadData();


    function saveData() {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(data)
        );
    }


    /* =========================================================
       UTILITÁRIOS
    ========================================================= */

    function uid() {

        return (
            Date.now().toString(36) +
            Math.random().toString(36).slice(2, 8)
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

        const words =
            String(name || "?")
                .trim()
                .split(/\s+/);

        if (!words.length) return "?";

        return words
            .slice(0, 2)
            .map(word => word[0])
            .join("")
            .toUpperCase();
    }


    function currency(value) {

        return Number(value || 0).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    }


    function formatDate(date) {

        if (!date) return "—";

        const parts = String(date).split("-");

        if (parts.length !== 3) {
            return date;
        }

        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }


    function today() {

        return new Date()
            .toISOString()
            .slice(0, 10);
    }


    function showToast(message, type = "success") {

        const container =
            document.getElementById("toastContainer");

        const toast =
            document.createElement("div");

        toast.className =
            `toast ${type}`;

        toast.innerHTML = `
            <span>${type === "success" ? "✓" : "!"}</span>
            <span>${escapeHTML(message)}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3200);
    }


    function findUser(name) {

        return USERS.find(
            user => user.nome === name
        );
    }


    function getEmployees() {

        return USERS;
    }


    function getClient(id) {

        return data.clients.find(
            client => client.id === id
        );
    }


    function addActivity(text) {

        data.activities.unshift({
            id: uid(),
            text,
            user: currentUser.nome,
            date: new Date().toISOString()
        });

        data.activities =
            data.activities.slice(0, 30);
    }


    /* =========================================================
       PERFIL
    ========================================================= */

    document.getElementById("topUserName").textContent =
        currentUser.nome || "Usuário";

    document.getElementById("topUserRole").textContent =
        currentUser.cargo || "Usuário";

    document.getElementById("topAvatar").textContent =
        currentUser.iniciais ||
        initials(currentUser.nome);

    document.getElementById("welcomeName").textContent =
        currentUser.nome?.split(" ")[0] ||
        "Usuário";

    document.getElementById("currentDate").textContent =
        new Date().toLocaleDateString(
            "pt-BR",
            {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        );


    /* =========================================================
       PERMISSÕES
    ========================================================= */

    if (!isAdmin) {

        document
            .querySelectorAll(".admin-only")
            .forEach(element => {
                element.style.display = "none";
            });
    }


    /* =========================================================
       NAVEGAÇÃO
    ========================================================= */

    const pages = [
        "dashboard",
        "sales",
        "clients",
        "tasks",
        "goals",
        "team",
        "reports",
        "settings"
    ];


    const pageNames = {
        dashboard: "Dashboard",
        sales: "Vendas",
        clients: "Clientes",
        tasks: "Tarefas",
        goals: "Metas",
        team: "Equipe",
        reports: "Relatórios",
        settings: "Configurações"
    };


    function navigate(page) {

        if (
            !isAdmin &&
            ["team", "reports", "settings"].includes(page)
        ) {
            showToast(
                "Você não possui acesso a esta área.",
                "error"
            );

            return;
        }

        document
            .querySelectorAll(".page")
            .forEach(element => {
                element.classList.remove("active");
            });

        document
            .querySelectorAll(".nav-item")
            .forEach(element => {
                element.classList.remove("active");
            });

        const pageElement =
            document.getElementById(`page-${page}`);

        if (!pageElement) return;

        pageElement.classList.add("active");

        const nav =
            document.querySelector(
                `.nav-item[data-page="${page}"]`
            );

        if (nav) {
            nav.classList.add("active");
        }

        document.getElementById("pageTitle").textContent =
            pageNames[page] || page;

        if (document.body.classList.contains("menu-open")) {
            document.body.classList.remove("menu-open");
        }
    }


    document
        .querySelectorAll("[data-page]")
        .forEach(element => {

            element.addEventListener("click", () => {

                navigate(
                    element.dataset.page
                );

            });

        });


    document
        .getElementById("mobileMenu")
        .addEventListener("click", () => {

            document.body.classList.toggle("menu-open");

        });


    /* =========================================================
       MODAL
    ========================================================= */

    const modalOverlay =
        document.getElementById("modalOverlay");

    const modalTitle =
        document.getElementById("modalTitle");

    const modalEyebrow =
        document.getElementById("modalEyebrow");

    const modalBody =
        document.getElementById("modalBody");

    const modalForm =
        document.getElementById("modalForm");

    const modalSubmit =
        document.getElementById("modalSubmit");


    let modalState = {
        type: null,
        id: null
    };


    function openModal() {

        modalOverlay.classList.add("active");
    }


    function closeModal() {

        modalOverlay.classList.remove("active");

        modalBody.innerHTML = "";

        modalState = {
            type: null,
            id: null
        };
    }


    document
        .getElementById("modalClose")
        .addEventListener("click", closeModal);

    document
        .getElementById("modalCancel")
        .addEventListener("click", closeModal);


    modalOverlay.addEventListener("click", event => {

        if (event.target === modalOverlay) {
            closeModal();
        }

    });


    /* =========================================================
       VENDA — PRINCIPAL CORREÇÃO
    ========================================================= */

    function openSaleModal(saleId = null) {

        if (!isAdmin) {

            showToast(
                "Somente o administrador pode registrar vendas.",
                "error"
            );

            return;
        }

        const sale =
            data.sales.find(
                item => item.id === saleId
            );

        modalState = {
            type: "sale",
            id: saleId
        };

        modalEyebrow.textContent =
            sale ? "EDITAR VENDA" : "COMERCIAL";

        modalTitle.textContent =
            sale ? "Editar venda" : "Registrar venda";

        modalSubmit.textContent =
            sale ? "Salvar alterações" : "Registrar venda";


        const clientOptions =
            data.clients
                .map(client => `
                    <option
                        value="${escapeHTML(client.id)}"
                        ${sale?.clientId === client.id ? "selected" : ""}
                    >
                        ${escapeHTML(client.name)}
                        ${client.company ? ` — ${escapeHTML(client.company)}` : ""}
                    </option>
                `)
                .join("");


        /*
            IMPORTANTE:
            AQUI O ADMINISTRADOR TAMBÉM É RESPONSÁVEL.
            Não filtramos apenas funcionários.
        */

        const responsibleOptions =
            getEmployees()
                .map(user => `
                    <option
                        value="${escapeHTML(user.nome)}"
                        ${
                            (
                                sale?.responsible ||
                                currentUser.nome
                            ) === user.nome
                                ? "selected"
                                : ""
                        }
                    >
                        ${escapeHTML(user.nome)}
                        — ${escapeHTML(user.cargo)}
                    </option>
                `)
                .join("");


        modalBody.innerHTML = `

            <div class="form-grid">

                <div class="form-field full">

                    <label>Cliente *</label>

                    <select
                        id="saleClient"
                        required
                    >

                        <option value="">
                            Selecione o cliente
                        </option>

                        ${clientOptions}

                    </select>

                    ${
                        data.clients.length === 0
                            ? `
                                <small style="
                                    color:#f59e0b;
                                    font-size:9px;
                                    margin-top:4px;
                                ">
                                    Nenhum cliente cadastrado.
                                    Você pode cadastrar um cliente primeiro.
                                </small>
                              `
                            : ""
                    }

                </div>


                <div class="form-field">

                    <label>Valor da venda *</label>

                    <input
                        id="saleValue"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0,00"
                        value="${sale?.value || ""}"
                        required
                    >

                </div>


                <div class="form-field">

                    <label>Data da venda *</label>

                    <input
                        id="saleDate"
                        type="date"
                        value="${sale?.date || today()}"
                        required
                    >

                </div>


                <div class="form-field">

                    <label>Responsável pela venda *</label>

                    <select
                        id="saleResponsible"
                        required
                    >

                        ${responsibleOptions}

                    </select>

                </div>


                <div class="form-field">

                    <label>Status *</label>

                    <select
                        id="saleStatus"
                        required
                    >

                        <option
                            value="pending"
                            ${sale?.status === "pending" || !sale ? "selected" : ""}
                        >
                            Pendente
                        </option>

                        <option
                            value="received"
                            ${sale?.status === "received" ? "selected" : ""}
                        >
                            Recebida
                        </option>

                        <option
                            value="cancelled"
                            ${sale?.status === "cancelled" ? "selected" : ""}
                        >
                            Cancelada
                        </option>

                    </select>

                </div>


                <div class="form-field full">

                    <label>Forma de pagamento</label>

                    <select id="salePayment">

                        <option
                            ${sale?.payment === "Pix" ? "selected" : ""}
                        >
                            Pix
                        </option>

                        <option
                            ${sale?.payment === "Cartão" ? "selected" : ""}
                        >
                            Cartão
                        </option>

                        <option
                            ${sale?.payment === "Dinheiro" ? "selected" : ""}
                        >
                            Dinheiro
                        </option>

                        <option
                            ${sale?.payment === "Transferência" ? "selected" : ""}
                        >
                            Transferência
                        </option>

                        <option
                            ${sale?.payment === "Boleto" ? "selected" : ""}
                        >
                            Boleto
                        </option>

                        <option
                            ${sale?.payment === "Não informado" || !sale ? "selected" : ""}
                        >
                            Não informado
                        </option>

                    </select>

                </div>


                <div class="form-field full">

                    <label>Observação</label>

                    <textarea
                        id="saleNotes"
                        placeholder="Informações adicionais sobre a venda..."
                    >${escapeHTML(sale?.notes || "")}</textarea>

                </div>

            </div>
        `;

        openModal();
    }


    function saveSale() {

        const clientId =
            document.getElementById("saleClient").value;

        const value =
            Number(
                document.getElementById("saleValue").value
            );

        const date =
            document.getElementById("saleDate").value;

        const responsible =
            document.getElementById("saleResponsible").value;

        const status =
            document.getElementById("saleStatus").value;

        const payment =
            document.getElementById("salePayment").value;

        const notes =
            document.getElementById("saleNotes").value.trim();


        if (!clientId) {

            showToast(
                "Selecione um cliente.",
                "error"
            );

            return;
        }


        if (!value || value <= 0) {

            showToast(
                "Informe um valor válido para a venda.",
                "error"
            );

            return;
        }


        if (!responsible) {

            showToast(
                "Selecione o responsável pela venda.",
                "error"
            );

            return;
        }


        const client =
            getClient(clientId);


        if (!client) {

            showToast(
                "Cliente não encontrado.",
                "error"
            );

            return;
        }


        if (modalState.id) {

            const sale =
                data.sales.find(
                    item => item.id === modalState.id
                );

            if (!sale) return;

            sale.clientId = clientId;
            sale.clientName = client.name;
            sale.value = value;
            sale.date = date;
            sale.responsible = responsible;
            sale.status = status;
            sale.payment = payment;
            sale.notes = notes;
            sale.updatedAt = new Date().toISOString();

            addActivity(
                `Venda de ${currency(value)} atualizada para ${client.name}.`
            );

            showToast("Venda atualizada.");

        } else {

            const sale = {

                id: uid(),

                clientId,

                clientName: client.name,

                value,

                date,

                responsible,

                payment,

                status,

                notes,

                createdAt:
                    new Date().toISOString(),

                updatedAt:
                    new Date().toISOString()
            };


            data.sales.unshift(sale);


            addActivity(
                `Nova venda de ${currency(value)} registrada para ${client.name}.`
            );


            showToast(
                "Venda registrada com sucesso."
            );
        }


        saveData();

        closeModal();

        renderAll();
    }


    /* =========================================================
       CLIENTES
    ========================================================= */

    function openClientModal(clientId = null) {

        if (!isAdmin) {

            showToast(
                "Somente o administrador pode cadastrar clientes.",
                "error"
            );

            return;
        }


        const client =
            data.clients.find(
                item => item.id === clientId
            );


        modalState = {
            type: "client",
            id: clientId
        };


        modalEyebrow.textContent =
            client ? "EDITAR CLIENTE" : "CRM";

        modalTitle.textContent =
            client ? "Editar cliente" : "Novo cliente";

        modalSubmit.textContent =
            client ? "Salvar alterações" : "Cadastrar cliente";


        const responsibleOptions =
            getEmployees()
                .map(user => `
                    <option
                        value="${escapeHTML(user.nome)}"
                        ${
                            (
                                client?.responsible ||
                                currentUser.nome
                            ) === user.nome
                                ? "selected"
                                : ""
                        }
                    >
                        ${escapeHTML(user.nome)}
                    </option>
                `)
                .join("");


        modalBody.innerHTML = `

            <div class="form-grid">

                <div class="form-field">

                    <label>Nome *</label>

                    <input
                        id="clientName"
                        value="${escapeHTML(client?.name || "")}"
                        placeholder="Nome do cliente"
                        required
                    >

                </div>


                <div class="form-field">

                    <label>Empresa</label>

                    <input
                        id="clientCompany"
                        value="${escapeHTML(client?.company || "")}"
                        placeholder="Empresa"
                    >

                </div>


                <div class="form-field">

                    <label>Telefone</label>

                    <input
                        id="clientPhone"
                        value="${escapeHTML(client?.phone || "")}"
                        placeholder="(61) 99999-9999"
                    >

                </div>


                <div class="form-field">

                    <label>E-mail</label>

                    <input
                        id="clientEmail"
                        type="email"
                        value="${escapeHTML(client?.email || "")}"
                        placeholder="cliente@email.com"
                    >

                </div>


                <div class="form-field">

                    <label>Status</label>

                    <select id="clientStatus">

                        <option
                            value="lead"
                            ${client?.status === "lead" || !client ? "selected" : ""}
                        >
                            Lead
                        </option>

                        <option
                            value="contact"
                            ${client?.status === "contact" ? "selected" : ""}
                        >
                            Contato
                        </option>

                        <option
                            value="negotiation"
                            ${client?.status === "negotiation" ? "selected" : ""}
                        >
                            Negociação
                        </option>

                        <option
                            value="customer"
                            ${client?.status === "customer" ? "selected" : ""}
                        >
                            Cliente
                        </option>

                        <option
                            value="inactive"
                            ${client?.status === "inactive" ? "selected" : ""}
                        >
                            Inativo
                        </option>

                    </select>

                </div>


                <div class="form-field">

                    <label>Responsável</label>

                    <select id="clientResponsible">

                        ${responsibleOptions}

                    </select>

                </div>


                <div class="form-field">

                    <label>Valor potencial</label>

                    <input
                        id="clientPotential"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${client?.potentialValue || ""}"
                        placeholder="0,00"
                    >

                </div>


                <div class="form-field full">

                    <label>Observações</label>

                    <textarea
                        id="clientNotes"
                        placeholder="Anotações sobre o cliente..."
                    >${escapeHTML(client?.notes || "")}</textarea>

                </div>

            </div>
        `;

        openModal();
    }


    function saveClient() {

        const name =
            document.getElementById("clientName")
                .value.trim();

        const company =
            document.getElementById("clientCompany")
                .value.trim();

        const phone =
            document.getElementById("clientPhone")
                .value.trim();

        const email =
            document.getElementById("clientEmail")
                .value.trim();

        const status =
            document.getElementById("clientStatus")
                .value;

        const responsible =
            document.getElementById("clientResponsible")
                .value;

        const potentialValue =
            Number(
                document.getElementById("clientPotential")
                    .value || 0
            );

        const notes =
            document.getElementById("clientNotes")
                .value.trim();


        if (!name) {

            showToast(
                "Informe o nome do cliente.",
                "error"
            );

            return;
        }


        if (modalState.id) {

            const client =
                getClient(modalState.id);

            if (!client) return;

            client.name = name;
            client.company = company;
            client.phone = phone;
            client.email = email;
            client.status = status;
            client.responsible = responsible;
            client.potentialValue = potentialValue;
            client.notes = notes;
            client.updatedAt =
                new Date().toISOString();

            addActivity(
                `Cliente ${name} atualizado.`
            );

            showToast(
                "Cliente atualizado."
            );

        } else {

            data.clients.unshift({

                id: uid(),

                name,

                company,

                phone,

                email,

                status,

                responsible,

                potentialValue,

                notes,

                createdAt:
                    new Date().toISOString(),

                updatedAt:
                    new Date().toISOString()

            });

            addActivity(
                `Novo cliente ${name} cadastrado.`
            );

            showToast(
                "Cliente cadastrado."
            );
        }


        saveData();

        closeModal();

        renderAll();
    }


    function deleteClient(id) {

        if (!isAdmin) return;

        const client =
            getClient(id);

        if (!client) return;


        const hasSales =
            data.sales.some(
                sale => sale.clientId === id
            );


        if (hasSales) {

            const confirmDelete =
                confirm(
                    "Este cliente possui vendas vinculadas. Deseja realmente excluir?"
                );

            if (!confirmDelete) return;

        } else {

            if (
                !confirm(
                    `Excluir o cliente ${client.name}?`
                )
            ) {
                return;
            }
        }


        data.clients =
            data.clients.filter(
                item => item.id !== id
            );


        addActivity(
            `Cliente ${client.name} excluído.`
        );

        saveData();

        renderAll();

        showToast(
            "Cliente excluído."
        );
    }


    function openWhatsApp(phone) {

        const numbers =
            String(phone || "")
                .replace(/\D/g, "");

        if (!numbers) {

            showToast(
                "Este cliente não possui telefone.",
                "error"
            );

            return;
        }

        window.open(
            `https://wa.me/55${numbers}`,
            "_blank"
        );
    }


    /* =========================================================
       TAREFAS
    ========================================================= */

    function openTaskModal(taskId = null) {

        if (!isAdmin) {

            showToast(
                "Somente o administrador pode criar tarefas.",
                "error"
            );

            return;
        }


        const task =
            data.tasks.find(
                item => item.id === taskId
            );


        modalState = {
            type: "task",
            id: taskId
        };


        modalEyebrow.textContent =
            task ? "EDITAR TAREFA" : "OPERAÇÃO";

        modalTitle.textContent =
            task ? "Editar tarefa" : "Nova tarefa";

        modalSubmit.textContent =
            task ? "Salvar alterações" : "Criar tarefa";


        const ownerOptions =
            getEmployees()
                .map(user => `
                    <option
                        value="${escapeHTML(user.nome)}"
                        ${
                            (
                                task?.owner ||
                                ""
                            ) === user.nome
                                ? "selected"
                                : ""
                        }
                    >
                        ${escapeHTML(user.nome)}
                    </option>
                `)
                .join("");


        modalBody.innerHTML = `

            <div class="form-grid">

                <div class="form-field full">

                    <label>Título *</label>

                    <input
                        id="taskTitle"
                        value="${escapeHTML(task?.title || "")}"
                        placeholder="Ex: Entrar em contato com cliente"
                        required
                    >

                </div>


                <div class="form-field full">

                    <label>Descrição</label>

                    <textarea
                        id="taskDescription"
                        placeholder="Detalhes da tarefa..."
                    >${escapeHTML(task?.description || "")}</textarea>

                </div>


                <div class="form-field">

                    <label>Prazo</label>

                    <input
                        id="taskDueDate"
                        type="date"
                        value="${task?.dueDate || today()}"
                    >

                </div>


                <div class="form-field">

                    <label>Prioridade</label>

                    <select id="taskPriority">

                        <option
                            value="low"
                            ${task?.priority === "low" ? "selected" : ""}
                        >
                            Baixa
                        </option>

                        <option
                            value="medium"
                            ${task?.priority === "medium" || !task ? "selected" : ""}
                        >
                            Média
                        </option>

                        <option
                            value="high"
                            ${task?.priority === "high" ? "selected" : ""}
                        >
                            Alta
                        </option>

                        <option
                            value="urgent"
                            ${task?.priority === "urgent" ? "selected" : ""}
                        >
                            Urgente
                        </option>

                    </select>

                </div>


                <div class="form-field full">

                    <label>Responsável *</label>

                    <select id="taskOwner" required>

                        <option value="">
                            Selecione
                        </option>

                        ${ownerOptions}

                    </select>

                </div>

            </div>
        `;

        openModal();
    }


    function saveTask() {

        const title =
            document.getElementById("taskTitle")
                .value.trim();

        const description =
            document.getElementById("taskDescription")
                .value.trim();

        const dueDate =
            document.getElementById("taskDueDate")
                .value;

        const priority =
            document.getElementById("taskPriority")
                .value;

        const owner =
            document.getElementById("taskOwner")
                .value;


        if (!title) {

            showToast(
                "Informe o título da tarefa.",
                "error"
            );

            return;
        }


        if (!owner) {

            showToast(
                "Selecione um responsável.",
                "error"
            );

            return;
        }


        if (modalState.id) {

            const task =
                data.tasks.find(
                    item => item.id === modalState.id
                );

            if (!task) return;

            task.title = title;
            task.description = description;
            task.dueDate = dueDate;
            task.priority = priority;
            task.owner = owner;
            task.updatedAt =
                new Date().toISOString();

            addActivity(
                `Tarefa "${title}" atualizada.`
            );

            showToast(
                "Tarefa atualizada."
            );

        } else {

            data.tasks.unshift({

                id: uid(),

                title,

                description,

                dueDate,

                priority,

                owner,

                completed: false,

                createdAt:
                    new Date().toISOString(),

                updatedAt:
                    new Date().toISOString()

            });

            addActivity(
                `Nova tarefa "${title}" criada para ${owner}.`
            );

            showToast(
                "Tarefa criada."
            );
        }


        saveData();

        closeModal();

        renderAll();
    }


    function toggleTask(id) {

        if (!isAdmin) {

            showToast(
                "Somente o administrador pode concluir tarefas.",
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

        task.updatedAt =
            new Date().toISOString();


        addActivity(
            task.completed
                ? `Tarefa "${task.title}" concluída.`
                : `Tarefa "${task.title}" reaberta.`
        );


        saveData();

        renderAll();
    }


    function deleteTask(id) {

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


        saveData();

        renderAll();

        showToast(
            "Tarefa excluída."
        );
    }


    function isTaskOverdue(task) {

        if (
            task.completed ||
            !task.dueDate
        ) {
            return false;
        }

        return task.dueDate < today();
    }


    let taskFilter = "all";


    document
        .querySelectorAll("[data-task-filter]")
        .forEach(button => {

            button.addEventListener("click", () => {

                taskFilter =
                    button.dataset.taskFilter;

                document
                    .querySelectorAll("[data-task-filter]")
                    .forEach(item => {
                        item.classList.remove("active");
                    });

                button.classList.add("active");

                renderTasks();
            });

        });


    /* =========================================================
       METAS
    ========================================================= */

    function openGoalModal() {

        if (!isAdmin) return;


        modalState = {
            type: "goal",
            id: null
        };


        modalEyebrow.textContent =
            "PERFORMANCE";

        modalTitle.textContent =
            "Editar meta geral";

        modalSubmit.textContent =
            "Salvar meta";


        modalBody.innerHTML = `

            <div class="form-grid">

                <div class="form-field full">

                    <label>Meta de faturamento</label>

                    <input
                        id="generalGoalInput"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${data.goals.general || ""}"
                        placeholder="Ex: 5000"
                        required
                    >

                </div>

            </div>
        `;


        openModal();
    }


    function saveGoal() {

        const value =
            Number(
                document.getElementById("generalGoalInput")
                    .value || 0
            );


        data.goals.general = value;


        addActivity(
            `Meta geral definida em ${currency(value)}.`
        );


        saveData();

        closeModal();

        renderAll();

        showToast(
            "Meta atualizada."
        );
    }


    /* =========================================================
       FORMULÁRIO PRINCIPAL DO MODAL
    ========================================================= */

    modalForm.addEventListener("submit", event => {

        event.preventDefault();

        if (modalState.type === "sale") {
            saveSale();
            return;
        }

        if (modalState.type === "client") {
            saveClient();
            return;
        }

        if (modalState.type === "task") {
            saveTask();
            return;
        }

        if (modalState.type === "goal") {
            saveGoal();
            return;
        }

    });


    /* =========================================================
       RENDER — VENDAS
    ========================================================= */

    function renderSales() {

        const allSales =
            data.sales;

        const total =
            allSales.reduce(
                (sum, sale) =>
                    sum + (
                        sale.status === "cancelled"
                            ? 0
                            : Number(sale.value)
                    ),
                0
            );

        const received =
            allSales.filter(
                sale => sale.status === "received"
            ).length;

        const average =
            allSales.length
                ? total / allSales.filter(
                    sale => sale.status !== "cancelled"
                ).length || 0
                : 0;


        document.getElementById("salesRevenue")
            .textContent = currency(total);

        document.getElementById("salesCount")
            .textContent = allSales.length;

        document.getElementById("salesReceived")
            .textContent = received;

        document.getElementById("salesAverage")
            .textContent = currency(average);


        const responsibleFilter =
            document.getElementById(
                "salesResponsibleFilter"
            );


        const currentResponsible =
            responsibleFilter.value;


        responsibleFilter.innerHTML = `
            <option value="all">
                Todos os responsáveis
            </option>

            ${getEmployees().map(user => `
                <option
                    value="${escapeHTML(user.nome)}"
                    ${
                        currentResponsible === user.nome
                            ? "selected"
                            : ""
                    }
                >
                    ${escapeHTML(user.nome)}
                </option>
            `).join("")}
        `;


        const search =
            document.getElementById("salesSearch")
                .value
                .toLowerCase()
                .trim();


        const status =
            document.getElementById("salesStatusFilter")
                .value;


        const responsible =
            responsibleFilter.value;


        let sales =
            [...allSales];


        if (search) {

            sales =
                sales.filter(sale =>
                    sale.clientName
                        .toLowerCase()
                        .includes(search)
                );
        }


        if (status !== "all") {

            sales =
                sales.filter(
                    sale =>
                        sale.status === status
                );
        }


        if (responsible !== "all") {

            sales =
                sales.filter(
                    sale =>
                        sale.responsible === responsible
                );
        }


        sales.sort(
            (a, b) =>
                new Date(b.createdAt) -
                new Date(a.createdAt)
        );


        const container =
            document.getElementById("salesList");


        if (!sales.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <strong>Nenhuma venda encontrada</strong>
                    ${
                        allSales.length
                            ? "Tente alterar os filtros."
                            : "Registre sua primeira venda para começar."
                    }
                </div>
            `;

            return;
        }


        container.innerHTML =
            sales.map(sale => {

                const statusLabel = {

                    pending: "Pendente",
                    received: "Recebida",
                    cancelled: "Cancelada"

                }[sale.status] || sale.status;


                return `

                    <div class="sale-card">

                        <div class="sale-client">

                            <div class="sale-avatar">
                                ${initials(sale.clientName)}
                            </div>

                            <div>

                                <strong>
                                    ${escapeHTML(sale.clientName)}
                                </strong>

                                <small>
                                    Responsável:
                                    ${escapeHTML(sale.responsible)}
                                </small>

                            </div>

                        </div>


                        <div class="sale-meta">

                            <strong>
                                ${formatDate(sale.date)}
                            </strong>

                            ${escapeHTML(sale.payment)}

                        </div>


                        <div>

                            <div class="sale-value">
                                ${currency(sale.value)}
                            </div>

                            <span class="status ${sale.status}">
                                ${statusLabel}
                            </span>

                        </div>


                        ${
                            isAdmin
                                ? `
                                    <div class="sale-actions">

                                        <button
                                            class="icon-button"
                                            data-action="edit-sale"
                                            data-id="${sale.id}"
                                            title="Editar"
                                        >
                                            ✎
                                        </button>

                                        <button
                                            class="icon-button delete"
                                            data-action="delete-sale"
                                            data-id="${sale.id}"
                                            title="Excluir"
                                        >
                                            ×
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

        const search =
            document.getElementById("clientSearch")
                .value
                .toLowerCase()
                .trim();


        const statusFilter =
            document.getElementById("clientStatusFilter")
                .value;


        let clients =
            [...data.clients];


        if (search) {

            clients =
                clients.filter(client => {

                    return (

                        client.name
                            .toLowerCase()
                            .includes(search)

                        ||

                        client.company
                            .toLowerCase()
                            .includes(search)

                        ||

                        client.phone
                            .toLowerCase()
                            .includes(search)

                    );

                });
        }


        if (statusFilter !== "all") {

            clients =
                clients.filter(
                    client =>
                        client.status === statusFilter
                );
        }


        document.getElementById("clientTotal")
            .textContent =
                data.clients.length;


        document.getElementById("clientLeads")
            .textContent =
                data.clients.filter(
                    c => c.status === "lead"
                ).length;


        document.getElementById("clientNegotiation")
            .textContent =
                data.clients.filter(
                    c => c.status === "negotiation"
                ).length;


        document.getElementById("clientCustomers")
            .textContent =
                data.clients.filter(
                    c => c.status === "customer"
                ).length;


        const container =
            document.getElementById("clientList");


        if (!clients.length) {

            container.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1">
                    <strong>
                        ${data.clients.length
                            ? "Nenhum cliente encontrado"
                            : "Sua base de clientes está vazia"}
                    </strong>

                    <span>
                        ${
                            data.clients.length
                                ? "Altere sua busca ou filtro."
                                : "Cadastre o primeiro cliente para começar."
                        }
                    </span>
                </div>
            `;

            return;
        }


        const statusLabel = {

            lead: "Lead",
            contact: "Contato",
            negotiation: "Negociação",
            customer: "Cliente",
            inactive: "Inativo"

        };


        container.innerHTML =
            clients.map(client => `

                <article class="client-card">

                    <div class="client-card-top">

                        <div class="client-avatar">
                            ${initials(client.name)}
                        </div>

                        <span class="status ${
                            client.status === "customer"
                                ? "received"
                                : client.status === "inactive"
                                    ? "cancelled"
                                    : "pending"
                        }">
                            ${statusLabel[client.status] || "Lead"}
                        </span>

                    </div>


                    <h3>
                        ${escapeHTML(client.name)}
                    </h3>

                    <div class="client-company">
                        ${escapeHTML(client.company || "Sem empresa")}
                    </div>


                    <div class="client-info">

                        <div>
                            <span>Telefone</span>
                            <strong>
                                ${escapeHTML(client.phone || "—")}
                            </strong>
                        </div>

                        <div>
                            <span>Responsável</span>
                            <strong>
                                ${escapeHTML(client.responsible || "—")}
                            </strong>
                        </div>

                        <div>
                            <span>Potencial</span>
                            <strong>
                                ${currency(client.potentialValue)}
                            </strong>
                        </div>

                    </div>


                    <div class="client-card-footer">

                        <small style="
                            color:#5e6070;
                            font-size:8px;
                        ">
                            ${formatDate(
                                client.createdAt?.slice(0,10)
                            )}
                        </small>


                        <div class="client-card-actions">

                            ${
                                client.phone
                                    ? `
                                        <button
                                            class="icon-button"
                                            data-action="whatsapp"
                                            data-phone="${escapeHTML(client.phone)}"
                                            title="WhatsApp"
                                        >
                                            W
                                        </button>
                                      `
                                    : ""
                            }


                            ${
                                isAdmin
                                    ? `
                                        <button
                                            class="icon-button"
                                            data-action="edit-client"
                                            data-id="${client.id}"
                                            title="Editar"
                                        >
                                            ✎
                                        </button>

                                        <button
                                            class="icon-button delete"
                                            data-action="delete-client"
                                            data-id="${client.id}"
                                            title="Excluir"
                                        >
                                            ×
                                        </button>
                                      `
                                    : ""
                            }

                        </div>

                    </div>

                </article>

            `).join("");
    }


    /* =========================================================
       RENDER — TAREFAS
    ========================================================= */

    function renderTasks() {

        const total =
            data.tasks.length;

        const completed =
            data.tasks.filter(
                task => task.completed
            ).length;

        const pending =
            total - completed;

        const overdue =
            data.tasks.filter(
                task => isTaskOverdue(task)
            ).length;


        document.getElementById("taskTotal")
            .textContent = total;

        document.getElementById("taskPending")
            .textContent = pending;

        document.getElementById("taskCompleted")
            .textContent = completed;

        document.getElementById("taskOverdue")
            .textContent = overdue;


        let tasks =
            [...data.tasks];


        /*
            Funcionários veem somente as tarefas deles.
            Administrador vê todas.
        */

        if (!isAdmin) {

            tasks =
                tasks.filter(
                    task =>
                        task.owner === currentUser.nome
                );
        }


        if (taskFilter === "pending") {

            tasks =
                tasks.filter(
                    task => !task.completed
                );
        }

        if (taskFilter === "completed") {

            tasks =
                tasks.filter(
                    task => task.completed
                );
        }

        if (taskFilter === "overdue") {

            tasks =
                tasks.filter(
                    task => isTaskOverdue(task)
                );
        }


        tasks.sort((a, b) => {

            if (
                a.completed !==
                b.completed
            ) {
                return a.completed ? 1 : -1;
            }

            return String(a.dueDate || "")
                .localeCompare(
                    String(b.dueDate || "")
                );
        });


        const container =
            document.getElementById("fullTaskList");


        if (!tasks.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <strong>Nenhuma tarefa encontrada</strong>
                    <span>Não há atividades nesta categoria.</span>
                </div>
            `;

            return;
        }


        const priorityLabel = {

            low: "Baixa",
            medium: "Média",
            high: "Alta",
            urgent: "Urgente"

        };


        container.innerHTML =
            tasks.map(task => `

                <div class="
                    task-card
                    ${task.completed ? "completed" : ""}
                ">

                    <button
                        class="task-check"
                        data-action="toggle-task"
                        data-id="${task.id}"
                        title="${
                            isAdmin
                                ? "Concluir tarefa"
                                : "Apenas administrador"
                        }"
                    >
                        ${task.completed ? "✓" : ""}
                    </button>


                    <div class="task-main">

                        <strong>
                            ${escapeHTML(task.title)}
                        </strong>

                        <p>
                            ${escapeHTML(
                                task.description ||
                                "Sem descrição"
                            )}
                        </p>

                    </div>


                    <div class="task-meta">

                        <span>
                            ${escapeHTML(task.owner || "Sem responsável")}
                        </span>

                        <span class="
                            priority
                            ${task.priority || "medium"}
                        ">
                            ${priorityLabel[task.priority] || "Média"}
                        </span>

                        <span class="
                            ${isTaskOverdue(task) ? "overdue" : ""}
                        ">
                            ${formatDate(task.dueDate)}
                        </span>

                    </div>


                    ${
                        isAdmin
                            ? `
                                <div class="sale-actions">

                                    <button
                                        class="icon-button"
                                        data-action="edit-task"
                                        data-id="${task.id}"
                                    >
                                        ✎
                                    </button>

                                    <button
                                        class="icon-button delete"
                                        data-action="delete-task"
                                        data-id="${task.id}"
                                    >
                                        ×
                                    </button>

                                </div>
                              `
                            : ""
                    }

                </div>

            `).join("");
    }


    /* =========================================================
       RENDER — DASHBOARD
    ========================================================= */

    function renderDashboard() {

        const validSales =
            data.sales.filter(
                sale =>
                    sale.status !== "cancelled"
            );


        const revenue =
            validSales.reduce(
                (sum, sale) =>
                    sum + Number(sale.value || 0),
                0
            );


        const completed =
            data.tasks.filter(
                task => task.completed
            ).length;


        document.getElementById(
            "dashboardRevenue"
        ).textContent =
            currency(revenue);


        document.getElementById(
            "dashboardRevenueLarge"
        ).textContent =
            currency(revenue);


        document.getElementById(
            "dashboardSales"
        ).textContent =
            data.sales.length;


        document.getElementById(
            "dashboardClients"
        ).textContent =
            data.clients.length;


        document.getElementById(
            "dashboardTasks"
        ).textContent =
            data.tasks.length;


        document.getElementById(
            "dashboardTasksInfo"
        ).textContent =
            `${completed} concluídas`;


        document.getElementById(
            "dashboardRevenueInfo"
        ).textContent =
            validSales.length
                ? `${validSales.length} venda(s) válida(s)`
                : "Nenhuma venda registrada";


        document.getElementById(
            "dashboardSalesInfo"
        ).textContent =
            data.sales.length
                ? `${data.sales.filter(s => s.status === "received").length} recebida(s)`
                : "Nenhuma venda registrada";


        const goal =
            Number(data.goals.general || 0);


        const percentage =
            goal > 0
                ? Math.min(
                    100,
                    Math.round(
                        (revenue / goal) * 100
                    )
                )
                : 0;


        document.getElementById(
            "dashboardGoalPercent"
        ).textContent =
            `${percentage}%`;


        document.getElementById(
            "dashboardGoalBar"
        ).style.width =
            `${percentage}%`;


        document.getElementById(
            "dashboardGoalText"
        ).textContent =
            goal > 0
                ? `${currency(revenue)} de ${currency(goal)}`
                : "Nenhuma meta definida";


        const recentSales =
            [...data.sales]
                .sort(
                    (a, b) =>
                        new Date(b.createdAt) -
                        new Date(a.createdAt)
                )
                .slice(0, 5);


        const salesList =
            document.getElementById(
                "dashboardSalesList"
            );


        if (!recentSales.length) {

            salesList.innerHTML = `
                <div class="empty-state">
                    <strong>Sem vendas ainda</strong>
                    <span>Registre uma venda para acompanhar o faturamento.</span>
                </div>
            `;

        } else {

            salesList.innerHTML =
                recentSales.map(sale => `

                    <div class="mini-sale">

                        <div class="mini-avatar">
                            ${initials(sale.clientName)}
                        </div>

                        <div class="mini-sale-main">

                            <strong>
                                ${escapeHTML(sale.clientName)}
                            </strong>

                            <small>
                                ${escapeHTML(sale.responsible)}
                                · ${formatDate(sale.date)}
                            </small>

                        </div>

                        <span class="mini-sale-value">
                            ${currency(sale.value)}
                        </span>

                    </div>

                `).join("");
        }


        renderRanking();

        renderActivity();

        renderPriorityTasks();
    }


    function renderRanking() {

        const ranking =
            USERS.map(user => {

                const userSales =
                    data.sales.filter(
                        sale =>
                            sale.responsible === user.nome &&
                            sale.status !== "cancelled"
                    );


                const revenue =
                    userSales.reduce(
                        (sum, sale) =>
                            sum + Number(sale.value || 0),
                        0
                    );


                const completed =
                    data.tasks.filter(
                        task =>
                            task.owner === user.nome &&
                            task.completed
                    ).length;


                return {
                    user,
                    sales: userSales.length,
                    revenue,
                    completed
                };

            })
            .sort(
                (a, b) =>
                    b.revenue - a.revenue
            );


        const container =
            document.getElementById(
                "rankingList"
            );


        container.innerHTML =
            ranking.map((item, index) => `

                <div class="ranking-row">

                    <div class="rank-avatar">
                        ${item.user.iniciais}
                    </div>

                    <div class="rank-main">

                        <strong>
                            ${escapeHTML(item.user.nome)}
                        </strong>

                        <small>
                            ${item.sales} venda(s)
                            · ${item.completed} tarefa(s)
                        </small>

                    </div>

                    <strong style="
                        color:#cbb8ef;
                        font-size:11px;
                    ">
                        ${currency(item.revenue)}
                    </strong>

                </div>

            `).join("");
    }


    function renderActivity() {

        const container =
            document.getElementById(
                "activityList"
            );


        if (!data.activities.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <strong>Nenhuma atividade</strong>
                    <span>As ações realizadas aparecerão aqui.</span>
                </div>
            `;

            return;
        }


        container.innerHTML =
            data.activities
                .slice(0, 6)
                .map(activity => `

                    <div class="activity-row">

                        <div class="mini-avatar">
                            ${initials(activity.user)}
                        </div>

                        <div class="activity-main">

                            <strong>
                                ${escapeHTML(activity.text)}
                            </strong>

                            <small>
                                ${escapeHTML(activity.user)}
                                · ${formatActivityDate(activity.date)}
                            </small>

                        </div>

                    </div>

                `)
                .join("");
    }


    function formatActivityDate(date) {

        if (!date) return "";

        const d = new Date(date);

        return d.toLocaleString(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }


    function renderPriorityTasks() {

        const tasks =
            data.tasks
                .filter(
                    task =>
                        !task.completed &&
                        (
                            task.priority === "high" ||
                            task.priority === "urgent" ||
                            isTaskOverdue(task)
                        )
                )
                .slice(0, 5);


        const container =
            document.getElementById(
                "priorityTasks"
            );


        if (!tasks.length) {

            container.innerHTML = `
                <div class="empty-state">
                    <strong>Nenhuma tarefa crítica</strong>
                    <span>A operação está sem tarefas prioritárias.</span>
                </div>
            `;

            return;
        }


        container.innerHTML =
            tasks.map(task => `

                <div class="priority-row">

                    <div class="mini-avatar">
                        !
                    </div>

                    <div class="priority-main">

                        <strong>
                            ${escapeHTML(task.title)}
                        </strong>

                        <small>
                            ${escapeHTML(task.owner)}
                            · ${formatDate(task.dueDate)}
                        </small>

                    </div>

                    <span class="
                        priority
                        ${task.priority || "high"}
                    ">
                        ${
                            isTaskOverdue(task)
                                ? "Atrasada"
                                : "Prioritária"
                        }
                    </span>

                </div>

            `).join("");
    }


    /* =========================================================
       RENDER — METAS
    ========================================================= */

    function renderGoals() {

        document.getElementById(
            "generalGoal"
        ).textContent =
            currency(data.goals.general);


        const container =
            document.getElementById(
                "employeeGoals"
            );


        container.innerHTML =
            USERS.map(user => {

                const target =
                    Number(
                        data.goals.employees[user.nome] || 0
                    );


                const revenue =
                    data.sales
                        .filter(
                            sale =>
                                sale.responsible === user.nome &&
                                sale.status !== "cancelled"
                        )
                        .reduce(
                            (sum, sale) =>
                                sum + Number(sale.value || 0),
                            0
                        );


                const percentage =
                    target > 0
                        ? Math.min(
                            100,
                            Math.round(
                                revenue / target * 100
                            )
                        )
                        : 0;


                return `

                    <div class="employee-goal">

                        <div class="employee-goal-top">

                            <div class="mini-avatar">
                                ${user.iniciais}
                            </div>

                            <strong>
                                ${escapeHTML(user.nome)}
                            </strong>

                        </div>

                        <div class="employee-goal-value">

                            <span>
                                Realizado
                            </span>

                            <strong>
                                ${currency(revenue)}
                            </strong>

                        </div>

                        <div class="employee-goal-value">

                            <span>
                                Meta
                            </span>

                            <strong>
                                ${target
                                    ? currency(target)
                                    : "Não definida"}
                            </strong>

                        </div>

                        <div class="progress-bar">

                            <span
                                style="
                                    width:${percentage}%
                                "
                            ></span>

                        </div>

                    </div>

                `;

            }).join("");
    }


    /* =========================================================
       RENDER — EQUIPE
    ========================================================= */

    function renderTeam() {

        const container =
            document.getElementById(
                "teamList"
            );


        container.innerHTML =
            USERS.map(user => {

                const sales =
                    data.sales.filter(
                        sale =>
                            sale.responsible === user.nome
                    );


                const validSales =
                    sales.filter(
                        sale =>
                            sale.status !== "cancelled"
                    );


                const revenue =
                    validSales.reduce(
                        (sum, sale) =>
                            sum + Number(sale.value || 0),
                        0
                    );


                const tasks =
                    data.tasks.filter(
                        task =>
                            task.owner === user.nome
                    );


                const completed =
                    tasks.filter(
                        task => task.completed
                    ).length;


                return `

                    <div class="team-card">

                        <div class="team-card-head">

                            <div class="team-avatar">
                                ${user.iniciais}
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


                        <div class="team-stats">

                            <div>
                                <span>Vendas</span>
                                <strong>${sales.length}</strong>
                            </div>

                            <div>
                                <span>Faturamento</span>
                                <strong>${currency(revenue)}</strong>
                            </div>

                            <div>
                                <span>Tarefas</span>
                                <strong>
                                    ${completed}/${tasks.length}
                                </strong>
                            </div>

                        </div>

                    </div>

                `;

            }).join("");
    }


    /* =========================================================
       RENDER — RELATÓRIOS
    ========================================================= */

    function renderReports() {

        const validSales =
            data.sales.filter(
                sale =>
                    sale.status !== "cancelled"
            );


        const revenue =
            validSales.reduce(
                (sum, sale) =>
                    sum + Number(sale.value || 0),
                0
            );


        const average =
            validSales.length
                ? revenue / validSales.length
                : 0;


        document.getElementById(
            "reportClients"
        ).textContent =
            data.clients.length;


        document.getElementById(
            "reportSales"
        ).textContent =
            data.sales.length;


        document.getElementById(
            "reportRevenue"
        ).textContent =
            currency(revenue);


        document.getElementById(
            "reportTasks"
        ).textContent =
            data.tasks.length;


        document.getElementById(
            "reportCompleted"
        ).textContent =
            data.tasks.filter(
                task => task.completed
            ).length;


        document.getElementById(
            "reportAverage"
        ).textContent =
            currency(average);


        const ranking =
            USERS.map(user => {

                const sales =
                    validSales.filter(
                        sale =>
                            sale.responsible === user.nome
                    );


                const value =
                    sales.reduce(
                        (sum, sale) =>
                            sum + Number(sale.value || 0),
                        0
                    );


                return {
                    user,
                    sales: sales.length,
                    value
                };

            })
            .sort(
                (a, b) =>
                    b.value - a.value
            );


        document.getElementById(
            "reportRanking"
        ).innerHTML =
            ranking.map((item, index) => `

                <div class="report-rank-row">

                    <strong>
                        #${index + 1}
                    </strong>

                    <div class="mini-avatar">
                        ${item.user.iniciais}
                    </div>

                    <div class="report-rank-main">

                        <strong>
                            ${escapeHTML(item.user.nome)}
                        </strong>

                        <span>
                            ${item.sales} venda(s)
                        </span>

                    </div>

                    <div class="report-rank-value">
                        ${currency(item.value)}
                    </div>

                </div>

            `).join("");
    }


    /* =========================================================
       EVENTOS DE BUSCA
    ========================================================= */

    document
        .getElementById("salesSearch")
        .addEventListener(
            "input",
            renderSales
        );


    document
        .getElementById("salesStatusFilter")
        .addEventListener(
            "change",
            renderSales
        );


    document
        .getElementById("salesResponsibleFilter")
        .addEventListener(
            "change",
            renderSales
        );


    document
        .getElementById("clientSearch")
        .addEventListener(
            "input",
            renderClients
        );


    document
        .getElementById("clientStatusFilter")
        .addEventListener(
            "change",
            renderClients
        );


    /* =========================================================
       EVENT DELEGATION
    ========================================================= */

    document.addEventListener("click", event => {

        const element =
            event.target.closest("[data-action]");

        if (!element) return;


        const action =
            element.dataset.action;

        const id =
            element.dataset.id;


        if (action === "new-sale") {

            openSaleModal();

            return;
        }


        if (action === "edit-sale") {

            openSaleModal(id);

            return;
        }


        if (action === "delete-sale") {

            if (!isAdmin) return;


            const sale =
                data.sales.find(
                    item => item.id === id
                );

            if (!sale) return;


            if (
                !confirm(
                    `Excluir a venda de ${currency(sale.value)}?`
                )
            ) {
                return;
            }


            data.sales =
                data.sales.filter(
                    item => item.id !== id
                );


            addActivity(
                `Venda de ${currency(sale.value)} excluída.`
            );


            saveData();

            renderAll();

            showToast(
                "Venda excluída."
            );

            return;
        }


        if (action === "new-client") {

            openClientModal();

            return;
        }


        if (action === "edit-client") {

            openClientModal(id);

            return;
        }


        if (action === "delete-client") {

            deleteClient(id);

            return;
        }


        if (action === "whatsapp") {

            openWhatsApp(
                element.dataset.phone
            );

            return;
        }


        if (action === "new-task") {

            openTaskModal();

            return;
        }


        if (action === "edit-task") {

            openTaskModal(id);

            return;
        }


        if (action === "delete-task") {

            deleteTask(id);

            return;
        }


        if (action === "toggle-task") {

            toggleTask(id);

            return;
        }


        if (action === "edit-general-goal") {

            openGoalModal();

            return;
        }


        if (action === "logout") {

            sessionStorage.removeItem(
                "nexaUsuario"
            );

            window.location.href =
                "login.html";

            return;
        }


        if (action === "export-data") {

            exportData();

            return;
        }


        if (action === "import-data") {

            document
                .getElementById("importFile")
                .click();

            return;
        }


        if (action === "reset-data") {

            resetData();

            return;
        }

    });


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
                    type: "application/json"
                }
            );


        const url =
            URL.createObjectURL(blob);


        const a =
            document.createElement("a");

        a.href = url;

        a.download =
            `nexa-backup-${today()}.json`;

        a.click();


        URL.revokeObjectURL(url);


        showToast(
            "Backup exportado."
        );
    }


    /* =========================================================
       IMPORTAR
    ========================================================= */

    document
        .getElementById("importFile")
        .addEventListener(
            "change",
            event => {

                const file =
                    event.target.files[0];

                if (!file) return;


                const reader =
                    new FileReader();


                reader.onload = () => {

                    try {

                        const imported =
                            JSON.parse(
                                reader.result
                            );


                        data =
                            normalizeData(
                                imported
                            );


                        saveData();

                        renderAll();


                        showToast(
                            "Backup importado com sucesso."
                        );


                    } catch {

                        showToast(
                            "Arquivo inválido.",
                            "error"
                        );

                    }

                };


                reader.readAsText(file);

                event.target.value = "";

            }
        );


    /* =========================================================
       RESET
    ========================================================= */

    function resetData() {

        if (!isAdmin) return;


        const confirmed =
            confirm(
                "ATENÇÃO: isso apagará todas as vendas, clientes, tarefas e dados salvos neste navegador. Continuar?"
            );


        if (!confirmed) return;


        data =
            defaultData();


        saveData();

        renderAll();


        showToast(
            "Sistema resetado."
        );
    }


    /* =========================================================
       NOTIFICAÇÕES
    ========================================================= */

    function renderNotifications() {

        const count =
            data.notifications.length;


        document.getElementById(
            "notificationCount"
        ).textContent =
            count;
    }


    document
        .getElementById("notificationButton")
        .addEventListener("click", () => {

            if (!data.notifications.length) {

                showToast(
                    "Você não possui novas notificações."
                );

                return;
            }

            showToast(
                `${data.notifications.length} notificação(ões).`
            );

        });


    /* =========================================================
       RENDER GERAL
    ========================================================= */

    function renderAll() {

        renderDashboard();

        renderSales();

        renderClients();

        renderTasks();

        renderGoals();

        renderTeam();

        renderReports();

        renderNotifications();
    }


    /* =========================================================
       INICIALIZAÇÃO
    ========================================================= */

    renderAll();

});