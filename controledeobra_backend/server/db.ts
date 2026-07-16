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

export async function getUsers() {
  const [rows]: any = await pool.execute('SELECT id, openId, name, email, role, createdAt FROM users ORDER BY createdAt DESC');
  return serialize(rows);
}

export async function createUser(data: any) {
  const now = new Date();
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
    data.role || 'user',
    now,
    now,
    now
  ];
  const [result]: any = await pool.execute(sql, params);
  return { id: result.insertId.toString(), openId, ...data };
}

export async function updateUser(id: string | number | bigint, data: any) {
  const updateFields: string[] = [];
  const params: any[] = [];

  const allowedFields = ['name', 'email', 'password', 'role'];
  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.includes(key)) {
      updateFields.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (updateFields.length === 0) return { id: id.toString(), ...data };

  updateFields.push('updatedAt = NOW()');
  params.push(id);
  await pool.execute(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, params);
  return { id: id.toString(), ...data };
}

export async function deleteUser(id: string | number | bigint) {
  await pool.execute('DELETE FROM users WHERE id = ?', [id]);
  return { id: id.toString() };
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
  const [rows]: any = await pool.execute(sql, [atividadeId]);
  return serialize(rows);
}

export async function getSubatividade(id: string | number | bigint) {
  const [rows]: any = await pool.execute('SELECT * FROM subatividades WHERE id = ?', [id]);
  return serialize(rows[0]) || null;
}

export async function createSubatividade(data: any) {
  const sql = 'INSERT INTO subatividades (titulo, descricao, inicio, fim, status, finalizado, atividade_id, metragem, realizado, gasto, gasto_mao_obra, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())';
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
  const [result]: any = await pool.execute(sql, params);
  return { id: result.insertId.toString(), ...data };
}

export async function updateSubatividade(id: string | number | bigint, data: any) {
  // Mapeia os campos do frontend para os nomes das colunas no banco de dados
  const fieldMapping: Record<string, string> = {
    titulo: 'titulo',
    descricao: 'descricao',
    inicio: 'inicio',
    fim: 'fim',
    status: 'status',
    finalizado: 'finalizado',
    atividadeId: 'atividade_id',
    atividade_id: 'atividade_id',
    metragem: 'metragem',
    realizado: 'realizado',
    gasto: 'gasto',
    gastoMaoObra: 'gasto_mao_obra',
    gasto_mao_obra: 'gasto_mao_obra',
  };

  const updateFields: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    const dbField = fieldMapping[key];
    if (dbField && key !== 'id') {
      updateFields.push(`${dbField} = ?`);
      if (key === 'inicio' || key === 'fim') {
        params.push(value ? new Date(value as string) : null);
      } else {
        params.push(value);
      }
    }
  }

  if (updateFields.length === 0) return { id: id.toString(), ...data };

  params.push(id);
  await pool.execute(`UPDATE subatividades SET ${updateFields.join(', ')} WHERE id = ?`, params);
  return { id: id.toString(), ...data };
}

export async function deleteSubatividade(id: string | number | bigint) {
  await pool.execute('DELETE FROM subatividades WHERE id = ?', [id]);
  return { id: id.toString() };
}

// Função helper para recalcular o status de atraso da subatividade
export async function updateSubatividadeStatus(subatividadeId: string | number | bigint) {
  try {
    // Busca a data de fim da subatividade
    const [subatividades]: any = await pool.execute(
      'SELECT fim FROM subatividades WHERE id = ?',
      [subatividadeId]
    );
    const subatividadeFim = subatividades[0]?.fim;

    // Verifica se existe alguma tarefa com data superior à data fim da subatividade
    let status = 0; // 0 = Normal, 1 = Atrasada
    if (subatividadeFim) {
      const [atrasadas]: any = await pool.execute(
        'SELECT id FROM tarefadiarias WHERE subatividade_id = ? AND DATE(data) > DATE(?) LIMIT 1',
        [subatividadeId, subatividadeFim]
      );
      if (atrasadas && atrasadas.length > 0) {
        status = 1; // Marca como atrasada
      }
    }

    // Atualiza apenas o status da subatividade
    await pool.execute(
      'UPDATE subatividades SET status = ? WHERE id = ?',
      [status, subatividadeId]
    );
  } catch (error) {
    console.error('[Database] Erro ao atualizar status da subatividade:', error);
  }
}

// Função helper para recalcular e atualizar totais na subatividade
async function updateSubatividadeTotals(subatividadeId: string | number | bigint) {
  try {
    // Busca apenas a ÚLTIMA tarefa da subatividade (ordenada por created_at DESC)
    const [tarefas]: any = await pool.execute(
      'SELECT realizado, valor, valor_mao_de_obra FROM tarefadiarias WHERE subatividade_id = ? ORDER BY created_at DESC LIMIT 1',
      [subatividadeId]
    );

    // Se não houver tarefas, usa valores padrão (0)
    let ultimoRealizado = 0;
    let ultimoValor = 0;
    let ultimoValorMaoObra = 0;

    if (tarefas && tarefas.length > 0) {
      const ultimaTarefa = tarefas[0];
      ultimoRealizado = ultimaTarefa.realizado || 0;
      ultimoValor = parseFloat(ultimaTarefa.valor) || 0;
      ultimoValorMaoObra = parseFloat(ultimaTarefa.valor_mao_de_obra) || 0;
    }

    // Atualiza a subatividade com os valores da última tarefa (sem proporção)
    await pool.execute(
      'UPDATE subatividades SET realizado = ?, gasto = ?, gasto_mao_obra = ? WHERE id = ?',
      [ultimoRealizado, ultimoValor, ultimoValorMaoObra, subatividadeId]
    );

    // Atualiza o status de atraso
    await updateSubatividadeStatus(subatividadeId);
  } catch (error) {
    console.error('[Database] Erro ao atualizar totais da subatividade:', error);
    // Não lança erro para não interromper a operação principal
  }
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
  
  // Atualiza os totais da subatividade
  const subatividadeId = data.subatividade_id || data.subatividadeId;
  await updateSubatividadeTotals(subatividadeId);
  
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

  // Busca a subatividade_id antes de atualizar
  const [tarefas]: any = await pool.execute('SELECT subatividade_id FROM tarefadiarias WHERE id = ?', [id]);
  const subatividadeId = tarefas[0]?.subatividade_id;

  params.push(id);
  await pool.execute(`UPDATE tarefadiarias SET ${updateFields.join(', ')} WHERE id = ?`, params);
  
  // Atualiza os totais da subatividade
  if (subatividadeId) {
    await updateSubatividadeTotals(subatividadeId);
  }
  
  return { id: id.toString(), ...data };
}

export async function deleteTarefaDiaria(id: string | number | bigint) {
  // Busca a subatividade_id antes de deletar
  const [tarefas]: any = await pool.execute('SELECT subatividade_id FROM tarefadiarias WHERE id = ?', [id]);
  const subatividadeId = tarefas[0]?.subatividade_id;
  
  await pool.execute('DELETE FROM tarefadiarias WHERE id = ?', [id]);
  
  // Atualiza os totais da subatividade
  if (subatividadeId) {
    await updateSubatividadeTotals(subatividadeId);
  }
  
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
  
  const totalMaterial = (parseFloat(data.unitarioMaterial) || 0) * (parseInt(data.quantidadeMaterial) || 0);
  const total = (parseFloat(data.totalMaoObra) || 0) + totalMaterial;

  const sql = 'INSERT INTO orcamento (descricao, unidade, qtde, unitario_mao_obra, total_mao_obra, total, sub_atividade_id, unitario_material, total_material, tipo_material, quantidade_material, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())';
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
    data.tipoMaterial || '',
    parseInt(data.quantidadeMaterial) || 0
  ];
  const [result]: any = await pool.execute(sql, params);
  
  // Atualiza o orcamento_total
  await updateOrcamentoTotal(sub_atividade_id);
  
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
    subatividadeId: 'sub_atividade_id',
    unitarioMaterial: 'unitario_material',
    totalMaterial: 'total_material',
    tipoMaterial: 'tipo_material',
    quantidadeMaterial: 'quantidade_material'
  };

  const updateFields: string[] = [];
  const params: any[] = [];

  // Recalcula totais se os campos de material ou mão de obra forem alterados
  if (data.unitarioMaterial !== undefined || data.quantidadeMaterial !== undefined || data.totalMaoObra !== undefined) {
    const [current]: any = await pool.execute('SELECT unitario_material, quantidade_material, total_mao_obra FROM orcamento WHERE id = ?', [id]);
    const unitarioMaterial = data.unitarioMaterial !== undefined ? parseFloat(data.unitarioMaterial) : parseFloat(current[0].unitario_material);
    const quantidadeMaterial = data.quantidadeMaterial !== undefined ? parseInt(data.quantidadeMaterial) : parseInt(current[0].quantidade_material);
    const totalMaoObra = data.totalMaoObra !== undefined ? parseFloat(data.totalMaoObra) : parseFloat(current[0].total_mao_obra);
    
    const totalMaterial = unitarioMaterial * quantidadeMaterial;
    const total = totalMaoObra + totalMaterial;
    
    data.totalMaterial = totalMaterial;
    data.total = total;
  }

  for (const [key, value] of Object.entries(data)) {
    const dbField = fieldMapping[key];
    if (dbField && key !== 'id') {
      updateFields.push(`${dbField} = ?`);
      params.push(value);
    }
  }

  if (updateFields.length === 0) return { id: id.toString(), ...data };

  // Busca a sub_atividade_id antes de atualizar
  const [orcamentos]: any = await pool.execute('SELECT sub_atividade_id FROM orcamento WHERE id = ?', [id]);
  const subatividadeId = orcamentos[0]?.sub_atividade_id;

  params.push(id);
  await pool.execute(`UPDATE orcamento SET ${updateFields.join(', ')} WHERE id = ?`, params);
  
  // Atualiza o orcamento_total
  if (subatividadeId) {
    await updateOrcamentoTotal(subatividadeId);
  }
  
  return { id: id.toString(), ...data };
}

export async function deleteOrcamento(id: string | number | bigint) {
  // Busca a sub_atividade_id antes de deletar
  const [orcamentos]: any = await pool.execute('SELECT sub_atividade_id FROM orcamento WHERE id = ?', [id]);
  const subatividadeId = orcamentos[0]?.sub_atividade_id;
  
  await pool.execute('DELETE FROM orcamento WHERE id = ?', [id]);
  
  // Atualiza o orcamento_total
  if (subatividadeId) {
    await updateOrcamentoTotal(subatividadeId);
  }
  
  return { id: id.toString() };
}

// Funções de Orçamento Total
export async function getOrcamentoTotal(subatividadeId: string | number | bigint) {
  const [rows]: any = await pool.execute('SELECT * FROM orcamento_total WHERE sub_atividade_id = ?', [subatividadeId]);
  return serialize(rows[0]) || null;
}

export async function getOrcamentosTotais(subatividadeIds: (string | number | bigint)[]) {
  if (subatividadeIds.length === 0) return [];
  const placeholders = subatividadeIds.map(() => '?').join(',');
  const [rows]: any = await pool.execute(`SELECT * FROM orcamento_total WHERE sub_atividade_id IN (${placeholders})`, subatividadeIds);
  return serialize(rows);
}

// Função helper para recalcular e atualizar o orcamento_total
async function updateOrcamentoTotal(subatividadeId: string | number | bigint) {
  try {
    // Busca todos os orçamentos da subatividade
    const [orcamentos]: any = await pool.execute(
      'SELECT total_mao_obra, total_material, total FROM orcamento WHERE sub_atividade_id = ?',
      [subatividadeId]
    );

    // Calcula os totais
    let totalMaoObra = 0;
    let totalMaterial = 0;
    let total = 0;

    for (const orcamento of orcamentos) {
      totalMaoObra += parseFloat(orcamento.total_mao_obra) || 0;
      totalMaterial += parseFloat(orcamento.total_material) || 0;
      total += parseFloat(orcamento.total) || 0;
    }

    // Verifica se já existe um registro de orcamento_total
    const [existing]: any = await pool.execute(
      'SELECT id FROM orcamento_total WHERE sub_atividade_id = ?',
      [subatividadeId]
    );

    if (existing && existing.length > 0) {
      // Atualiza o registro existente
      await pool.execute(
        'UPDATE orcamento_total SET total_mao_obra = ?, total_material = ?, total = ? WHERE sub_atividade_id = ?',
        [totalMaoObra, totalMaterial, total, subatividadeId]
      );
    } else {
      // Cria um novo registro
      await pool.execute(
        'INSERT INTO orcamento_total (sub_atividade_id, total_mao_obra, total_material, total) VALUES (?, ?, ?, ?)',
        [subatividadeId, totalMaoObra, totalMaterial, total]
      );
    }
  } catch (error) {
    console.error('[Database] Erro ao atualizar orcamento_total:', error);
    // Não lança erro para não interromper a operação principal
  }
}

export function getDb() {
  return pool;
}

// ============================================
// FUNÇÕES DE EQUIPAMENTOS
// ============================================

export async function getEquipamentos() {
  const [rows]: any = await pool.execute('SELECT * FROM equipamentos ORDER BY nome ASC');
  return serialize(rows);
}

export async function getEquipamento(id: string | number | bigint) {
  const [rows]: any = await pool.execute('SELECT * FROM equipamentos WHERE id = ?', [id]);
  return serialize(rows[0]) || null;
}

export async function createEquipamento(data: any) {
  const sql = 'INSERT INTO equipamentos (nome, descricao, created_at) VALUES (?, ?, NOW())';
  const params = [data.nome, data.descricao || null];
  const [result]: any = await pool.execute(sql, params);
  return { id: result.insertId.toString(), ...data };
}

export async function updateEquipamento(id: string | number | bigint, data: any) {
  const sql = 'UPDATE equipamentos SET nome = ?, descricao = ? WHERE id = ?';
  const params = [data.nome, data.descricao || null, id];
  await pool.execute(sql, params);
  return { id: id.toString(), ...data };
}

export async function deleteEquipamento(id: string | number | bigint) {
  await pool.execute('DELETE FROM equipamentos WHERE id = ?', [id]);
  return { id: id.toString() };
}

// ============================================
// FUNÇÕES DE PROFISSIONAIS
// ============================================

export async function getProfissionais() {
  const [rows]: any = await pool.execute('SELECT * FROM profissionais ORDER BY nome ASC');
  return serialize(rows);
}

export async function getProfissional(id: string | number | bigint) {
  const [rows]: any = await pool.execute('SELECT * FROM profissionais WHERE id = ?', [id]);
  return serialize(rows[0]) || null;
}

export async function createProfissional(data: any) {
  const sql = 'INSERT INTO profissionais (nome, tipo, descricao, created_at) VALUES (?, ?, ?, NOW())';
  const params = [data.nome, data.tipo || 'Padrão', data.descricao || null];
  const [result]: any = await pool.execute(sql, params);
  return { id: result.insertId.toString(), ...data };
}

export async function updateProfissional(id: string | number | bigint, data: any) {
  const sql = 'UPDATE profissionais SET nome = ?, tipo = ?, descricao = ? WHERE id = ?';
  const params = [data.nome, data.tipo || 'Padrão', data.descricao || null, id];
  await pool.execute(sql, params);
  return { id: id.toString(), ...data };
}

export async function deleteProfissional(id: string | number | bigint) {
  await pool.execute('DELETE FROM profissionais WHERE id = ?', [id]);
  return { id: id.toString() };
}

// ============================================
// FUNÇÕES DE TAREFA EQUIPAMENTOS
// ============================================

export async function getTarefaEquipamentos(tarefaId: string | number | bigint) {
  const [rows]: any = await pool.execute(
    `SELECT e.* FROM equipamentos e 
     INNER JOIN tarefa_equipamentos te ON e.id = te.equipamento_id 
     WHERE te.tarefa_id = ? 
     ORDER BY e.nome ASC`,
    [tarefaId]
  );
  return serialize(rows);
}

export async function addTarefaEquipamento(tarefaId: string | number | bigint, equipamentoId: string | number | bigint) {
  const sql = 'INSERT INTO tarefa_equipamentos (tarefa_id, equipamento_id, created_at) VALUES (?, ?, NOW())';
  const params = [tarefaId, equipamentoId];
  const [result]: any = await pool.execute(sql, params);
  return { id: result.insertId.toString(), tarefaId, equipamentoId };
}

export async function removeTarefaEquipamento(id: string | number | bigint) {
  await pool.execute('DELETE FROM tarefa_equipamentos WHERE id = ?', [id]);
  return { id: id.toString() };
}

// ============================================
// FUNÇÕES DE TAREFA PROFISSIONAIS
// ============================================

export async function getTarefaProfissionais(tarefaId: string | number | bigint) {
  const [rows]: any = await pool.execute(
    `SELECT p.* FROM profissionais p 
     INNER JOIN tarefa_profissionais tp ON p.id = tp.profissional_id 
     WHERE tp.tarefa_id = ? 
     ORDER BY p.nome ASC`,
    [tarefaId]
  );
  return serialize(rows);
}

export async function addTarefaProfissional(tarefaId: string | number | bigint, profissionalId: string | number | bigint) {
  const sql = 'INSERT INTO tarefa_profissionais (tarefa_id, profissional_id, created_at) VALUES (?, ?, NOW())';
  const params = [tarefaId, profissionalId];
  const [result]: any = await pool.execute(sql, params);
  return { id: result.insertId.toString(), tarefaId, profissionalId };
}

export async function removeTarefaProfissional(id: string | number | bigint) {
  await pool.execute('DELETE FROM tarefa_profissionais WHERE id = ?', [id]);
  return { id: id.toString() };
}

// ============================================
// FUNÇÕES DE CONDIÇÕES CLIMÁTICAS
// ============================================

export async function getCondicoesClimaticas(tarefaId: string | number | bigint) {
  const [rows]: any = await pool.execute(
    'SELECT * FROM condicoes_climaticas WHERE tarefa_id = ? ORDER BY periodo ASC',
    [tarefaId]
  );
  return serialize(rows);
}

export async function saveCondicoesClimaticas(tarefaId: string | number | bigint, condicoes: any[]) {
  try {
    // Deleta as condições existentes
    await pool.execute('DELETE FROM condicoes_climaticas WHERE tarefa_id = ?', [tarefaId]);

    // Insere as novas condições
    for (const condicao of condicoes) {
      const sql = 'INSERT INTO condicoes_climaticas (tarefa_id, periodo, tempo, condicao, created_at) VALUES (?, ?, ?, ?, NOW())';
      const params = [tarefaId, condicao.periodo, condicao.tempo || null, condicao.condicao || null];
      await pool.execute(sql, params);
    }

    return { tarefaId, condicoes };
  } catch (error) {
    console.error('[Database] Erro ao salvar condições climáticas:', error);
    throw error;
  }
}

export async function getCondicaoClimatica(id: string | number | bigint) {
  const [rows]: any = await pool.execute('SELECT * FROM condicoes_climaticas WHERE id = ?', [id]);
  return serialize(rows[0]) || null;
}

export async function updateCondicaoClimatica(id: string | number | bigint, data: any) {
  const sql = 'UPDATE condicoes_climaticas SET tempo = ?, condicao = ? WHERE id = ?';
  const params = [data.tempo || null, data.condicao || null, id];
  await pool.execute(sql, params);
  return { id: id.toString(), ...data };
}

export async function deleteCondicaoClimatica(id: string | number | bigint) {
  await pool.execute('DELETE FROM condicoes_climaticas WHERE id = ?', [id]);
  return { id: id.toString() };
}
