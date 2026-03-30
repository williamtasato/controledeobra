import { useState, useEffect } from "react";
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
    percentual: "",
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

  // Buscar o orçamento total da subatividade
  const { data: orcamentoTotal } = useQuery({
    queryKey: ["orcamento-total", subatividadeId],
    queryFn: () => apiService.orcamentoTotal.get(subatividadeId),
    enabled: !!subatividadeId,
  });

  // Lógica de cálculo bidirecional e proporcional
  const handleRealizadoChange = (value: string) => {
    const realizado = parseFloat(value) || 0;
    const metragem = parseFloat(subatividade?.metragem) || 0;
    
    let percentual = "";
    if (metragem > 0) {
      percentual = ((realizado / metragem) * 100).toFixed(2);
    }

    updateValoresProporcionais(realizado, percentual, value);
  };

  const handlePercentualChange = (value: string) => {
    const percentual = parseFloat(value) || 0;
    const metragem = parseFloat(subatividade?.metragem) || 0;
    
    const realizado = (percentual / 100) * metragem;
    const realizadoStr = realizado % 1 === 0 ? realizado.toString() : realizado.toFixed(2);

    updateValoresProporcionais(realizado, value, realizadoStr);
  };

  const updateValoresProporcionais = (realizado: number, percentual: string, realizadoStr: string) => {
    const metragem = parseFloat(subatividade?.metragem) || 0;
    const orcamentoValor = parseFloat(orcamentoTotal?.total) || 0;
    const orcamentoMaoObra = parseFloat(orcamentoTotal?.total_mao_obra) || 0;

    const proporcao = metragem > 0 ? realizado / metragem : 0;
    const valorCalculado = orcamentoValor * proporcao;
    const maoObraCalculada = orcamentoMaoObra * proporcao;

    setFormData(prev => ({
      ...prev,
      realizado: realizadoStr,
      percentual: percentual,
      valor: valorCalculado.toFixed(2),
      valorMaoDeObra: maoObraCalculada.toFixed(2)
    }));
  };

  const createMutation = useMutation({
    mutationFn: apiService.tarefadiarias.create,
    onSuccess: () => {
      resetForm();
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
      resetForm();
      setEditingId(null);
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tarefas", subatividadeId] });
      queryClient.invalidateQueries({ queryKey: ["subatividade", subatividadeId] });
      if (subatividade?.atividadeId) {
        queryClient.invalidateQueries({ queryKey: ["subatividades", subatividade.atividadeId.toString()] });
      }
    },
  });

  const resetForm = () => {
    setFormData({
      descricao: "",
      realizado: "",
      percentual: "",
      data: new Date().toISOString().split("T")[0],
      valor: "",
      valorMaoDeObra: "",
    });
  };

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
      const payload = {
        descricao: formData.descricao,
        realizado: formData.realizado ? parseFloat(formData.realizado) : 0,
        data: formData.data,
        valor: formData.valor ? parseFloat(formData.valor) : 0,
        valorMaoDeObra: formData.valorMaoDeObra ? parseFloat(formData.valorMaoDeObra) : 0,
      };

      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...payload
        });
      } else {
        await createMutation.mutateAsync({
          ...payload,
          subatividadeId,
        });
      }
    }
  };

  const handleEditTarefa = (tarefa: any) => {
    setEditingId(tarefa.id);
    const realizado = parseFloat(tarefa.realizado) || 0;
    const metragem = parseFloat(subatividade?.metragem) || 0;
    const percentual = metragem > 0 ? ((realizado / metragem) * 100).toFixed(2) : "";

    setFormData({
      descricao: tarefa.descricao || "",
      realizado: tarefa.realizado ? tarefa.realizado.toString() : "",
      percentual: percentual,
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

  const formatDateForDisplay = (dateString: any) => {
    if (!dateString) return "";
    const dateOnly = typeof dateString === 'string' ? dateString.split('T')[0] : dateString;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      const [year, month, day] = dateOnly.split('-');
      return `${day}/${month}/${year}`;
    }
    return "";
  };

  const formatDateForInput = (dateString: any) => {
    if (!dateString) return "";
    const dateOnly = typeof dateString === 'string' ? dateString.split('T')[0] : dateString;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      return dateOnly;
    }
    return "";
  };

  const getValorMaoDeObra = (tarefa: any): number => {
    const valor = tarefa.valorMaoDeObra || tarefa.valor_mao_de_obra;
    return parseFloat(valor) || 0;
  };

  const getValor = (tarefa: any): number => {
    const valor = tarefa.valor;
    return parseFloat(valor) || 0;
  };

  const getRealizado = (tarefa: any): number => {
    const valor = tarefa.realizado;
    return parseFloat(valor) || 0;
  };

  const ultimaTarefa = tarefas && tarefas.length > 0 ? tarefas[0] : null;

  const totalMaoDeObra = ultimaTarefa ? getValorMaoDeObra(ultimaTarefa) : 0;
  const totalValor = ultimaTarefa ? getValor(ultimaTarefa) : 0;
  const totalRealizado = ultimaTarefa ? getRealizado(ultimaTarefa) : 0;

  const calcularDiasSubatividade = () => {
    if (!subatividade?.inicio || !subatividade?.fim) return 0;
    const dataInicio = new Date(subatividade.inicio);
    const dataFim = new Date(subatividade.fim);
    const diffTime = Math.abs(dataFim.getTime() - dataInicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const totalDias = calcularDiasSubatividade();
  const metaDiaria = totalDias > 0 && subatividade?.metragem ? subatividade.metragem / totalDias : 0;

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
              resetForm();
              setIsDialogOpen(true);
            }}
          >
            + Nova Tarefa
          </Button>
        </div>

        {!isLoading && tarefas.length > 0 && (
          <div className="space-y-4 mb-6">
            <Card className="p-6 bg-gradient-to-r from-green-50 via-indigo-50 to-blue-50 border-indigo-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 bg-white border-l-4 border-purple-500 shadow-sm">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Duração da Subatividade</p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalDias} {totalDias === 1 ? 'Dia' : 'Dias'}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Período: {formatDateForDisplay(subatividade?.inicio)} até {formatDateForDisplay(subatividade?.fim)}
                </p>
              </Card>

              <Card className="p-4 bg-white border-l-4 border-cyan-500 shadow-sm">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Meta Diária</p>
                <p className="text-2xl font-bold text-cyan-600">
                  {metaDiaria.toFixed(2)} m²
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {subatividade?.metragem} m² ÷ {totalDias} dias
                </p>
              </Card>
            </div>
          </div>
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
                  <div className="flex-shrink-0">
                    <img 
                      src="/assets/checklist.png" 
                      alt="Checklist" 
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                  
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
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                placeholder="Descrição da tarefa"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Percentual Realizado (%)</label>
                <Input
                  type="number"
                  placeholder="Ex: 50"
                  value={formData.percentual}
                  onChange={(e) => handlePercentualChange(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Realizado (m²)</label>
                <Input
                  type="number"
                  placeholder="Ex: 100"
                  value={formData.realizado}
                  onChange={(e) => handleRealizadoChange(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Valor (R$) - Calculado Automaticamente</label>
              <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 font-semibold">
                R$ {(parseFloat(formData.valor) || 0).toFixed(2)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Valor Mão de Obra (R$) - Calculado Automaticamente</label>
              <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 font-semibold">
                R$ {(parseFloat(formData.valorMaoDeObra) || 0).toFixed(2)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Data</label>
              <Input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              />
            </div>
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
