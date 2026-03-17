import { bigint, date, double, float, int, mysqlEnum, mysqlTable, smallint, text, timestamp, tinyint, varchar } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /**
   * Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user.
   * This mirrors the Manus account and should be used for authentication lookups.
   */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  password: text("password"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;


// Tabelas do projeto de controle de obras

export const projetos = mysqlTable("projetos", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  nome: varchar("nome", { length: 255 }),
});

export type Projeto = typeof projetos.$inferSelect;
export type InsertProjeto = typeof projetos.$inferInsert;

export const atividades = mysqlTable("atividades", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  titulo: text("titulo"),
  descricao: text("descricao"),
  inicio: date("inicio"),
  fim: date("fim"),
  projetoId: bigint("projeto_id", { mode: "number" }),
});

export type Atividade = typeof atividades.$inferSelect;
export type InsertAtividade = typeof atividades.$inferInsert;

export const subatividades = mysqlTable("subatividades", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  titulo: text("titulo"),
  descricao: text("descricao"),
  inicio: date("inicio"),
  fim: date("fim"),
  status: tinyint("status"),
  finalizado: tinyint("finalizado").default(0),
  atividadeId: bigint("atividade_id", { mode: "number" }),
  metragem: bigint("metragem", { mode: "number" }),
  realizado: bigint("realizado", { mode: "number" }),
  gasto: double("gasto").default(0),
  gastoMaoObra: double("gasto_mao_obra").default(0),
});

export type Subatividade = typeof subatividades.$inferSelect;
export type InsertSubatividade = typeof subatividades.$inferInsert;

export const tarefadiarias = mysqlTable("tarefadiarias", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  descricao: text("descricao"),
  subatividadeId: bigint("subatividade_id", { mode: "number" }),
  realizado: bigint("realizado", { mode: "number" }),
  data: date("data"),
  valor: double("valor").notNull().default(0),
  valorMaoDeObra: double("valor_mao_de_obra").notNull().default(0),
});

export type TarefaDiaria = typeof tarefadiarias.$inferSelect;
export type InsertTarefaDiaria = typeof tarefadiarias.$inferInsert;

export const orcamento = mysqlTable("orcamento", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  createdAt: timestamp("created_at").defaultNow(),
  descricao: varchar("descricao", { length: 255 }),
  unidade: varchar("unidade", { length: 50 }),
  qtde: smallint("qtde"),
  unitarioMaoObra: float("unitario_mao_obra"),
  totalMaoObra: double("total_mao_obra"),
  total: double("total"),
  subatividadeId: bigint("sub_atividade_id", { mode: "number" }),
});

export type Orcamento = typeof orcamento.$inferSelect;
export type InsertOrcamento = typeof orcamento.$inferInsert;

// Relations
export const projetosRelations = relations(projetos, ({ many }) => ({
  atividades: many(atividades),
}));

export const atividadesRelations = relations(atividades, ({ one, many }) => ({
  projeto: one(projetos, {
    fields: [atividades.projetoId],
    references: [projetos.id],
  }),
  subatividades: many(subatividades),
}));

export const subatividadesRelations = relations(subatividades, ({ one, many }) => ({
  atividade: one(atividades, {
    fields: [subatividades.atividadeId],
    references: [atividades.id],
  }),
  tarefas: many(tarefadiarias),
  orcamentos: many(orcamento),
}));

export const tarefadiariasRelations = relations(tarefadiarias, ({ one }) => ({
  subatividade: one(subatividades, {
    fields: [tarefadiarias.subatividadeId],
    references: [subatividades.id],
  }),
}));

export const orcamentoRelations = relations(orcamento, ({ one }) => ({
  subatividade: one(subatividades, {
    fields: [orcamento.subatividadeId],
    references: [subatividades.id],
  }),
}));

