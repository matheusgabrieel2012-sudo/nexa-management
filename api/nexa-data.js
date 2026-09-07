export default async function handler(req, res) {
    const {
        SUPABASE_URL,
        SUPABASE_SECRET_KEY,
        NEXA_ADMIN_TOKEN
    } = process.env;

    // Verifica se as variáveis da Vercel existem
    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !NEXA_ADMIN_TOKEN) {
        return res.status(500).json({
            error: "Variáveis de ambiente não configuradas."
        });
    }

    const supabaseUrl =
        `${SUPABASE_URL}/rest/v1/nexa_store?id=eq.1`;

    // ==========================================
    // GET — buscar dados
    // ==========================================

    if (req.method === "GET") {
        try {
            const response = await fetch(
                `${supabaseUrl}&select=data,updated_at`,
                {
                    method: "GET",
                    headers: {
                        apikey: SUPABASE_SECRET_KEY
                    }
                }
            );

            if (!response.ok) {
                const errorText = await response.text();

                return res.status(response.status).json({
                    error: "Erro ao buscar dados do Supabase.",
                    details: errorText
                });
            }

            const rows = await response.json();

            if (!rows.length) {
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
    // PUT — salvar dados
    // ==========================================

    if (req.method === "PUT") {

        const adminToken = req.headers["x-nexa-admin-token"];

        if (!adminToken || adminToken !== NEXA_ADMIN_TOKEN) {
            return res.status(401).json({
                error: "Não autorizado."
            });
        }

        try {
            const body = req.body;

            if (!body || typeof body !== "object") {
                return res.status(400).json({
                    error: "Dados inválidos."
                });
            }

            const response = await fetch(supabaseUrl, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    apikey: SUPABASE_SECRET_KEY,
                    Prefer: "return=representation"
                },
                body: JSON.stringify({
                    data: body,
                    updated_at: new Date().toISOString()
                })
            });

            if (!response.ok) {
                const errorText = await response.text();

                return res.status(response.status).json({
                    error: "Erro ao salvar dados no Supabase.",
                    details: errorText
                });
            }

            const rows = await response.json();

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
    // Método não permitido
    // ==========================================

    res.setHeader("Allow", ["GET", "PUT"]);

    return res.status(405).json({
        error: "Método não permitido."
    });
}