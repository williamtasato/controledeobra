import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiService } from "@/lib/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";

export default function TarefasPage() {
  const [match, params] = useRoute("/subatividades/:subatividadeId/tarefas");
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const subatividadeId = params?.subatividadeId || "";
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    descricao: "",
    realizado: "",
    data: new Date().toISOString().split("T")[0],
  });

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ["tarefas", subatividadeId],
    queryFn: () => apiService.tarefadiarias.list(subatividadeId),
    enabled: !!subatividadeId,
  });

  // Buscar a subatividade para saber o atividadeId e voltar corretamente
  const { data: subatividade } = useQuery({
    queryKey: ["subatividade", subatividadeId],
    queryFn: () => apiService.subatividades.get(subatividadeId),
    enabled: !!subatividadeId,
  });

  const createMutation = useMutation({
    mutationFn: apiService.tarefadiarias.create,
    onSuccess: () => {
      setFormData({
        descricao: "",
        realizado: "",
        data: new Date().toISOString().split("T")[0],
      });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tarefas", subatividadeId] });
    },
  });

  const handleCreateTarefa = async () => {
    if (formData.descricao.trim()) {
      await createMutation.mutateAsync({
        descricao: formData.descricao,
        realizado: formData.realizado ? parseInt(formData.realizado) : undefined,
        data: formData.data,
        subatividadeId,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-indigo-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-indigo-700"
              onClick={() => {
                // Tenta pegar o atividadeId da subatividade ou do localStorage se disponível
                const atividadeId = subatividade?.atividadeId || localStorage.getItem("last_atividade_id");
                if (atividadeId) {
                  setLocation(`/atividades/${atividadeId}/subatividades`);
                } else {
                  setLocation("/projetos");
                }
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-bold">Tarefas Diárias</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-white border-white hover:bg-indigo-700"
            onClick={() => logout()}
          >
            Sair
          </Button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Tarefas Diárias</h2>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setIsDialogOpen(true)}
          >
            + Nova Tarefa
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando tarefas...</div>
        ) : tarefas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhuma tarefa cadastrada.
          </div>
        ) : (
          <div className="space-y-4">
            {tarefas.map((tarefa: any) => (
              <Card key={tarefa.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{tarefa.descricao}</h3>
                    {tarefa.data && (
                      <p className="text-sm text-gray-500">
                        Data: {new Date(tarefa.data).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                    {tarefa.realizado && (
                      <p className="text-sm text-gray-500">
                        Realizado: {tarefa.realizado}m²
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Tarefa Diária</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Descrição da tarefa"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Metros realizados (m²)"
              value={formData.realizado}
              onChange={(e) => setFormData({ ...formData, realizado: e.target.value })}
            />
            <Input
              type="date"
              value={formData.data}
              onChange={(e) => setFormData({ ...formData, data: e.target.value })}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={handleCreateTarefa}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
