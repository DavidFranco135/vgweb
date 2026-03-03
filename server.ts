/**
 * server.ts —vgweb App
 * Rotas de API com integração real ao IXC Soft
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

// ── Firebase Admin ──────────────────────────────────────────────
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} else {
  admin.initializeApp({ projectId: "vgweb-34eec" });
}

const db = admin.firestore();

// ── Middleware de autenticação Firebase ─────────────────────────
async function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autorizado" });
  }
  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

// ── Servidor ────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ────────────────────────────────────────────────────────────
  //  ROTA: Status de Conexão via IXC
  //  GET /api/ixc/status
  //  Retorna: { status: 'online' | 'offline' | 'blocked' }
  // ────────────────────────────────────────────────────────────
  app.get("/api/ixc/status", requireAuth, async (req: any, res) => {
    try {
      // Busca o perfil do usuário no Firestore para pegar o ixcId
      const userDoc = await db.collection("users").doc(req.uid).get();
      const profile = userDoc.data();

      if (!profile?.ixcId) {
        // Se ainda não tem o ID IXC vinculado, tenta vincular pelo CPF
        if (profile?.cpf) {
          const clienteIXC = await getClienteIXCporCPF(profile.cpf);
          if (clienteIXC) {
            // Salva o ID IXC no Firestore para consultas futuras
            await db.collection("users").doc(req.uid).update({ ixcId: clienteIXC.id });
            const statusData = await getStatusConexao(clienteIXC.id);
            // Atualiza o status no Firestore (o app vai ler via onSnapshot)
            await db.collection("users").doc(req.uid).update({
              statusConexao: statusData.status,
            });
            return res.json(statusData);
          }
        }
        return res.json({ status: "offline", online: false, bloqueado_financeiro: false });
      }

      // Já tem ixcId: consulta diretamente
      const statusData = await getStatusConexao(profile.ixcId);

      // Atualiza o Firestore — o app em tempo real reflete automaticamente
      await db.collection("users").doc(req.uid).update({
        statusConexao: statusData.status,
      });

      res.json(statusData);
    } catch (err: any) {
      console.error("[API] /ixc/status:", err.message);
      res.status(500).json({ error: "Erro ao consultar status" });
    }
  });

  // ────────────────────────────────────────────────────────────
  //  ROTA: Faturas do Cliente via IXC
  //  GET /api/ixc/faturas
  //  Retorna: array de faturas
  // ────────────────────────────────────────────────────────────
  app.get("/api/ixc/faturas", requireAuth, async (req: any, res) => {
    try {
      const userDoc = await db.collection("users").doc(req.uid).get();
      const profile = userDoc.data();

      if (!profile?.ixcId) {
        return res.json({ faturas: [] });
      }

      const faturas = await getFaturasCliente(profile.ixcId);
      res.json({ faturas });
    } catch (err: any) {
      console.error("[API] /ixc/faturas:", err.message);
      res.status(500).json({ error: "Erro ao buscar faturas" });
    }
  });

  // ────────────────────────────────────────────────────────────
  //  ROTA: Gerar PIX para fatura
  //  GET /api/ixc/pix/:idFatura
  // ────────────────────────────────────────────────────────────
  app.get("/api/ixc/pix/:idFatura", requireAuth, async (req: any, res) => {
    try {
      const pix = await gerarPixFatura(req.params.idFatura);
      if (!pix) return res.status(404).json({ error: "Fatura não encontrada" });
      res.json(pix);
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao gerar PIX" });
    }
  });

  // ────────────────────────────────────────────────────────────
  //  ROTA: Desbloqueio de Confiança
  //  POST /api/ixc/desbloqueio
  // ────────────────────────────────────────────────────────────
  app.post("/api/ixc/desbloqueio", requireAuth, async (req: any, res) => {
    try {
      const userDoc = await db.collection("users").doc(req.uid).get();
      const profile = userDoc.data();

      if (!profile?.ixcId) {
        return res.status(400).json({ error: "Cliente não vinculado ao IXC" });
      }

      // Verifica se já solicitou desbloqueio recentemente (cooldown 24h)
      const ultimoDesbloqueio = profile.ultimoDesbloqueio?.toDate?.();
      if (ultimoDesbloqueio) {
        const diff = Date.now() - ultimoDesbloqueio.getTime();
        const horasPassadas = diff / (1000 * 60 * 60);
        if (horasPassadas < 24) {
          return res.status(429).json({
            error: "Desbloqueio de confiança já solicitado recentemente. Aguarde 24h.",
          });
        }
      }

      const ok = await solicitarDesbloqueioConfianca(profile.ixcId);
      if (ok) {
        // Registra o timestamp do desbloqueio
        await db.collection("users").doc(req.uid).update({
          ultimoDesbloqueio: admin.firestore.FieldValue.serverTimestamp(),
          statusConexao: "online",
        });
        res.json({ success: true, message: "Desbloqueio solicitado com sucesso!" });
      } else {
        res.status(500).json({ error: "O IXC não processou o desbloqueio. Tente pelo suporte." });
      }
    } catch (err: any) {
      res.status(500).json({ error: "Erro ao solicitar desbloqueio" });
    }
  });

  // ────────────────────────────────────────────────────────────
  //  ROTA: Webhook do IXC (notificações automáticas)
  //  O IXC chama esta URL quando o status de um cliente muda.
  //  Configure em: IXC > Configurações > Webhooks > URL abaixo
  //  URL: https://SEU-DOMINIO.com/api/webhooks/ixc
  // ────────────────────────────────────────────────────────────
  app.post("/api/webhooks/ixc", async (req, res) => {
    const evento = req.body;
    console.log("[Webhook IXC]", JSON.stringify(evento));

    try {
      // O IXC envia o CPF/CNPJ ou ID do cliente no payload
      const cpf = evento?.cpf_cnpj || evento?.cnpj_cpf;
      const novoStatus = evento?.status; // 'A' | 'B' | 'FA'

      if (cpf && novoStatus) {
        // Mapeia o status IXC para o status do app
        const statusMap: Record<string, string> = {
          A:  "online",
          B:  "blocked",
          FA: "blocked",
          CA: "offline",
        };
        const statusApp = statusMap[novoStatus] || "offline";

        // Encontra o usuário pelo CPF no Firestore e atualiza
        const usersSnap = await db.collection("users")
          .where("cpf", "==", cpf.replace(/\D/g, ""))
          .limit(1)
          .get();

        if (!usersSnap.empty) {
          await usersSnap.docs[0].ref.update({ statusConexao: statusApp });
          console.log(`[Webhook IXC] Status do CPF ${cpf} atualizado para: ${statusApp}`);
        }
      }

      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("[Webhook IXC] Erro:", err.message);
      res.status(500).json({ error: "Erro ao processar webhook" });
    }
  });

  // ── Vite (desenvolvimento) ──────────────────────────────────
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
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
    console.log(`   IXC URL: ${process.env.IXC_URL || "⚠️  não configurado"}`);
  });
}

startServer();
