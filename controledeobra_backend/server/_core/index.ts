import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";

import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import restRoutes from "../rest_routes";




async function startServer() {
  const app = express();
  const server = createServer(app);
  // CORS configuration to allow frontend to connect
  app.use(cors({
    origin: (origin, callback) => {
      // Em desenvolvimento, permite qualquer origem
      if (process.env.NODE_ENV !== "production") {
        callback(null, true);
        return;
      }
      
      // Em produção, ajuste para o seu domínio real
      const allowedOrigins = ["https://seu-dominio-de-producao.com"];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }));

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // REST API
  app.use("/api", restRoutes);

  // tRPC API (mantendo por compatibilidade temporária se necessário, mas o foco é REST)
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Frontend is now separate, no need to serve static files or use Vite

  const port = parseInt(process.env.PORT || "3000");

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
