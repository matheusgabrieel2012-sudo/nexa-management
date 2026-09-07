export default async function handler(req, res) {
    const {
        SUPABASE_URL,
        SUPABASE_SECRET_KEY,
        NEXA_ADMIN_TOKEN
    } = process.env;

    // ==========================================
    // VERIFICAR VARIÁVEIS
    // ==========================================

    if (!SUPABASE_URL) {
        return res.status(500).json({
            error: "SUPABASE_URL não configurada na Vercel."
        });
    }

    if (!SUPABASE_SECRET_KEY) {
        return res.status(500).json({
            error: "SUPABASE_SECRET_KEY não configurada na Vercel."
        });
    }

    if (!NEXA_ADMIN_TOKEN) {
        return res.status(500).json({
            error: "NEXA_ADMIN_TOKEN não configurada na Vercel."
        });
    }

    // Remove uma possível "/" no final da URL
    const baseUrl = SUPABASE_URL.replace(/\/+$/, "");

    // URL da tabela
    const supabaseUrl = `${baseUrl}/rest/v1/nexa_store`;

    // ==========================================
    // GET
    // Buscar dados do NEXA
    // ==========================================

    if (req.method === "GET") {
        try {
            const response = await fetch(
                `${supabaseUrl}?id=eq.1&select=data,updated_at`,
                {
                    method: "GET",
                    headers: {
                        "apikey": SUPABASE_SECRET_KEY
                    }
                }
            );

            const responseText = await response.text();

            if (!response.ok) {
                return res.status(response.status).json({
                    error: "Erro ao buscar dados do Supabase.",
                    details: responseText
                });
            }

            let rows;

            try {
                rows = JSON.parse(responseText);
            } catch {
                return res.status(500).json({
                    error: "Supabase retornou uma resposta inválida.",
                    details: responseText
                });
            }

            if (!Array.isArray(rows) || rows.length === 0) {
                return res.status(404).json({
                    error: "Registro principal do NEXA não encontrado."
                });
            }

            return res.status(200).json({
                data: rows[0].data,
                updated_at: rows[0].updated_at
            });

        } catch (error) {
            return res.status(500).json({
                error: "Erro interno ao buscar dados.",
                details: error.message
            });
        }
    }

    // ==========================================
    // PUT
    // Salvar dados do NEXA
    // ==========================================

    if (req.method === "PUT") {

        // Token administrativo enviado pelo navegador
        const adminToken = req.headers["x-nexa-admin-token"];

        if (!adminToken) {
            return res.status(401).json({
                error: "Token administrativo não enviado."
            });
        }

        if (adminToken !== NEXA_ADMIN_TOKEN) {
            return res.status(401).json({
                error: "Token administrativo inválido."
            });
        }

        try {
            const body = req.body;

            // Verifica se recebeu um objeto
            if (!body || typeof body !== "object" || Array.isArray(body)) {
                return res.status(400).json({
                    error: "Dados inválidos."
                });
            }

            const response = await fetch(
                supabaseUrl + "?id=eq.1",
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": SUPABASE_SECRET_KEY,
                        "Prefer": "return=representation"
                    },
                    body: JSON.stringify({
                        data: body,
                        updated_at: new Date().toISOString()
                    })
                }
            );

            const responseText = await response.text();

            if (!response.ok) {
                return res.status(response.status).json({
                    error: "Erro ao salvar dados no Supabase.",
                    details: responseText
                });
            }

            let rows = [];

            try {
                rows = responseText
                    ? JSON.parse(responseText)
                    : [];
            } catch {
                rows = [];
            }

            return res.status(200).json({
                success: true,
                data: rows[0]?.data ?? body,
                updated_at:
                    rows[0]?.updated_at ??
                    new Date().toISOString()
            });

        } catch (error) {
            return res.status(500).json({
                error: "Erro interno ao salvar dados.",
                details: error.message
            });
        }
    }

    // ==========================================
    // MÉTODO NÃO PERMITIDO
    // ==========================================

    res.setHeader("Allow", ["GET", "PUT"]);

    return res.status(405).json({
        error: "Método não permitido."
    });
}