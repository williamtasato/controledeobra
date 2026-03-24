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
import { ChevronLeft, Edit2, Trash2 } from "lucide-react";

export default function TarefasPage() {
  const [match, params] = useRoute("/subatividades/:subatividadeId/tarefas");
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const subatividadeId = params?.subatividadeId || "";
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    descricao: "",
    realizado: "",
    data: new Date().toISOString().split("T")[0],
    valor: "",
    valorMaoDeObra: "",
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
        valor: "",
        valorMaoDeObra: "",
      });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tarefas", subatividadeId] });
      queryClient.invalidateQueries({ queryKey: ["subatividade", subatividadeId] });
      if (subatividade?.atividadeId) {
        queryClient.invalidateQueries({ queryKey: ["subatividades", subatividade.atividadeId.toString()] });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiService.tarefadiarias.update(data),
    onSuccess: () => {
      setFormData({
        descricao: "",
        realizado: "",
        data: new Date().toISOString().split("T")[0],
        valor: "",
        valorMaoDeObra: "",
      });
      setEditingId(null);
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tarefas", subatividadeId] });
      queryClient.invalidateQueries({ queryKey: ["subatividade", subatividadeId] });
      if (subatividade?.atividadeId) {
        queryClient.invalidateQueries({ queryKey: ["subatividades", subatividade.atividadeId.toString()] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.tarefadiarias.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas", subatividadeId] });
      queryClient.invalidateQueries({ queryKey: ["subatividade", subatividadeId] });
      if (subatividade?.atividadeId) {
        queryClient.invalidateQueries({ queryKey: ["subatividades", subatividade.atividadeId.toString()] });
      }
    },
  });

  const handleCreateTarefa = async () => {
    if (formData.descricao.trim()) {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          descricao: formData.descricao,
          realizado: formData.realizado ? parseInt(formData.realizado) : undefined,
          data: formData.data,
          valor: formData.valor ? parseFloat(formData.valor) : undefined,
          valorMaoDeObra: formData.valorMaoDeObra ? parseFloat(formData.valorMaoDeObra) : undefined,
        });
      } else {
        await createMutation.mutateAsync({
          descricao: formData.descricao,
          realizado: formData.realizado ? parseInt(formData.realizado) : undefined,
          data: formData.data,
          valor: formData.valor ? parseFloat(formData.valor) : undefined,
          valorMaoDeObra: formData.valorMaoDeObra ? parseFloat(formData.valorMaoDeObra) : undefined,
          subatividadeId,
        });
      }
    }
  };

  const handleEditTarefa = (tarefa: any) => {
    setEditingId(tarefa.id);
    setFormData({
      descricao: tarefa.descricao || "",
      realizado: tarefa.realizado ? tarefa.realizado.toString() : "",
      data: formatDateForInput(tarefa.data),
      valor: tarefa.valor ? tarefa.valor.toString() : "",
      valorMaoDeObra: tarefa.valorMaoDeObra || tarefa.valor_mao_de_obra ? (tarefa.valorMaoDeObra || tarefa.valor_mao_de_obra).toString() : "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteTarefa = async (id: string) => {
    if (confirm("Tem certeza que deseja deletar esta tarefa?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  // Funcoes para formatar datas usando apenas string manipulation, sem conversoes de fuso horario
  const formatDateForDisplay = (dateString: any) => {
    if (!dateString) return "";
    // Se for uma string no formato YYYY-MM-DD ou ISO, extrai apenas a parte da data
    const dateOnly = typeof dateString === 'string' ? dateString.split('T')[0] : dateString;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      const [year, month, day] = dateOnly.split('-');
      return `${day}/${month}/${year}`;
    }
    return "";
  };

  const formatDateForInput = (dateString: any) => {
    if (!dateString) return "";
    // Se for uma string no formato YYYY-MM-DD ou ISO, extrai apenas a parte da data
    const dateOnly = typeof dateString === 'string' ? dateString.split('T')[0] : dateString;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return dateOnly;
    }
    return "";
  };

  // Função auxiliar para obter o valor de mão de obra considerando ambos os formatos possíveis
  const getValorMaoDeObra = (tarefa: any): number => {
    const valor = tarefa.valorMaoDeObra || tarefa.valor_mao_de_obra;
    return parseFloat(valor) || 0;
  };

  // Função auxiliar para obter o valor considerando ambos os formatos possíveis
  const getValor = (tarefa: any): number => {
    const valor = tarefa.valor;
    return parseFloat(valor) || 0;
  };

  // Função auxiliar para obter o realizado (m²)
  const getRealizado = (tarefa: any): number => {
    const valor = tarefa.realizado;
    return parseInt(valor) || 0;
  };

  // Calcular o total de mão de obra gasta
  const totalMaoDeObra = (tarefas || []).reduce((acc: number, tarefa: any) => {
    return acc + getValorMaoDeObra(tarefa);
  }, 0);

  // Calcular o total de valor
  const totalValor = (tarefas || []).reduce((acc: number, tarefa: any) => {
    return acc + getValor(tarefa);
  }, 0);

  // Calcular o total realizado (m²)
  const totalRealizado = (tarefas || []).reduce((acc: number, tarefa: any) => {
    return acc + getRealizado(tarefa);
  }, 0);

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
            onClick={() => {
              setEditingId(null);
              setFormData({
                descricao: "",
                realizado: "",
                data: new Date().toISOString().split("T")[0],
                valor: "",
                valorMaoDeObra: "",
              });
              setIsDialogOpen(true);
            }}
          >
            + Nova Tarefa
          </Button>
        </div>

        {!isLoading && tarefas.length > 0 && (
          <Card className="mb-6 p-6 bg-gradient-to-r from-green-50 via-indigo-50 to-blue-50 border-indigo-200">
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 font-medium mb-2">Total Realizado</p>
                <p className="text-3xl font-bold text-green-600">
                  {totalRealizado}
                </p>
                <p className="text-xs text-gray-500 mt-1">m²</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 font-medium mb-2">Total de Mão de Obra</p>
                <p className="text-3xl font-bold text-indigo-600">
                  R$ {totalMaoDeObra.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 font-medium mb-2">Total de Valor</p>
                <p className="text-3xl font-bold text-blue-600">
                  R$ {totalValor.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-12">Carregando tarefas...</div>
        ) : tarefas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhuma tarefa cadastrada.
          </div>
        ) : (
          <div className="space-y-4">
            {tarefas.map((tarefa: any) => (
              <Card key={tarefa.id} className="p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="flex gap-4 items-start">
                  {/* Ícone do Checklist */}
                  <div className="flex-shrink-0">
                    <img 
                      src="/assets/checklist.png" 
                      alt="Checklist" 
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                  
                  {/* Conteúdo da Tarefa */}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{tarefa.descricao}</h3>
                    {tarefa.data && (
                      <p className="text-sm text-gray-500 mb-3">
                        {formatDateForDisplay(tarefa.data)}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                      {getRealizado(tarefa) > 0 && (
                        <span>Realizado: {getRealizado(tarefa)}m²</span>
                      )}
                      {getValor(tarefa) > 0 && (
                        <span>Valor: R$ {getValor(tarefa).toFixed(2)}</span>
                      )}
                      {getValorMaoDeObra(tarefa) > 0 && (
                        <span>M.O.: R$ {getValorMaoDeObra(tarefa).toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Botões de Ação */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-indigo-600 hover:bg-indigo-50"
                      onClick={() => handleEditTarefa(tarefa)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteTarefa(tarefa.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
            <DialogTitle>{editingId ? "Editar Tarefa" : "Nova Tarefa Diária"}</DialogTitle>
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
              type="number"
              placeholder="Valor (R$)"
              step="0.01"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Valor Mão de Obra (R$)"
              step="0.01"
              value={formData.valorMaoDeObra}
              onChange={(e) => setFormData({ ...formData, valorMaoDeObra: e.target.value })}
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
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? (updateMutation.isPending ? "Atualizando..." : "Atualizar") : (createMutation.isPending ? "Criando..." : "Criar")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
