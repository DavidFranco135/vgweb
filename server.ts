/**
 * server.ts — vgweb App
 * Rotas de API: IXC Soft + Firebase Cloud Messaging + Dashboard
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import admin from "firebase-admin";

import {
  getClienteIXCporCPF,
  getStatusConexao,
  getFaturasCliente,
  solicitarDesbloqueioConfianca,
  gerarPixFatura,
} from "./src/lib/ixcService";

dotenv.config({ path: ".env.local" });

// ── Firebase Admin ───────────────────────────────────────────────
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} else {
  admin.initializeApp({ projectId: "giganet-1d32c" });
}

const db = admin.firestore();

// ── ID do provedor (mesmo do frontend) ──────────────────────────
const PROVEDOR_ID = process.env.PROVEDOR_ID || "giganet";

// ── Caminhos Firestore (espelham tenant.ts do frontend) ──────────
const ColServer = {
  users:        () => db.collection("provedores").doc(PROVEDOR_ID).collection("users"),
  tickets:      () => db.collection("provedores").doc(PROVEDOR_ID).collection("tickets"),
  notificacoes: () => db.collection("provedores").doc(PROVEDOR_ID).collection("notificacoes"),
};

// ── Middleware de autenticação Firebase ──────────────────────────
async function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autorizado" });
  }
  try {
    const token   = authHeader.split("Bearer ")[1];
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

// ── Middleware: apenas admin do provedor ─────────────────────────
async function requireAdmin(req: any, res: any, next: any) {
  try {
    const snap = await ColServer.users().doc(req.uid).get();
    if (!snap.exists || snap.data()?.tipo !== "admin") {
      return res.status(403).json({ error: "Acesso negado" });
    }
    next();
  } catch {
    res.status(403).json({ error: "Acesso negado" });
  }
}

// ────────────────────────────────────────────────────────────────
async function startServer() {
  const app  = express();
  const PORT = 3000;

  app.use(express.json());

  // ── Salva FCM token do cliente ──────────────────────────────
  // POST /api/fcm/token  { token: "..." }
  app.post("/api/fcm/token", requireAuth, async (req: any, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token obrigatório" });
    try {
      await ColServer.users().doc(req.uid).update({ fcmToken: token });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Status de Conexão via IXC ──────────────────────────────
  app.get("/api/ixc/status", requireAuth, async (req: any, res) => {
    try {
      const userDoc = await ColServer.users().doc(req.uid).get();
      const profile = userDoc.data();

      if (!profile?.ixcId) {
        if (profile?.cpf) {
          const clienteIXC = await getClienteIXCporCPF(profile.cpf);
          if (clienteIXC) {
            await ColServer.users().doc(req.uid).update({ ixcId: clienteIXC.id });
            const statusData = await getStatusConexao(clienteIXC.id);
            await ColServer.users().doc(req.uid).update({ statusConexao: statusData.status });
            return res.json(statusData);
          }
        }
        return res.json({ status: "offline", online: false, bloqueado_financeiro: false });
      }

      const statusData = await getStatusConexao(profile.ixcId);
      await ColServer.users().doc(req.uid).update({ statusConexao: statusData.status });
      res.json(statusData);
    } catch (err: any) {
      console.error("[API] /ixc/status:", err.message);
      res.status(500).json({ error: "Erro ao consultar status" });
    }
  });

  // ── Faturas do Cliente via IXC ─────────────────────────────
  app.get("/api/ixc/faturas", requireAuth, async (req: any, res) => {
    try {
      const userDoc = await ColServer.users().doc(req.uid).get();
      const profile = userDoc.data();
      if (!profile?.ixcId) return res.json({ faturas: [] });
      const faturas = await getFaturasCliente(profile.ixcId);
      res.json({ faturas });
    } catch (err: any) {
      console.error("[API] /ixc/faturas:", err.message);
      res.status(500).json({ error: "Erro ao buscar faturas" });
    }
  });

  // ── Gerar PIX ──────────────────────────────────────────────
  app.get("/api/ixc/pix/:idFatura", requireAuth, async (req: any, res) => {
    try {
      const pix = await gerarPixFatura(req.params.idFatura);
      if (!pix) return res.status(404).json({ error: "Fatura não encontrada" });
      res.json(pix);
    } catch {
      res.status(500).json({ error: "Erro ao gerar PIX" });
    }
  });

  // ── Desbloqueio de Confiança ───────────────────────────────
  app.post("/api/ixc/desbloqueio", requireAuth, async (req: any, res) => {
    try {
      const userDoc = await ColServer.users().doc(req.uid).get();
      const profile = userDoc.data();

      if (!profile?.ixcId) {
        return res.status(400).json({ error: "Cliente não vinculado ao IXC" });
      }

      const ultimoDesbloqueio = profile.ultimoDesbloqueio?.toDate?.();
      if (ultimoDesbloqueio) {
        const diff         = Date.now() - ultimoDesbloqueio.getTime();
        const horasPassadas = diff / (1000 * 60 * 60);
        if (horasPassadas < 24) {
          return res.status(429).json({
            error: "Desbloqueio já solicitado. Aguarde 24h.",
          });
        }
      }

      const ok = await solicitarDesbloqueioConfianca(profile.ixcId);
      if (ok) {
        await ColServer.users().doc(req.uid).update({
          ultimoDesbloqueio: admin.firestore.FieldValue.serverTimestamp(),
          statusConexao:     "online",
        });
        res.json({ success: true, message: "Desbloqueio solicitado! Sua conexão será restaurada em instantes." });
      } else {
        res.status(500).json({ error: "IXC não processou o desbloqueio. Ligue para o suporte." });
      }
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao solicitar desbloqueio" });
    }
  });

  // ── Dashboard Admin: estatísticas reais ───────────────────
  // GET /api/admin/dashboard
  app.get("/api/admin/dashboard", requireAuth, requireAdmin, async (_req, res) => {
    try {
      const usersSnap   = await ColServer.users().get();
      const ticketsSnap = await ColServer.tickets().get();

      let totalClientes = 0, clientesAtivos = 0, clientesBloqueados = 0;
      let receitaMensal = 0, inadimplentes = 0;

      usersSnap.docs.forEach(d => {
        const data = d.data();
        if (data.tipo === "client") {
          totalClientes++;
          if (data.statusConexao === "online")  clientesAtivos++;
          if (data.statusConexao === "blocked") clientesBloqueados++;
        }
      });

      const chamadosAbertos     = ticketsSnap.docs.filter(d => d.data().status === "open").length;
      const chamadosEmAndamento = ticketsSnap.docs.filter(d => d.data().status === "in_progress").length;

      res.json({
        totalClientes, clientesAtivos, clientesBloqueados,
        receitaMensal, inadimplentes,
        chamadosAbertos, chamadosEmAndamento,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Enviar Notificação Push (FCM) ──────────────────────────
  // POST /api/notificacoes/enviar
  // Body: { tipo, alvo, titulo, corpo, bairros?, usuarioId? }
  app.post("/api/notificacoes/enviar", requireAuth, requireAdmin, async (req: any, res) => {
    const { tipo, alvo, titulo, corpo, bairros, usuarioId } = req.body;

    if (!titulo || !corpo) {
      return res.status(400).json({ error: "Título e corpo são obrigatórios." });
    }

    try {
      // 1. Busca tokens FCM dos destinatários
      const usersSnap = await ColServer.users().get();
      let tokens: string[] = [];

      usersSnap.docs.forEach(d => {
        const data = d.data();
        if (data.tipo !== "client" || !data.fcmToken) return;

        if (alvo === "todos") {
          tokens.push(data.fcmToken);
        } else if (alvo === "bairro" && bairros?.length > 0) {
          const bairroCliente = (data.endereco?.bairro || data.bairro || "").trim().toLowerCase();
          const match = bairros.some((b: string) =>
            bairroCliente.includes(b.trim().toLowerCase()) ||
            b.trim().toLowerCase().includes(bairroCliente)
          );
          if (match) tokens.push(data.fcmToken);
        } else if (alvo === "usuario" && d.id === usuarioId) {
          tokens.push(data.fcmToken);
        }
      });

      // Remove duplicatas
      tokens = [...new Set(tokens)];

      let totalEnviados = 0;

      if (tokens.length > 0) {
        // 2. Envia via FCM (máx 500 por batch)
        const chunks: string[][] = [];
        for (let i = 0; i < tokens.length; i += 500) {
          chunks.push(tokens.slice(i, i + 500));
        }

        for (const chunk of chunks) {
          const message = {
            notification: { title: titulo, body: corpo },
            data:         { tipo, alvo },
            tokens:       chunk,
          };
          const result = await admin.messaging().sendEachForMulticast(message);
          totalEnviados += result.successCount;

          // Remove tokens inválidos do Firestore
          result.responses.forEach((r, idx) => {
            if (!r.success && r.error?.code === "messaging/invalid-registration-token") {
              // Token expirado — limpa no Firestore em background
              usersSnap.docs
                .filter(d => d.data().fcmToken === chunk[idx])
                .forEach(d => d.ref.update({ fcmToken: admin.firestore.FieldValue.delete() }));
            }
          });
        }
      }

      // 3. Salva no histórico de notificações
      const notificacao = {
        tipo, alvo, titulo, corpo,
        bairros:      bairros || [],
        usuarioId:    usuarioId || null,
        enviadoPor:   req.uid,
        enviadoEm:    new Date().toISOString(),
        totalEnviados,
        status:       "enviado",
      };
      const ref = await ColServer.notificacoes().add(notificacao);

      res.json({ ok: true, totalEnviados, notificacao: { id: ref.id, ...notificacao } });
    } catch (err: any) {
      console.error("[API] /notificacoes/enviar:", err.message);
      res.status(500).json({ error: err.message || "Erro ao enviar notificação." });
    }
  });

  // ── Webhook IXC ───────────────────────────────────────────
  app.post("/api/webhooks/ixc", async (req, res) => {
    const evento = req.body;
    try {
      const cpf       = evento?.cpf_cnpj || evento?.cnpj_cpf;
      const novoStatus = evento?.status;
      if (cpf && novoStatus) {
        const statusMap: Record<string, string> = {
          A: "online", B: "blocked", FA: "blocked", CA: "offline",
        };
        const statusApp = statusMap[novoStatus] || "offline";
        const usersSnap = await ColServer.users()
          .where("cpf", "==", cpf.replace(/\D/g, ""))
          .limit(1).get();

        if (!usersSnap.empty) {
          const userRef  = usersSnap.docs[0].ref;
          const userData = usersSnap.docs[0].data();
          await userRef.update({ statusConexao: statusApp });

          // Notifica o cliente via push se foi bloqueado
          if (statusApp === "blocked" && userData.fcmToken) {
            await admin.messaging().send({
              token: userData.fcmToken,
              notification: {
                title: "⚠️ Conexão suspensa",
                body:  "Sua internet foi suspensa por inadimplência. Acesse o app para regularizar.",
              },
              data: { tipo: "financeiro", alvo: "usuario" },
            });
          }
        }
      }
      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("[Webhook IXC]", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Vite (desenvolvimento) ────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅  Servidor rodando em http://localhost:${PORT}`);
    console.log(`   IXC URL:    ${process.env.IXC_URL    || "⚠️  não configurado"}`);
    console.log(`   Provedor:   ${PROVEDOR_ID}`);
  });
}

startServer();
