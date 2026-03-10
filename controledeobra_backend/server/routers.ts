import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  projetos: router({
    list: publicProcedure.query(() => db.getProjetos()),
    get: publicProcedure.input(z.bigint()).query(({ input }) => db.getProjeto(input)),
    create: protectedProcedure.input(z.object({ nome: z.string() })).mutation(({ input }) => db.createProjeto(input.nome)),
    update: protectedProcedure.input(z.object({ id: z.bigint(), nome: z.string() })).mutation(({ input }) => db.updateProjeto(input.id, input.nome)),
    delete: protectedProcedure.input(z.bigint()).mutation(({ input }) => db.deleteProjeto(input)),
  }),

  atividades: router({
    list: publicProcedure.input(z.bigint()).query(({ input }) => db.getAtividades(input)),
    get: publicProcedure.input(z.bigint()).query(({ input }) => db.getAtividade(input)),
    create: protectedProcedure.input(z.object({
      titulo: z.string(),
      descricao: z.string().optional(),
      inicio: z.string().optional(),
      fim: z.string().optional(),
      projetoId: z.bigint(),
    })).mutation(({ input }) => db.createAtividade(input)),
    update: protectedProcedure.input(z.object({
      id: z.bigint(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      inicio: z.string().optional(),
      fim: z.string().optional(),
    })).mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updateAtividade(id, data);
    }),
    delete: protectedProcedure.input(z.bigint()).mutation(({ input }) => db.deleteAtividade(input)),
  }),

  subatividades: router({
    list: publicProcedure.input(z.bigint()).query(({ input }) => db.getSubatividades(input)),
    get: publicProcedure.input(z.bigint()).query(({ input }) => db.getSubatividade(input)),
    create: protectedProcedure.input(z.object({
      titulo: z.string(),
      descricao: z.string().optional(),
      inicio: z.string().optional(),
      fim: z.string().optional(),
      status: z.bigint().optional(),
      finalizado: z.bigint().optional(),
      atividadeId: z.bigint(),
      metragem: z.bigint().optional(),
      realizado: z.bigint().optional(),
    })).mutation(({ input }) => db.createSubatividade(input)),
    update: protectedProcedure.input(z.object({
      id: z.bigint(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      inicio: z.string().optional(),
      fim: z.string().optional(),
      status: z.bigint().optional(),
      finalizado: z.bigint().optional(),
      metragem: z.bigint().optional(),
      realizado: z.bigint().optional(),
    })).mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updateSubatividade(id, data);
    }),
    delete: protectedProcedure.input(z.bigint()).mutation(({ input }) => db.deleteSubatividade(input)),
  }),

  tarefadiarias: router({
    list: publicProcedure.input(z.bigint()).query(({ input }) => db.getTarefasDiarias(input)),
    get: publicProcedure.input(z.bigint()).query(({ input }) => db.getTarefaDiaria(input)),
    create: protectedProcedure.input(z.object({
      descricao: z.string(),
      subatividadeId: z.bigint(),
      realizado: z.bigint().optional(),
      data: z.string().optional(),
      valor: z.number().optional(),
      valorMaoDeObra: z.number().optional(),
    })).mutation(({ input }) => db.createTarefaDiaria(input)),
    update: protectedProcedure.input(z.object({
      id: z.bigint(),
      descricao: z.string().optional(),
      realizado: z.bigint().optional(),
      data: z.string().optional(),
      valor: z.number().optional(),
      valorMaoDeObra: z.number().optional(),
    })).mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updateTarefaDiaria(id, data);
    }),
    delete: protectedProcedure.input(z.bigint()).mutation(({ input }) => db.deleteTarefaDiaria(input)),
  }),

  orcamento: router({
    list: publicProcedure.input(z.bigint()).query(({ input }) => db.getOrcamentos(input)),
    get: publicProcedure.input(z.bigint()).query(({ input }) => db.getOrcamento(input)),
    create: protectedProcedure.input(z.object({
      descricao: z.string().optional(),
      unidade: z.string().optional(),
      qtde: z.bigint().optional(),
      unitarioMaoObra: z.bigint().optional(),
      totalMaoObra: z.bigint().optional(),
      total: z.bigint().optional(),
      subatividadeId: z.bigint(),
    })).mutation(({ input }) => db.createOrcamento(input)),
    update: protectedProcedure.input(z.object({
      id: z.bigint(),
      descricao: z.string().optional(),
      unidade: z.string().optional(),
      qtde: z.bigint().optional(),
      unitarioMaoObra: z.bigint().optional(),
      totalMaoObra: z.bigint().optional(),
      total: z.bigint().optional(),
    })).mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updateOrcamento(id, data);
    }),
    delete: protectedProcedure.input(z.bigint()).mutation(({ input }) => db.deleteOrcamento(input)),
  }),
});

export type AppRouter = typeof appRouter;

