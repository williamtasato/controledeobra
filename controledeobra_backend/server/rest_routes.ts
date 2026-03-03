import { Router } from "express";
import * as db from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";

const router = Router();

// Auth
router.get("/auth/me", async (req: any, res) => {
  // Tenta autenticar o request para pegar o usuário da sessão
  try {
    const user = await sdk.authenticateRequest(req);
    res.json(user);
  } catch (error) {
    res.json(null);
  }
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  
  // Login simplificado: se não houver usuários, cria um admin padrão
  // Ou verifica se o email/senha coincidem (aqui faremos uma verificação simples)
  let user = await db.getUserByEmail(email);
  
  if (!user) {
    // Para facilitar o primeiro acesso, se não existir usuário, vamos criar um
    const openId = `user_${Date.now()}`;
    await db.upsertUser({
      openId,
      email,
      name: email.split('@')[0],
      role: db.Role.admin,
    });
    // Nota: Em um sistema real, salvaríamos o hash da senha
    await db.getDb().execute('UPDATE users SET password = ? WHERE email = ?', [password, email]);
    user = await db.getUserByEmail(email);
  } else {
    // Se o usuário existe mas não tem senha (ex: criado via OAuth), vamos definir a senha fornecida
    if (!user.password) {
      await db.getDb().execute('UPDATE users SET password = ? WHERE email = ?', [password, email]);
      user = await db.getUserByEmail(email);
    } else if (user.password !== password) {
      return res.status(401).json({ error: "Senha incorreta" });
    }
  }

  const token = await sdk.createSessionToken(user.openId, { name: user.name || user.email });
  
  // Login simplificado: apenas retornar o token no corpo da resposta
  res.json({ ...user, token });
});

router.post("/auth/logout", (req: any, res) => {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  res.json({ success: true });
});

// Projetos
router.get("/projetos", async (req, res) => {
  const projetos = await db.getProjetos();
  res.json(projetos);
});

router.get("/projetos/:id", async (req, res) => {
  const projeto = await db.getProjeto(req.params.id);
  res.json(projeto);
});

router.post("/projetos", async (req, res) => {
  const { nome } = req.body;
  const projeto = await db.createProjeto(nome);
  res.json(projeto);
});

router.put("/projetos/:id", async (req, res) => {
  const { nome } = req.body;
  const projeto = await db.updateProjeto(req.params.id, nome);
  res.json(projeto);
});

router.delete("/projetos/:id", async (req, res) => {
  const result = await db.deleteProjeto(req.params.id);
  res.json(result);
});

// Atividades
router.get("/atividades", async (req, res) => {
  const { projetoId } = req.query;
  const atividades = await db.getAtividades(projetoId as string);
  res.json(atividades);
});

router.get("/atividades/:id", async (req, res) => {
  const atividade = await db.getAtividade(req.params.id);
  res.json(atividade);
});

router.post("/atividades", async (req, res) => {
  const atividade = await db.createAtividade(req.body);
  res.json(atividade);
});

router.put("/atividades/:id", async (req, res) => {
  const atividade = await db.updateAtividade(req.params.id, req.body);
  res.json(atividade);
});

router.delete("/atividades/:id", async (req, res) => {
  const result = await db.deleteAtividade(req.params.id);
  res.json(result);
});

// Subatividades
router.get("/subatividades", async (req, res) => {
  const { atividadeId } = req.query;
  const subatividades = await db.getSubatividades(atividadeId as string);
  res.json(subatividades);
});

router.get("/subatividades/:id", async (req, res) => {
  const subatividade = await db.getSubatividade(req.params.id);
  res.json(subatividade);
});

router.post("/subatividades", async (req, res) => {
  const subatividade = await db.createSubatividade(req.body);
  res.json(subatividade);
});

router.put("/subatividades/:id", async (req, res) => {
  const subatividade = await db.updateSubatividade(req.params.id, req.body);
  res.json(subatividade);
});

router.delete("/subatividades/:id", async (req, res) => {
  const result = await db.deleteSubatividade(req.params.id);
  res.json(result);
});

// Tarefas Diárias
router.get("/tarefadiarias", async (req, res) => {
  const { subatividadeId } = req.query;
  const tarefas = await db.getTarefasDiarias(subatividadeId as string);
  res.json(tarefas);
});

router.get("/tarefadiarias/:id", async (req, res) => {
  const tarefa = await db.getTarefaDiaria(req.params.id);
  res.json(tarefa);
});

router.post("/tarefadiarias", async (req, res) => {
  const tarefa = await db.createTarefaDiaria(req.body);
  res.json(tarefa);
});

router.put("/tarefadiarias/:id", async (req, res) => {
  const tarefa = await db.updateTarefaDiaria(req.params.id, req.body);
  res.json(tarefa);
});

router.delete("/tarefadiarias/:id", async (req, res) => {
  const result = await db.deleteTarefaDiaria(req.params.id);
  res.json(result);
});

// Orçamento
router.get("/orcamento", async (req, res) => {
  const { subatividadeId } = req.query;
  const orcamentos = await db.getOrcamentos(subatividadeId as string);
  res.json(orcamentos);
});

router.get("/orcamento/:id", async (req, res) => {
  const orcamento = await db.getOrcamento(req.params.id);
  res.json(orcamento);
});

router.post("/orcamento", async (req, res) => {
  const orcamento = await db.createOrcamento(req.body);
  res.json(orcamento);
});

router.put("/orcamento/:id", async (req, res) => {
  const orcamento = await db.updateOrcamento(req.params.id, req.body);
  res.json(orcamento);
});

router.delete("/orcamento/:id", async (req, res) => {
  const result = await db.deleteOrcamento(req.params.id);
  res.json(result);
});

export default router;
