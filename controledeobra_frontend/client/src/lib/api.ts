import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
});

// Interceptor para adicionar o token no header Authorization
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("app_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiService = {
  auth: {
    me: () => api.get("/auth/me").then(res => res.data),
    login: (data: any) => api.post("/auth/login", data).then(res => {
      if (res.data && res.data.token) {
        localStorage.setItem("app_token", res.data.token);
      }
      return res.data;
    }),
    logout: () => api.post("/auth/logout").then(res => {
      localStorage.removeItem("app_token");
      return res.data;
    }),
  },
  projetos: {
    list: () => api.get("/projetos").then(res => res.data),
    get: (id: string | number) => api.get(`/projetos/${id}`).then(res => res.data),
    create: (data: { nome: string }) => api.post("/projetos", data).then(res => res.data),
    update: (data: { id: string | number; nome: string }) => api.put(`/projetos/${data.id}`, { nome: data.nome }).then(res => res.data),
    delete: (id: string | number) => api.delete(`/projetos/${id}`).then(res => res.data),
  },
  atividades: {
    list: (projetoId: string | number) => api.get(`/atividades?projetoId=${projetoId}`).then(res => res.data),
    get: (id: string | number) => api.get(`/atividades/${id}`).then(res => res.data),
    create: (data: any) => api.post("/atividades", data).then(res => res.data),
    update: (data: any) => api.put(`/atividades/${data.id}`, data).then(res => res.data),
    delete: (id: string | number) => api.delete(`/atividades/${id}`).then(res => res.data),
  },
  subatividades: {
    list: (atividadeId: string | number) => api.get(`/subatividades?atividadeId=${atividadeId}`).then(res => res.data),
    get: (id: string | number) => api.get(`/subatividades/${id}`).then(res => res.data),
    create: (data: any) => api.post("/subatividades", data).then(res => res.data),
    update: (data: any) => api.put(`/subatividades/${data.id}`, data).then(res => res.data),
    delete: (id: string | number) => api.delete(`/subatividades/${id}`).then(res => res.data),
  },
  tarefadiarias: {
    list: (subatividadeId: string | number) => api.get(`/tarefadiarias?subatividadeId=${subatividadeId}`).then(res => res.data),
    get: (id: string | number) => api.get(`/tarefadiarias/${id}`).then(res => res.data),
    create: (data: any) => api.post("/tarefadiarias", data).then(res => res.data),
    update: (data: any) => api.put(`/tarefadiarias/${data.id}`, data).then(res => res.data),
    delete: (id: string | number) => api.delete(`/tarefadiarias/${id}`).then(res => res.data),
  },
  orcamento: {
    list: (subatividadeId: string | number) => api.get(`/orcamento?subatividadeId=${subatividadeId}`).then(res => res.data),
    get: (id: string | number) => api.get(`/orcamento/${id}`).then(res => res.data),
    create: (data: any) => api.post("/orcamento", data).then(res => res.data),
    update: (data: any) => api.put(`/orcamento/${data.id}`, data).then(res => res.data),
    delete: (id: string | number) => api.delete(`/orcamento/${id}`).then(res => res.data),
  },
};
