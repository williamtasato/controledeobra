// server/_core/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;

// server/db_direct.ts
import mysql from "mysql2/promise";

// server/_core/env.ts
var ENV = {
  appId: process.env.APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET || "controle-de-obra-secret-key-1234567890",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db_direct.ts
var pool = mysql.createPool(ENV.databaseUrl);
var db_direct_default = pool;

// server/db.ts
function serialize(obj) {
  if (obj === null || obj === void 0) return obj;
  if (typeof obj === "bigint") return obj.toString();
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serialize);
  if (typeof obj === "object") {
    const newObj = {};
    for (const key in obj) {
      newObj[key] = serialize(obj[key]);
    }
    return newObj;
  }
  return obj;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const now = /* @__PURE__ */ new Date();
  const role = user.role ?? (user.openId === ENV.ownerId ? "admin" /* admin */ : "user" /* user */);
  const sql = `
    INSERT INTO users (openId, name, email, loginMethod, role, lastSignedIn, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      email = VALUES(email),
      loginMethod = VALUES(loginMethod),
      role = VALUES(role),
      lastSignedIn = VALUES(lastSignedIn),
      updatedAt = VALUES(updatedAt)
  `;
  const params = [
    user.openId,
    user.name ?? null,
    user.email ?? null,
    user.loginMethod ?? null,
    role,
    user.lastSignedIn ?? now,
    now,
    now
  ];
  try {
    await db_direct_default.execute(sql, params);
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUser(openId) {
  console.log(openId);
  const [rows] = await db_direct_default.execute("SELECT * FROM users WHERE openId = ?", [openId]);
  return rows[0] || null;
}
async function getUserByEmail(email) {
  const [rows] = await db_direct_default.execute("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0] || null;
}
async function getUsers() {
  const [rows] = await db_direct_default.execute("SELECT id, openId, name, email, role, createdAt FROM users ORDER BY createdAt DESC");
  return serialize(rows);
}
async function createUser(data) {
  const now = /* @__PURE__ */ new Date();
  const openId = data.openId || `user_${Date.now()}`;
  const sql = `
    INSERT INTO users (openId, name, email, password, role, lastSignedIn, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    openId,
    data.name || null,
    data.email || null,
    data.password || null,
    data.role || "user",
    now,
    now,
    now
  ];
  const [result] = await db_direct_default.execute(sql, params);
  return { id: result.insertId.toString(), openId, ...data };
}
async function updateUser(id, data) {
  const updateFields = [];
  const params = [];
  const allowedFields = ["name", "email", "password", "role"];
  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.includes(key)) {
      updateFields.push(`${key} = ?`);
      params.push(value);
    }
  }
  if (updateFields.length === 0) return { id: id.toString(), ...data };
  updateFields.push("updatedAt = NOW()");
  params.push(id);
  await db_direct_default.execute(`UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`, params);
  return { id: id.toString(), ...data };
}
async function deleteUser(id) {
  await db_direct_default.execute("DELETE FROM users WHERE id = ?", [id]);
  return { id: id.toString() };
}
async function getProjetos() {
  const [rows] = await db_direct_default.execute("SELECT * FROM projetos ORDER BY created_at DESC");
  return serialize(rows);
}
async function getProjeto(id) {
  const [rows] = await db_direct_default.execute("SELECT * FROM projetos WHERE id = ?", [id]);
  return serialize(rows[0]) || null;
}
async function createProjeto(nome) {
  const [result] = await db_direct_default.execute("INSERT INTO projetos (nome, created_at) VALUES (?, NOW())", [nome]);
  return { id: result.insertId.toString(), nome };
}
async function updateProjeto(id, nome) {
  await db_direct_default.execute("UPDATE projetos SET nome = ? WHERE id = ?", [nome, id]);
  return { id: id.toString(), nome };
}
async function deleteProjeto(id) {
  await db_direct_default.execute("DELETE FROM projetos WHERE id = ?", [id]);
  return { id: id.toString() };
}
async function getAtividades(projetoId) {
  const [rows] = await db_direct_default.execute("SELECT * FROM atividades WHERE projeto_id = ? ORDER BY created_at DESC", [projetoId]);
  return serialize(rows);
}
async function getAtividade(id) {
  const [rows] = await db_direct_default.execute("SELECT * FROM atividades WHERE id = ?", [id]);
  return serialize(rows[0]) || null;
}
async function createAtividade(data) {
  const sql = "INSERT INTO atividades (titulo, descricao, inicio, fim, projeto_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())";
  const params = [
    data.titulo || null,
    data.descricao || null,
    data.inicio ? new Date(data.inicio) : null,
    data.fim ? new Date(data.fim) : null,
    data.projetoId || data.projeto_id
  ];
  const [result] = await db_direct_default.execute(sql, params);
  return { id: result.insertId.toString(), ...data };
}
async function updateAtividade(id, data) {
  const fields = Object.keys(data).map((key) => `${key} = ?`).join(", ");
  const params = [...Object.values(data), id];
  await db_direct_default.execute(`UPDATE atividades SET ${fields} WHERE id = ?`, params);
  return { id: id.toString(), ...data };
}
async function deleteAtividade(id) {
  await db_direct_default.execute("DELETE FROM atividades WHERE id = ?", [id]);
  return { id: id.toString() };
}
async function getSubatividades(atividadeId) {
  const sql = `
    SELECT s.*, 
           ot.total as orcamento_total, 
           ot.total_mao_obra as orcamento_mao_obra,
           ot.total_material as orcamento_material
    FROM subatividades s
    LEFT JOIN orcamento_total ot ON s.id = ot.sub_atividade_id
    WHERE s.atividade_id = ?
    ORDER BY s.created_at DESC
  `;
  const [rows] = await db_direct_default.execute(sql, [atividadeId]);
  return serialize(rows);
}
async function getSubatividade(id) {
  const [rows] = await db_direct_default.execute("SELECT * FROM subatividades WHERE id = ?", [id]);
  return serialize(rows[0]) || null;
}
async function createSubatividade(data) {
  const sql = "INSERT INTO subatividades (titulo, descricao, inicio, fim, status, finalizado, atividade_id, metragem, realizado, gasto, gasto_mao_obra, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
  const params = [
    data.titulo || null,
    data.descricao || null,
    data.inicio ? new Date(data.inicio) : null,
    data.fim ? new Date(data.fim) : null,
    data.status || 0,
    data.finalizado || 0,
    data.atividadeId || data.atividade_id,
    data.metragem || 0,
    data.realizado || 0,
    data.gasto || 0,
    data.gastoMaoObra || data.gasto_mao_obra || 0
  ];
  const [result] = await db_direct_default.execute(sql, params);
  return { id: result.insertId.toString(), ...data };
}
async function updateSubatividade(id, data) {
  const fieldMapping = {
    titulo: "titulo",
    descricao: "descricao",
    inicio: "inicio",
    fim: "fim",
    status: "status",
    finalizado: "finalizado",
    atividadeId: "atividade_id",
    atividade_id: "atividade_id",
    metragem: "metragem",
    realizado: "realizado",
    gasto: "gasto",
    gastoMaoObra: "gasto_mao_obra",
    gasto_mao_obra: "gasto_mao_obra"
  };
  const updateFields = [];
  const params = [];
  for (const [key, value] of Object.entries(data)) {
    const dbField = fieldMapping[key];
    if (dbField && key !== "id") {
      updateFields.push(`${dbField} = ?`);
      if (key === "inicio" || key === "fim") {
        params.push(value ? new Date(value) : null);
      } else {
        params.push(value);
      }
    }
  }
  if (updateFields.length === 0) return { id: id.toString(), ...data };
  params.push(id);
  await db_direct_default.execute(`UPDATE subatividades SET ${updateFields.join(", ")} WHERE id = ?`, params);
  return { id: id.toString(), ...data };
}
async function deleteSubatividade(id) {
  await db_direct_default.execute("DELETE FROM subatividades WHERE id = ?", [id]);
  return { id: id.toString() };
}
async function updateSubatividadeStatus(subatividadeId) {
  try {
    const [subatividades] = await db_direct_default.execute(
      "SELECT fim FROM subatividades WHERE id = ?",
      [subatividadeId]
    );
    const subatividadeFim = subatividades[0]?.fim;
    let status = 0;
    if (subatividadeFim) {
      const [atrasadas] = await db_direct_default.execute(
        "SELECT id FROM tarefadiarias WHERE subatividade_id = ? AND DATE(data) > DATE(?) LIMIT 1",
        [subatividadeId, subatividadeFim]
      );
      if (atrasadas && atrasadas.length > 0) {
        status = 1;
      }
    }
    await db_direct_default.execute(
      "UPDATE subatividades SET status = ? WHERE id = ?",
      [status, subatividadeId]
    );
  } catch (error) {
    console.error("[Database] Erro ao atualizar status da subatividade:", error);
  }
}
async function updateSubatividadeTotals(subatividadeId) {
  try {
    const [tarefas] = await db_direct_default.execute(
      "SELECT realizado, valor, valor_mao_de_obra FROM tarefadiarias WHERE subatividade_id = ? ORDER BY created_at DESC LIMIT 1",
      [subatividadeId]
    );
    let ultimoRealizado = 0;
    let ultimoValor = 0;
    let ultimoValorMaoObra = 0;
    if (tarefas && tarefas.length > 0) {
      const ultimaTarefa = tarefas[0];
      ultimoRealizado = ultimaTarefa.realizado || 0;
      ultimoValor = parseFloat(ultimaTarefa.valor) || 0;
      ultimoValorMaoObra = parseFloat(ultimaTarefa.valor_mao_de_obra) || 0;
    }
    await db_direct_default.execute(
      "UPDATE subatividades SET realizado = ?, gasto = ?, gasto_mao_obra = ? WHERE id = ?",
      [ultimoRealizado, ultimoValor, ultimoValorMaoObra, subatividadeId]
    );
    await updateSubatividadeStatus(subatividadeId);
  } catch (error) {
    console.error("[Database] Erro ao atualizar totais da subatividade:", error);
  }
}
async function getTarefasDiarias(subatividadeId) {
  const [rows] = await db_direct_default.execute("SELECT * FROM tarefadiarias WHERE subatividade_id = ? ORDER BY created_at DESC", [subatividadeId]);
  return serialize(rows).map((row) => ({
    ...row,
    valorMaoDeObra: row.valor_mao_de_obra || row.valorMaoDeObra,
    subatividadeId: row.subatividade_id || row.subatividadeId
  }));
}
async function getTarefaDiaria(id) {
  const [rows] = await db_direct_default.execute("SELECT * FROM tarefadiarias WHERE id = ?", [id]);
  const row = serialize(rows[0]);
  if (!row) return null;
  return {
    ...row,
    valorMaoDeObra: row.valor_mao_de_obra || row.valorMaoDeObra,
    subatividadeId: row.subatividade_id || row.subatividadeId
  };
}
async function createTarefaDiaria(data) {
  const sql = "INSERT INTO tarefadiarias (descricao, subatividade_id, realizado, data, valor, valor_mao_de_obra, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())";
  const params = [
    data.descricao || null,
    data.subatividade_id || data.subatividadeId,
    data.realizado || 0,
    data.data ? new Date(data.data) : null,
    parseFloat(data.valor) || 0,
    parseFloat(data.valorMaoDeObra || data.valor_mao_de_obra) || 0
  ];
  const [result] = await db_direct_default.execute(sql, params);
  const subatividadeId = data.subatividade_id || data.subatividadeId;
  await updateSubatividadeTotals(subatividadeId);
  return { id: result.insertId.toString(), ...data };
}
async function updateTarefaDiaria(id, data) {
  const fieldMapping = {
    descricao: "descricao",
    realizado: "realizado",
    data: "data",
    valor: "valor",
    valorMaoDeObra: "valor_mao_de_obra",
    valor_mao_de_obra: "valor_mao_de_obra"
  };
  const updateFields = [];
  const params = [];
  for (const [key, value] of Object.entries(data)) {
    const dbField = fieldMapping[key];
    if (dbField && key !== "id") {
      updateFields.push(`${dbField} = ?`);
      if (key === "valor" || key === "valorMaoDeObra" || key === "valor_mao_de_obra") {
        params.push(parseFloat(value) || 0);
      } else {
        params.push(value);
      }
    }
  }
  if (updateFields.length === 0) return { id: id.toString(), ...data };
  const [tarefas] = await db_direct_default.execute("SELECT subatividade_id FROM tarefadiarias WHERE id = ?", [id]);
  const subatividadeId = tarefas[0]?.subatividade_id;
  params.push(id);
  await db_direct_default.execute(`UPDATE tarefadiarias SET ${updateFields.join(", ")} WHERE id = ?`, params);
  if (subatividadeId) {
    await updateSubatividadeTotals(subatividadeId);
  }
  return { id: id.toString(), ...data };
}
async function deleteTarefaDiaria(id) {
  const [tarefas] = await db_direct_default.execute("SELECT subatividade_id FROM tarefadiarias WHERE id = ?", [id]);
  const subatividadeId = tarefas[0]?.subatividade_id;
  await db_direct_default.execute("DELETE FROM tarefadiarias WHERE id = ?", [id]);
  if (subatividadeId) {
    await updateSubatividadeTotals(subatividadeId);
  }
  return { id: id.toString() };
}
async function getOrcamentos(subatividadeId) {
  const [rows] = await db_direct_default.execute("SELECT * FROM orcamento WHERE sub_atividade_id = ? ORDER BY created_at DESC", [subatividadeId]);
  return serialize(rows);
}
async function getOrcamento(id) {
  const [rows] = await db_direct_default.execute("SELECT * FROM orcamento WHERE id = ?", [id]);
  return serialize(rows[0]) || null;
}
async function createOrcamento(data) {
  const sub_atividade_id = data.subatividadeId || data.sub_atividade_id;
  const totalMaterial = (parseFloat(data.unitarioMaterial) || 0) * (parseInt(data.quantidadeMaterial) || 0);
  const total = (parseFloat(data.totalMaoObra) || 0) + totalMaterial;
  const sql = "INSERT INTO orcamento (descricao, unidade, qtde, unitario_mao_obra, total_mao_obra, total, sub_atividade_id, unitario_material, total_material, tipo_material, quantidade_material, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
  const params = [
    data.descricao || null,
    data.unidade || null,
    parseFloat(data.qtde) || 0,
    parseFloat(data.unitarioMaoObra) || 0,
    parseFloat(data.totalMaoObra) || 0,
    total,
    sub_atividade_id,
    parseFloat(data.unitarioMaterial) || 0,
    totalMaterial,
    data.tipoMaterial || "",
    parseInt(data.quantidadeMaterial) || 0
  ];
  const [result] = await db_direct_default.execute(sql, params);
  await updateOrcamentoTotal(sub_atividade_id);
  return { id: result.insertId.toString(), ...data };
}
async function updateOrcamento(id, data) {
  const fieldMapping = {
    descricao: "descricao",
    unidade: "unidade",
    qtde: "qtde",
    unitarioMaoObra: "unitario_mao_obra",
    totalMaoObra: "total_mao_obra",
    total: "total",
    sub_atividade_id: "sub_atividade_id",
    subatividadeId: "sub_atividade_id",
    unitarioMaterial: "unitario_material",
    totalMaterial: "total_material",
    tipoMaterial: "tipo_material",
    quantidadeMaterial: "quantidade_material"
  };
  const updateFields = [];
  const params = [];
  if (data.unitarioMaterial !== void 0 || data.quantidadeMaterial !== void 0 || data.totalMaoObra !== void 0) {
    const [current] = await db_direct_default.execute("SELECT unitario_material, quantidade_material, total_mao_obra FROM orcamento WHERE id = ?", [id]);
    const unitarioMaterial = data.unitarioMaterial !== void 0 ? parseFloat(data.unitarioMaterial) : parseFloat(current[0].unitario_material);
    const quantidadeMaterial = data.quantidadeMaterial !== void 0 ? parseInt(data.quantidadeMaterial) : parseInt(current[0].quantidade_material);
    const totalMaoObra = data.totalMaoObra !== void 0 ? parseFloat(data.totalMaoObra) : parseFloat(current[0].total_mao_obra);
    const totalMaterial = unitarioMaterial * quantidadeMaterial;
    const total = totalMaoObra + totalMaterial;
    data.totalMaterial = totalMaterial;
    data.total = total;
  }
  for (const [key, value] of Object.entries(data)) {
    const dbField = fieldMapping[key];
    if (dbField && key !== "id") {
      updateFields.push(`${dbField} = ?`);
      params.push(value);
    }
  }
  if (updateFields.length === 0) return { id: id.toString(), ...data };
  const [orcamentos] = await db_direct_default.execute("SELECT sub_atividade_id FROM orcamento WHERE id = ?", [id]);
  const subatividadeId = orcamentos[0]?.sub_atividade_id;
  params.push(id);
  await db_direct_default.execute(`UPDATE orcamento SET ${updateFields.join(", ")} WHERE id = ?`, params);
  if (subatividadeId) {
    await updateOrcamentoTotal(subatividadeId);
  }
  return { id: id.toString(), ...data };
}
async function deleteOrcamento(id) {
  const [orcamentos] = await db_direct_default.execute("SELECT sub_atividade_id FROM orcamento WHERE id = ?", [id]);
  const subatividadeId = orcamentos[0]?.sub_atividade_id;
  await db_direct_default.execute("DELETE FROM orcamento WHERE id = ?", [id]);
  if (subatividadeId) {
    await updateOrcamentoTotal(subatividadeId);
  }
  return { id: id.toString() };
}
async function getOrcamentoTotal(subatividadeId) {
  const [rows] = await db_direct_default.execute("SELECT * FROM orcamento_total WHERE sub_atividade_id = ?", [subatividadeId]);
  return serialize(rows[0]) || null;
}
async function getOrcamentosTotais(subatividadeIds) {
  if (subatividadeIds.length === 0) return [];
  const placeholders = subatividadeIds.map(() => "?").join(",");
  const [rows] = await db_direct_default.execute(`SELECT * FROM orcamento_total WHERE sub_atividade_id IN (${placeholders})`, subatividadeIds);
  return serialize(rows);
}
async function updateOrcamentoTotal(subatividadeId) {
  try {
    const [orcamentos] = await db_direct_default.execute(
      "SELECT total_mao_obra, total_material, total FROM orcamento WHERE sub_atividade_id = ?",
      [subatividadeId]
    );
    let totalMaoObra = 0;
    let totalMaterial = 0;
    let total = 0;
    for (const orcamento of orcamentos) {
      totalMaoObra += parseFloat(orcamento.total_mao_obra) || 0;
      totalMaterial += parseFloat(orcamento.total_material) || 0;
      total += parseFloat(orcamento.total) || 0;
    }
    const [existing] = await db_direct_default.execute(
      "SELECT id FROM orcamento_total WHERE sub_atividade_id = ?",
      [subatividadeId]
    );
    if (existing && existing.length > 0) {
      await db_direct_default.execute(
        "UPDATE orcamento_total SET total_mao_obra = ?, total_material = ?, total = ? WHERE sub_atividade_id = ?",
        [totalMaoObra, totalMaterial, total, subatividadeId]
      );
    } else {
      await db_direct_default.execute(
        "INSERT INTO orcamento_total (sub_atividade_id, total_mao_obra, total_material, total) VALUES (?, ?, ?, ?)",
        [subatividadeId, totalMaoObra, totalMaterial, total]
      );
    }
  } catch (error) {
    console.error("[Database] Erro ao atualizar orcamento_total:", error);
  }
}
async function getEquipamentos() {
  const [rows] = await db_direct_default.execute("SELECT * FROM equipamentos ORDER BY nome ASC");
  return serialize(rows);
}
async function getEquipamento(id) {
  const [rows] = await db_direct_default.execute("SELECT * FROM equipamentos WHERE id = ?", [id]);
  return serialize(rows[0]) || null;
}
async function createEquipamento(data) {
  const sql = "INSERT INTO equipamentos (nome, descricao, created_at) VALUES (?, ?, NOW())";
  const params = [data.nome, data.descricao || null];
  const [result] = await db_direct_default.execute(sql, params);
  return { id: result.insertId.toString(), ...data };
}
async function updateEquipamento(id, data) {
  const sql = "UPDATE equipamentos SET nome = ?, descricao = ? WHERE id = ?";
  const params = [data.nome, data.descricao || null, id];
  await db_direct_default.execute(sql, params);
  return { id: id.toString(), ...data };
}
async function deleteEquipamento(id) {
  await db_direct_default.execute("DELETE FROM equipamentos WHERE id = ?", [id]);
  return { id: id.toString() };
}
async function getProfissionais() {
  const [rows] = await db_direct_default.execute("SELECT * FROM profissionais ORDER BY nome ASC");
  return serialize(rows);
}
async function getProfissional(id) {
  const [rows] = await db_direct_default.execute("SELECT * FROM profissionais WHERE id = ?", [id]);
  return serialize(rows[0]) || null;
}
async function createProfissional(data) {
  const sql = "INSERT INTO profissionais (nome, tipo, descricao, created_at) VALUES (?, ?, ?, NOW())";
  const params = [data.nome, data.tipo || "Padr\xE3o", data.descricao || null];
  const [result] = await db_direct_default.execute(sql, params);
  return { id: result.insertId.toString(), ...data };
}
async function updateProfissional(id, data) {
  const sql = "UPDATE profissionais SET nome = ?, tipo = ?, descricao = ? WHERE id = ?";
  const params = [data.nome, data.tipo || "Padr\xE3o", data.descricao || null, id];
  await db_direct_default.execute(sql, params);
  return { id: id.toString(), ...data };
}
async function deleteProfissional(id) {
  await db_direct_default.execute("DELETE FROM profissionais WHERE id = ?", [id]);
  return { id: id.toString() };
}
async function getTarefaEquipamentos(tarefaId) {
  const [rows] = await db_direct_default.execute(
    `SELECT e.* FROM equipamentos e 
     INNER JOIN tarefa_equipamentos te ON e.id = te.equipamento_id 
     WHERE te.tarefa_id = ? 
     ORDER BY e.nome ASC`,
    [tarefaId]
  );
  return serialize(rows);
}
async function addTarefaEquipamento(tarefaId, equipamentoId) {
  const sql = "INSERT INTO tarefa_equipamentos (tarefa_id, equipamento_id, created_at) VALUES (?, ?, NOW())";
  const params = [tarefaId, equipamentoId];
  const [result] = await db_direct_default.execute(sql, params);
  return { id: result.insertId.toString(), tarefaId, equipamentoId };
}
async function removeTarefaEquipamento(id) {
  await db_direct_default.execute("DELETE FROM tarefa_equipamentos WHERE id = ?", [id]);
  return { id: id.toString() };
}
async function getTarefaProfissionais(tarefaId) {
  const [rows] = await db_direct_default.execute(
    `SELECT p.* FROM profissionais p 
     INNER JOIN tarefa_profissionais tp ON p.id = tp.profissional_id 
     WHERE tp.tarefa_id = ? 
     ORDER BY p.nome ASC`,
    [tarefaId]
  );
  return serialize(rows);
}
async function addTarefaProfissional(tarefaId, profissionalId) {
  const sql = "INSERT INTO tarefa_profissionais (tarefa_id, profissional_id, created_at) VALUES (?, ?, NOW())";
  const params = [tarefaId, profissionalId];
  const [result] = await db_direct_default.execute(sql, params);
  return { id: result.insertId.toString(), tarefaId, profissionalId };
}
async function removeTarefaProfissional(id) {
  await db_direct_default.execute("DELETE FROM tarefa_profissionais WHERE id = ?", [id]);
  return { id: id.toString() };
}
async function getCondicoesClimaticas(tarefaId) {
  const [rows] = await db_direct_default.execute(
    "SELECT * FROM condicoes_climaticas WHERE tarefa_id = ? ORDER BY periodo ASC",
    [tarefaId]
  );
  return serialize(rows);
}
async function saveCondicoesClimaticas(tarefaId, condicoes) {
  try {
    await db_direct_default.execute("DELETE FROM condicoes_climaticas WHERE tarefa_id = ?", [tarefaId]);
    for (const condicao of condicoes) {
      const sql = "INSERT INTO condicoes_climaticas (tarefa_id, periodo, tempo, condicao, created_at) VALUES (?, ?, ?, ?, NOW())";
      const params = [tarefaId, condicao.periodo, condicao.tempo || null, condicao.condicao || null];
      await db_direct_default.execute(sql, params);
    }
    return { tarefaId, condicoes };
  } catch (error) {
    console.error("[Database] Erro ao salvar condi\xE7\xF5es clim\xE1ticas:", error);
    throw error;
  }
}
async function getCondicaoClimatica(id) {
  const [rows] = await db_direct_default.execute("SELECT * FROM condicoes_climaticas WHERE id = ?", [id]);
  return serialize(rows[0]) || null;
}
async function updateCondicaoClimatica(id, data) {
  const sql = "UPDATE condicoes_climaticas SET tempo = ?, condicao = ? WHERE id = ?";
  const params = [data.tempo || null, data.condicao || null, id];
  await db_direct_default.execute(sql, params);
  return { id: id.toString(), ...data };
}
async function deleteCondicaoClimatica(id) {
  await db_direct_default.execute("DELETE FROM condicoes_climaticas WHERE id = ?", [id]);
  return { id: id.toString() };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    const payload = {
      openId,
      appId: ENV.appId || "default_app_id",
      name: options.name || "User",
      exp: Date.now() + (options.expiresInMs ?? ONE_YEAR_MS)
    };
    const payloadStr = JSON.stringify(payload);
    const signature = "signed";
    return Buffer.from(`${payloadStr}.${signature}`).toString("base64");
  }
  async verifySession(token) {
    if (!token) return null;
    try {
      const decodedStr = Buffer.from(token, "base64").toString();
      const [payloadStr] = decodedStr.split(".");
      const decoded = JSON.parse(payloadStr);
      if (!decoded.openId || decoded.exp && decoded.exp < Date.now()) {
        return null;
      }
      return {
        openId: String(decoded.openId),
        appId: String(decoded.appId || ""),
        name: String(decoded.name || "")
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed");
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    let sessionToken = null;
    if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.substring(7);
      } else {
        sessionToken = authHeader;
      }
    }
    if (!sessionToken) {
      const cookies = this.parseCookies(req.headers.cookie);
      sessionToken = cookies.get(COOKIE_NAME);
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Sess\xE3o inv\xE1lida ou expirada");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUser(sessionUserId);
    if (!user) {
      throw ForbiddenError("Usu\xE1rio n\xE3o encontrado no sistema");
    }
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      let redirectUri = "/";
      try {
        redirectUri = atob(state);
      } catch (e) {
        console.error("[OAuth] Failed to decode state", e);
      }
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta http-equiv="refresh" content="0;url=${redirectUri}" />
          </head>
          <body>
            <p>Login realizado com sucesso! Redirecionando...</p>
            <script>
              localStorage.setItem('app_token', '${sessionToken}');
              setTimeout(() => {
                window.location.href = '${redirectUri}';
              }, 100);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/rest_routes.ts
import { Router } from "express";

// server/_core/cookies.ts
var LOCAL_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "::1"]);
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const isSecure = isSecureRequest(req);
  const isLocalhost = LOCAL_HOSTS.has(req.hostname);
  let sameSite = "lax";
  if (!isLocalhost && isSecure) {
    sameSite = "none";
  }
  const secure = sameSite === "none" ? true : isSecure;
  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure
  };
}

// server/rest_routes.ts
var router = Router();
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    message: "API est\xE1 no ar"
  });
});
router.get("/auth/me", async (req, res) => {
  try {
    const user = await sdk.authenticateRequest(req);
    res.json(user);
  } catch (error) {
    res.json(null);
  }
});
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  let user = await getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: "Usu\xE1rio n\xE3o encontrado. Por favor, contate o administrador." });
  } else {
    if (user.password && user.password !== password) {
      return res.status(401).json({ error: "Senha incorreta" });
    }
  }
  const token = await sdk.createSessionToken(user.openId, { name: user.name || user.email });
  res.json({ ...user, token });
});
router.post("/auth/logout", (req, res) => {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  res.json({ success: true });
});
router.get("/projetos", async (req, res) => {
  const projetos = await getProjetos();
  res.json(projetos);
});
router.get("/projetos/:id", async (req, res) => {
  const projeto = await getProjeto(req.params.id);
  res.json(projeto);
});
router.post("/projetos", async (req, res) => {
  const { nome } = req.body;
  const projeto = await createProjeto(nome);
  res.json(projeto);
});
router.put("/projetos/:id", async (req, res) => {
  const { nome } = req.body;
  const projeto = await updateProjeto(req.params.id, nome);
  res.json(projeto);
});
router.delete("/projetos/:id", async (req, res) => {
  const result = await deleteProjeto(req.params.id);
  res.json(result);
});
router.get("/atividades", async (req, res) => {
  const { projetoId } = req.query;
  const atividades = await getAtividades(projetoId);
  res.json(atividades);
});
router.get("/atividades/:id", async (req, res) => {
  const atividade = await getAtividade(req.params.id);
  res.json(atividade);
});
router.post("/atividades", async (req, res) => {
  const atividade = await createAtividade(req.body);
  res.json(atividade);
});
router.put("/atividades/:id", async (req, res) => {
  const atividade = await updateAtividade(req.params.id, req.body);
  res.json(atividade);
});
router.delete("/atividades/:id", async (req, res) => {
  const result = await deleteAtividade(req.params.id);
  res.json(result);
});
router.get("/subatividades", async (req, res) => {
  const { atividadeId } = req.query;
  const subatividades = await getSubatividades(atividadeId);
  res.json(subatividades);
});
router.get("/subatividades/:id", async (req, res) => {
  const subatividade = await getSubatividade(req.params.id);
  res.json(subatividade);
});
router.post("/subatividades", async (req, res) => {
  const { inicio, fim, atividadeId } = req.body;
  if (inicio && fim && atividadeId) {
    const atividade = await getAtividade(atividadeId);
    if (atividade) {
      const dataInicioSub = new Date(inicio);
      const dataFimSub = new Date(fim);
      const dataInicioAtiv = new Date(atividade.inicio);
      const dataFimAtiv = new Date(atividade.fim);
      if (dataInicioSub < dataInicioAtiv || dataFimSub > dataFimAtiv) {
        return res.status(400).json({
          error: `As datas da subatividade devem estar entre ${atividade.inicio.split("T")[0]} e ${atividade.fim.split("T")[0]}`
        });
      }
    }
  }
  const subatividade = await createSubatividade(req.body);
  res.json(subatividade);
});
router.put("/subatividades/:id", async (req, res) => {
  const { inicio, fim, atividadeId } = req.body;
  if (inicio && fim && atividadeId) {
    const atividade = await getAtividade(atividadeId);
    if (atividade) {
      const dataInicioSub = new Date(inicio);
      const dataFimSub = new Date(fim);
      const dataInicioAtiv = new Date(atividade.inicio);
      const dataFimAtiv = new Date(atividade.fim);
      if (dataInicioSub < dataInicioAtiv || dataFimSub > dataFimAtiv) {
        return res.status(400).json({
          error: `As datas da subatividade devem estar entre ${atividade.inicio.split("T")[0]} e ${atividade.fim.split("T")[0]}`
        });
      }
    }
  }
  const subatividade = await updateSubatividade(req.params.id, req.body);
  res.json(subatividade);
});
router.delete("/subatividades/:id", async (req, res) => {
  const result = await deleteSubatividade(req.params.id);
  res.json(result);
});
router.get("/tarefadiarias", async (req, res) => {
  const { subatividadeId } = req.query;
  const tarefas = await getTarefasDiarias(subatividadeId);
  res.json(tarefas);
});
router.get("/tarefadiarias/:id", async (req, res) => {
  const tarefa = await getTarefaDiaria(req.params.id);
  res.json(tarefa);
});
router.post("/tarefadiarias", async (req, res) => {
  const tarefa = await createTarefaDiaria(req.body);
  res.json(tarefa);
});
router.put("/tarefadiarias/:id", async (req, res) => {
  const tarefa = await updateTarefaDiaria(req.params.id, req.body);
  res.json(tarefa);
});
router.delete("/tarefadiarias/:id", async (req, res) => {
  const result = await deleteTarefaDiaria(req.params.id);
  res.json(result);
});
router.get("/orcamento", async (req, res) => {
  const { subatividadeId } = req.query;
  const orcamentos = await getOrcamentos(subatividadeId);
  res.json(orcamentos);
});
router.get("/orcamento/:id", async (req, res) => {
  const orcamento = await getOrcamento(req.params.id);
  res.json(orcamento);
});
router.post("/orcamento", async (req, res) => {
  const orcamento = await createOrcamento(req.body);
  res.json(orcamento);
});
router.put("/orcamento/:id", async (req, res) => {
  const orcamento = await updateOrcamento(req.params.id, req.body);
  res.json(orcamento);
});
router.delete("/orcamento/:id", async (req, res) => {
  const result = await deleteOrcamento(req.params.id);
  res.json(result);
});
router.get("/orcamento-total", async (req, res) => {
  const { subatividadeId } = req.query;
  if (subatividadeId) {
    const orcamentoTotal = await getOrcamentoTotal(subatividadeId);
    res.json(orcamentoTotal);
  } else {
    res.status(400).json({ error: "subatividadeId \xE9 obrigat\xF3rio" });
  }
});
router.get("/orcamento-total/list", async (req, res) => {
  const { subatividadeIds } = req.query;
  if (subatividadeIds) {
    const ids = subatividadeIds.split(",").map((id) => id.trim());
    const orcamentosTotais = await getOrcamentosTotais(ids);
    res.json(orcamentosTotais);
  } else {
    res.status(400).json({ error: "subatividadeIds s\xE3o obrigat\xF3rios" });
  }
});
router.get("/users", async (req, res) => {
  const users = await getUsers();
  res.json(users);
});
router.post("/users", async (req, res) => {
  const user = await createUser(req.body);
  res.json(user);
});
router.put("/users/:id", async (req, res) => {
  const user = await updateUser(req.params.id, req.body);
  res.json(user);
});
router.delete("/users/:id", async (req, res) => {
  const result = await deleteUser(req.params.id);
  res.json(result);
});
var rest_routes_default = router;
router.get("/equipamentos", async (req, res) => {
  const equipamentos = await getEquipamentos();
  res.json(equipamentos);
});
router.get("/equipamentos/:id", async (req, res) => {
  const equipamento = await getEquipamento(req.params.id);
  res.json(equipamento);
});
router.post("/equipamentos", async (req, res) => {
  const equipamento = await createEquipamento(req.body);
  res.json(equipamento);
});
router.put("/equipamentos/:id", async (req, res) => {
  const equipamento = await updateEquipamento(req.params.id, req.body);
  res.json(equipamento);
});
router.delete("/equipamentos/:id", async (req, res) => {
  const result = await deleteEquipamento(req.params.id);
  res.json(result);
});
router.get("/profissionais", async (req, res) => {
  const profissionais = await getProfissionais();
  res.json(profissionais);
});
router.get("/profissionais/:id", async (req, res) => {
  const profissional = await getProfissional(req.params.id);
  res.json(profissional);
});
router.post("/profissionais", async (req, res) => {
  const profissional = await createProfissional(req.body);
  res.json(profissional);
});
router.put("/profissionais/:id", async (req, res) => {
  const profissional = await updateProfissional(req.params.id, req.body);
  res.json(profissional);
});
router.delete("/profissionais/:id", async (req, res) => {
  const result = await deleteProfissional(req.params.id);
  res.json(result);
});
router.get("/tarefas/:tarefaId/equipamentos", async (req, res) => {
  const equipamentos = await getTarefaEquipamentos(req.params.tarefaId);
  res.json(equipamentos);
});
router.post("/tarefas/:tarefaId/equipamentos", async (req, res) => {
  const { equipamentoId } = req.body;
  const result = await addTarefaEquipamento(req.params.tarefaId, equipamentoId);
  res.json(result);
});
router.delete("/tarefas/equipamentos/:id", async (req, res) => {
  const result = await removeTarefaEquipamento(req.params.id);
  res.json(result);
});
router.get("/tarefas/:tarefaId/profissionais", async (req, res) => {
  const profissionais = await getTarefaProfissionais(req.params.tarefaId);
  res.json(profissionais);
});
router.post("/tarefas/:tarefaId/profissionais", async (req, res) => {
  const { profissionalId } = req.body;
  const result = await addTarefaProfissional(req.params.tarefaId, profissionalId);
  res.json(result);
});
router.delete("/tarefas/profissionais/:id", async (req, res) => {
  const result = await removeTarefaProfissional(req.params.id);
  res.json(result);
});
router.get("/tarefas/:tarefaId/condicoes-climaticas", async (req, res) => {
  const condicoes = await getCondicoesClimaticas(req.params.tarefaId);
  res.json(condicoes);
});
router.post("/tarefas/:tarefaId/condicoes-climaticas", async (req, res) => {
  const { condicoes } = req.body;
  const result = await saveCondicoesClimaticas(req.params.tarefaId, condicoes);
  res.json(result);
});
router.get("/condicoes-climaticas/:id", async (req, res) => {
  const condicao = await getCondicaoClimatica(req.params.id);
  res.json(condicao);
});
router.put("/condicoes-climaticas/:id", async (req, res) => {
  const condicao = await updateCondicaoClimatica(req.params.id, req.body);
  res.json(condicao);
});
router.delete("/condicoes-climaticas/:id", async (req, res) => {
  const result = await deleteCondicaoClimatica(req.params.id);
  res.json(result);
});

// server/_core/index.ts
async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(cors({
    origin: (origin, callback) => {
      if (process.env.NODE_ENV !== "production") {
        callback(null, true);
        return;
      }
      const allowedOrigins = ["https://seu-dominio-de-producao.com"];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use("/api", rest_routes_default);
  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
