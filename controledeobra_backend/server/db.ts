import pool from './db_direct';
import { ENV } from './_core/env';

// Enum Role simulado (já que removemos o Prisma)
export enum Role {
  user = 'user',
  admin = 'admin'
}

// Tipos para as funções de usuário
type InsertUser = {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: Role;
  lastSignedIn?: Date;
};

// Helper para converter BigInt para Number ou String para evitar erros de serialização JSON
function serialize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
   if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serialize);
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = serialize(obj[key]);
    }
    return newObj;
  }
  return obj;
}

// Funções de Usuário
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const now = new Date();
  const role = user.role ?? (user.openId === ENV.ownerId ? Role.admin : Role.user);
  
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
    await pool.execute(sql, params);
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(openId: string) {
  console.log(openId);
  const [rows]: any = await pool.execute('SELECT * FROM users WHERE openId = ?', [openId]);
  return rows[0] || null;
}

export async function getUserByEmail(email: string) {
  const [rows]: any = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

// Funções de Projeto
export async function getProjetos() {
  const [rows]: any = await pool.execute('SELECT * FROM projetos ORDER BY created_at DESC');
  return serialize(rows);
}

export async function getProjeto(id: string | number | bigint) {
  const [rows]: any = await pool.execute('SELECT * FROM projetos WHERE id = ?', [id]);
  return serialize(rows[0]) || null;
}

export async function createProjeto(nome: string) {
  const [result]: any = await pool.execute('INSERT INTO projetos (nome, created_at) VALUES (?, NOW())', [nome]);
  return { id: result.insertId.toString(), nome };
}

export async function updateProjeto(id: string | number | bigint, nome: string) {
  await pool.execute('UPDATE projetos SET nome = ? WHERE id = ?', [nome, id]);
  return { id: id.toString(), nome };
}

export async function deleteProjeto(id: string | number | bigint) {
  await pool.execute('DELETE FROM projetos WHERE id = ?', [id]);
  return { id: id.toString() };
}

// Funções de Atividade
export async function getAtividades(projetoId: string | number | bigint) {
  const [rows]: any = await pool.execute('SELECT * FROM atividades WHERE projeto_id = ? ORDER BY created_at DESC', [projetoId]);
  return serialize(rows);
}

export async function getAtividade(id: string | number | bigint) {
  const [rows]: any = await pool.execute('SELECT * FROM atividades WHERE id = ?', [id]);
  return serialize(rows[0]) || null;
}

export async function createAtividade(data: any) {
  const sql = 'INSERT INTO atividades (titulo, descricao, inicio, fim, projeto_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
  const params = [
    data.titulo || null,
    data.descricao || null,
    data.inicio ? new Date(data.inicio) : null,
    data.fim ? new Date(data.fim) : null,
    data.projetoId || data.projeto_id
  ];
  const [result]: any = await pool.execute(sql, params);
  return { id: result.insertId.toString(), ...data };
}

export async function updateAtividade(id: string | number | bigint, data: any) {
  const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
  const params = [...Object.values(data), id];
  await pool.execute(`UPDATE atividades SET ${fields} WHERE id = ?`, params);
  return { id: id.toString(), ...data };
}

export async function deleteAtividade(id: string | number | bigint) {
  await pool.execute('DELETE FROM atividades WHERE id = ?', [id]);
  return { id: id.toString() };
}

// Funções de Subatividade
export async function getSubatividades(atividadeId: string | number | bigint) {
  const [rows]: any = await pool.execute('SELECT * FROM subatividades WHERE atividade_id = ? ORDER BY created_at DESC', [atividadeId]);
  return serialize(rows);
}

export async function getSubatividade(id: string | number | bigint) {
  const [rows]: any = await pool.execute('SELECT * FROM subatividades WHERE id = ?', [id]);
  return serialize(rows[0]) || null;
}

export async function createSubatividade(data: any) {
  const sql = 'INSERT INTO subatividades (titulo, descricao, inicio, fim, status, finalizado, atividade_id, metragem, realizado, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())';
  const params = [
    data.titulo || null,
    data.descricao || null,
    data.inicio ? new Date(data.inicio) : null,
    data.fim ? new Date(data.fim) : null,
    data.status || 0,
    data.finalizado || 0,
    data.atividadeId || data.atividade_id,
    data.metragem || 0,
    data.realizado || 0
  ];
  const [result]: any = await pool.execute(sql, params);
  return { id: result.insertId.toString(), ...data };
}

export async function updateSubatividade(id: string | number | bigint, data: any) {
  const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
  const params = [...Object.values(data), id];
  await pool.execute(`UPDATE subatividades SET ${fields} WHERE id = ?`, params);
  return { id: id.toString(), ...data };
}

export async function deleteSubatividade(id: string | number | bigint) {
  await pool.execute('DELETE FROM subatividades WHERE id = ?', [id]);
  return { id: id.toString() };
}

// Funções de Tarefas Diárias
export async function getTarefasDiarias(subatividadeId: string | number | bigint) {
  const [rows]: any = await pool.execute('SELECT * FROM tarefadiarias WHERE subatividade_id = ? ORDER BY created_at DESC', [subatividadeId]);
  return serialize(rows).map((row: any) => ({
    ...row,
    valorMaoDeObra: row.valor_mao_de_obra || row.valorMaoDeObra,
    subatividadeId: row.subatividade_id || row.subatividadeId,
  }));
}

export async function getTarefaDiaria(id: string | number | bigint) {
  const [rows]: any = await pool.execute('SELECT * FROM tarefadiarias WHERE id = ?', [id]);
  const row = serialize(rows[0]);
  if (!row) return null;
  return {
    ...row,
    valorMaoDeObra: row.valor_mao_de_obra || row.valorMaoDeObra,
    subatividadeId: row.subatividade_id || row.subatividadeId,
  };
}

export async function createTarefaDiaria(data: any) {
  const sql = 'INSERT INTO tarefadiarias (descricao, subatividade_id, realizado, data, valor, valor_mao_de_obra, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())';
  const params = [
    data.descricao || null,
    data.subatividade_id || data.subatividadeId,
    data.realizado || 0,
    data.data ? new Date(data.data) : null,
    parseFloat(data.valor) || 0,
    parseFloat(data.valorMaoDeObra || data.valor_mao_de_obra) || 0
  ];
  const [result]: any = await pool.execute(sql, params);
  return { id: result.insertId.toString(), ...data };
}

export async function updateTarefaDiaria(id: string | number | bigint, data: any) {
  // Mapeia os campos do frontend para os nomes das colunas no banco de dados
  const fieldMapping: Record<string, string> = {
    descricao: 'descricao',
    realizado: 'realizado',
    data: 'data',
    valor: 'valor',
    valorMaoDeObra: 'valor_mao_de_obra',
    valor_mao_de_obra: 'valor_mao_de_obra',
  };

  const updateFields: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    const dbField = fieldMapping[key];
    if (dbField && key !== 'id') {
      updateFields.push(`${dbField} = ?`);
      if (key === 'valor' || key === 'valorMaoDeObra' || key === 'valor_mao_de_obra') {
        params.push(parseFloat(value as any) || 0);
      } else {
        params.push(value);
      }
    }
  }

  if (updateFields.length === 0) return { id: id.toString(), ...data };

  params.push(id);
  await pool.execute(`UPDATE tarefadiarias SET ${updateFields.join(', ')} WHERE id = ?`, params);
  return { id: id.toString(), ...data };
}

export async function deleteTarefaDiaria(id: string | number | bigint) {
  await pool.execute('DELETE FROM tarefadiarias WHERE id = ?', [id]);
  return { id: id.toString() };
}

// Funções de Orçamento
export async function getOrcamentos(subatividadeId: string | number | bigint) {
  const [rows]: any = await pool.execute('SELECT * FROM orcamento WHERE sub_atividade_id = ? ORDER BY created_at DESC', [subatividadeId]);
  return serialize(rows);
}

export async function getOrcamento(id: string | number | bigint) {
  const [rows]: any = await pool.execute('SELECT * FROM orcamento WHERE id = ?', [id]);
  return serialize(rows[0]) || null;
}

export async function createOrcamento(data: any) {
  const sub_atividade_id = data.subatividadeId || data.sub_atividade_id;
  
  // Verifica se já existe um orçamento para esta subatividade
  const [existing]: any = await pool.execute('SELECT id FROM orcamento WHERE sub_atividade_id = ?', [sub_atividade_id]);
  
  if (existing && existing.length > 0) {
    const id = existing[0].id;
    return updateOrcamento(id, data);
  }

  const sql = 'INSERT INTO orcamento (descricao, unidade, qtde, unitario_mao_obra, total_mao_obra, total, sub_atividade_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())';
  const params = [
    data.descricao || null,
    data.unidade || null,
    parseFloat(data.qtde) || 0,
    parseFloat(data.unitarioMaoObra) || 0,
    parseFloat(data.totalMaoObra) || 0,
    parseFloat(data.total) || 0,
    sub_atividade_id
  ];
  const [result]: any = await pool.execute(sql, params);
  return { id: result.insertId.toString(), ...data };
}

export async function updateOrcamento(id: string | number | bigint, data: any) {
  // Mapeia os campos do frontend para os nomes das colunas no banco de dados
  const fieldMapping: Record<string, string> = {
    descricao: 'descricao',
    unidade: 'unidade',
    qtde: 'qtde',
    unitarioMaoObra: 'unitario_mao_obra',
    totalMaoObra: 'total_mao_obra',
    total: 'total',
    sub_atividade_id: 'sub_atividade_id',
    subatividadeId: 'sub_atividade_id'
  };

  const updateFields: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    const dbField = fieldMapping[key];
    if (dbField && key !== 'id') {
      updateFields.push(`${dbField} = ?`);
      params.push(value);
    }
  }

  if (updateFields.length === 0) return { id: id.toString(), ...data };

  params.push(id);
  await pool.execute(`UPDATE orcamento SET ${updateFields.join(', ')} WHERE id = ?`, params);
  return { id: id.toString(), ...data };
}

export async function deleteOrcamento(id: string | number | bigint) {
  await pool.execute('DELETE FROM orcamento WHERE id = ?', [id]);
  return { id: id.toString() };
}

export function getDb() {
  return pool;
}
