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
import { EquipamentoSelector } from "@/components/EquipamentoSelector";
import { ProfissionalSelector } from "@/components/ProfissionalSelector";
import { CondicoesClimaticasForm } from "@/components/CondicoesClimaticasForm";
import { StatusDetailedSelector } from "@/components/StatusDetailedSelector";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TarefasPage() {
  const [match, params] = useRoute("/subatividades/:subatividadeId/tarefas");
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const subatividadeId = params?.subatividadeId || "";
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tarefaAtualId, setTarefaAtualId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    descricao: "", realizado: "", percentual: "",
    data: new Date().toISOString().split("T")[0],
    valor: "", valorMaoDeObra: "", statusDetalhado: "Em andamento",
  });

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ["tarefas", subatividadeId],
    queryFn: () => apiService.tarefadiarias.list(subatividadeId),
    enabled: !!subatividadeId,
  });

  const { data: subatividade } = useQuery({
    queryKey: ["subatividade", subatividadeId],
    queryFn: () => apiService.subatividades.get(subatividadeId),
    enabled: !!subatividadeId,
  });

  const { data: orcamentoTotal } = useQuery({
    queryKey: ["orcamento-total", subatividadeId],
    queryFn: () => apiService.orcamentoTotal.get(subatividadeId),
    enabled: !!subatividadeId,
  });

  const handleRealizadoChange = (value: string) => {
    const realizado = parseFloat(value) || 0;
    const metragem = parseFloat(subatividade?.metragem) || 0;
    let percentual = metragem > 0 ? ((realizado / metragem) * 100).toFixed(2) : "";
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
    setFormData(prev => ({
      ...prev,
      realizado: realizadoStr,
      percentual: percentual,
      valor: (orcamentoValor * proporcao).toFixed(2),
      valorMaoDeObra: (orcamentoMaoObra * proporcao).toFixed(2)
    }));
  };

  const createMutation = useMutation({
    mutationFn: apiService.tarefadiarias.create,
    onSuccess: (newTarefa) => {
      queryClient.invalidateQueries({ queryKey: ["tarefas", subatividadeId] });
      queryClient.invalidateQueries({ queryKey: ["subatividade", subatividadeId] });
      if (subatividade?.atividadeId) {
        queryClient.invalidateQueries({ queryKey: ["subatividades", subatividade.atividadeId.toString()] });
      }
      if (newTarefa && newTarefa.id) {
        const newId = newTarefa.id.toString();
        setEditingId(newId);
        setTarefaAtualId(newId);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiService.tarefadiarias.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas", subatividadeId] });
      queryClient.invalidateQueries({ queryKey: ["subatividade", subatividadeId] });
      if (subatividade?.atividadeId) {
        queryClient.invalidateQueries({ queryKey: ["subatividades", subatividade.atividadeId.toString()] });
      }
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      descricao: "", realizado: "", percentual: "",
      data: new Date().toISOString().split("T")[0],
      valor: "", valorMaoDeObra: "", statusDetalhado: "Em andamento",
    });
    setTarefaAtualId(null);
    setEditingId(null);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.tarefadiarias.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tarefas", subatividadeId] });
    },
  });

  const handleSave = async () => {
    if (!formData.descricao.trim()) return;
    const payload = {
      descricao: formData.descricao,
      realizado: formData.realizado ? parseFloat(formData.realizado) : 0,
      data: formData.data,
      valor: formData.valor ? parseFloat(formData.valor) : 0,
      valorMaoDeObra: formData.valorMaoDeObra ? parseFloat(formData.valorMaoDeObra) : 0,
      statusDetalhado: formData.statusDetalhado
    };

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...payload });
    } else {
      await createMutation.mutateAsync({ ...payload, subatividadeId });
    }
  };

  const handleEditTarefa = (tarefa: any) => {
    const tId = tarefa.id.toString();
    setEditingId(tId);
    setTarefaAtualId(tId);
    const realizado = parseFloat(tarefa.realizado) || 0;
    const metragem = parseFloat(subatividade?.metragem) || 0;
    setFormData({
      descricao: tarefa.descricao || "",
      realizado: tarefa.realizado ? tarefa.realizado.toString() : "",
      percentual: metragem > 0 ? ((realizado / metragem) * 100).toFixed(2) : "",
      data: formatDateForInput(tarefa.data),
      valor: tarefa.valor ? tarefa.valor.toString() : "",
      valorMaoDeObra: (tarefa.valorMaoDeObra || tarefa.valor_mao_de_obra || 0).toString(),
      statusDetalhado: tarefa.statusDetalhado || "Em andamento",
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
    return typeof dateString === 'string' ? dateString.split('T')[0] : dateString;
  };

  const totalMaoDeObra = tarefas.length > 0 ? parseFloat(tarefas[0].valorMaoDeObra || tarefas[0].valor_mao_de_obra || 0) : 0;
  const totalValor = tarefas.length > 0 ? parseFloat(tarefas[0].valor || 0) : 0;
  const totalRealizado = tarefas.length > 0 ? parseFloat(tarefas[0].realizado || 0) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-indigo-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-indigo-700" onClick={() => setLocation(`/atividades/${subatividade?.atividadeId}/subatividades`)}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-bold">Tarefas Diárias</h1>
          </div>
          <Button variant="outline" size="sm" className="text-white border-white hover:bg-indigo-700" onClick={() => logout()}>Sair</Button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Tarefas Diárias</h2>
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { resetForm(); setIsDialogOpen(true); }}>+ Nova Tarefa</Button>
        </div>

        {!isLoading && tarefas.length > 0 && (
          <div className="space-y-4 mb-6">
            <Card className="p-6 bg-gradient-to-r from-green-50 via-indigo-50 to-blue-50 border-indigo-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div><p className="text-sm text-gray-600 font-medium mb-2">Total Realizado</p><p className="text-3xl font-bold text-green-600">{totalRealizado} m²</p></div>
                <div><p className="text-sm text-gray-600 font-medium mb-2">Total Mão de Obra</p><p className="text-3xl font-bold text-indigo-600">R$ {totalMaoDeObra.toFixed(2)}</p></div>
                <div><p className="text-sm text-gray-600 font-medium mb-2">Total Valor</p><p className="text-3xl font-bold text-blue-600">R$ {totalValor.toFixed(2)}</p></div>
              </div>
            </Card>
          </div>
        )}

        <div className="space-y-4">
          {tarefas.map((tarefa: any) => (
            <Card key={tarefa.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="bg-gray-100 p-3 rounded-full"><Edit2 className="h-6 w-6 text-gray-400" /></div>
                  <div>
                    <h3 className="text-lg font-bold">{tarefa.descricao}</h3>
                    <p className="text-sm text-gray-500">{formatDateForDisplay(tarefa.data)}</p>
                    <div className="flex gap-4 mt-2 text-xs font-medium text-gray-600">
                      <span>Realizado: {tarefa.realizado}m²</span>
                      <span>Valor: R$ {parseFloat(tarefa.valor).toFixed(2)}</span>
                      <span>M.O.: R$ {parseFloat(tarefa.valorMaoDeObra || tarefa.valor_mao_de_obra || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditTarefa(tarefa)}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDeleteTarefa(tarefa.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if(!open) resetForm(); setIsDialogOpen(open); }}>
        <DialogContent className="max-w-3xl w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 border-b shrink-0">
            <DialogTitle className="text-xl font-bold text-gray-800">
              {editingId ? "Editar Relatório Diário" : "Novo Relatório Diário"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
            <div className="space-y-8 max-w-2xl mx-auto">
              {/* Seção 1: Dados Básicos */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 border-b pb-1">Informações da Atividade</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Descrição do que foi feito</label>
                    <Textarea 
                      placeholder="Descreva as atividades realizadas hoje..."
                      className="bg-white min-h-[80px]"
                      value={formData.descricao} 
                      onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Realizado (m²)</label>
                    <Input type="number" className="bg-white" value={formData.realizado} onChange={(e) => handleRealizadoChange(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Percentual (%)</label>
                    <Input type="number" className="bg-white" value={formData.percentual} onChange={(e) => handlePercentualChange(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Data do Registro</label>
                    <Input type="date" className="bg-white" value={formData.data} onChange={(e) => setFormData({...formData, data: e.target.value})} />
                  </div>
                  <div>
                    <StatusDetailedSelector value={formData.statusDetalhado} onChange={(val) => setFormData({...formData, statusDetalhado: val})} />
                  </div>
                </div>
              </div>

              {/* Seção 2: Recursos e Clima (Apenas se tiver ID) */}
              {tarefaAtualId ? (
                <div className="space-y-8 pt-4">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 border-b pb-1">Recursos Utilizados</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <label className="text-xs font-bold text-gray-700 mb-3 block">Equipamentos na Obra</label>
                        <EquipamentoSelector tarefaId={tarefaAtualId} />
                      </div>
                      <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <label className="text-xs font-bold text-gray-700 mb-3 block">Mão de Obra / Equipe</label>
                        <ProfissionalSelector tarefaId={tarefaAtualId} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-600 border-b pb-1">Condições Climáticas</h3>
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <CondicoesClimaticasForm tarefaId={tarefaAtualId} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-xl text-center">
                  <p className="text-sm text-indigo-700 font-medium">
                    Para registrar Equipamentos, Profissionais e Clima, <br/>primeiro salve as informações básicas acima.
                  </p>
                  <Button 
                    className="mt-4 bg-indigo-600 hover:bg-indigo-700 px-6" 
                    onClick={handleSave} 
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Salvando..." : "Salvar e Continuar Preenchimento"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t bg-white shrink-0 flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            {editingId && (
              <Button className="bg-indigo-600 hover:bg-indigo-700 px-10 font-bold" onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Finalizar Relatório"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
