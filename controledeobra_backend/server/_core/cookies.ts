import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const isSecure = isSecureRequest(req);
  const isLocalhost = LOCAL_HOSTS.has(req.hostname);
  
  // Regras claras:
  // 1. Se for localhost: always lax + secure=false
  // 2. Se for produção com HTTPS: none + secure=true
  // 3. Se for produção sem HTTPS (raro): lax + secure=false
  
  let sameSite: "lax" | "none" | "strict" = "lax";
  
  if (!isLocalhost && isSecure) {
    // Em produção com HTTPS, usamos 'none' para permitir cross-site
    // Isso é essencial se o frontend e backend estiverem em domínios diferentes
    sameSite = "none";
  }
  
  // Se sameSite for 'none', secure DEVE ser true
  const secure = sameSite === "none" ? true : isSecure;
  
  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure,
  };
}