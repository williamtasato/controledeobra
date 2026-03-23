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
import { ChevronLeft, Pencil, Wallet, UserCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SubatividadesPage() {
  const [match, params] = useRoute("/atividades/:atividadeId/subatividades");
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const atividadeId = params?.atividadeId || "";
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    inicio: "",
    fim: "",
    metragem: "",
  });
  const [editingSubatividade, setEditingSubatividade] = useState<any>(null);

  const { data: subatividades = [], isLoading } = useQuery({
    queryKey: ["subatividades", atividadeId],
    queryFn: async () => {
      const result = await apiService.subatividades.list(atividadeId);
      if (atividadeId) {
        localStorage.setItem("last_atividade_id", atividadeId);
      }
      return result;
    },
    enabled: !!atividadeId,
  });

  const { data: atividade } = useQuery({
    queryKey: ["atividade", atividadeId],
    queryFn: () => apiService.atividades.get(atividadeId),
    enabled: !!atividadeId,
  });

  console.log(subatividades);

  const createMutation = useMutation({
    mutationFn: apiService.subatividades.create,
    onSuccess: () => {
      setFormData({ titulo: "", descricao: "", inicio: "", fim: "", metragem: "" });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["subatividades", atividadeId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiService.subatividades.update(data),
    onSuccess: () => {
      setEditingSubatividade(null);
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["subatividades", atividadeId] });
    },
  });

  const validateDates = (inicio: string, fim: string) => {
    if (!atividade) return true;
    const dataInicioSub = new Date(inicio);
    const dataFimSub = new Date(fim);
    const dataInicioAtiv = new Date(atividade.inicio);
    const dataFimAtiv = new Date(atividade.fim);

    if (dataInicioSub < dataInicioAtiv || dataFimSub > dataFimAtiv) {
      toast.error(`As datas devem estar entre ${formatDateForDisplay(atividade.inicio)} e ${formatDateForDisplay(atividade.fim)}`);
      return false;
    }
    return true;
  };

  const handleCreateSubatividade = async () => {
    if (formData.titulo.trim()) {
      if (!validateDates(formData.inicio, formData.fim)) return;
      
      try {
        await createMutation.mutateAsync({
          titulo: formData.titulo,
          descricao: formData.descricao,
          inicio: formData.inicio,
          fim: formData.fim,
          metragem: formData.metragem ? parseInt(formData.metragem) : undefined,
          atividadeId,
        });
        toast.success("Subatividade criada com sucesso!");
      } catch (error: any) {
        toast.error(error.response?.data?.error || "Erro ao criar subatividade");
      }
    }
  };

  const handleUpdateSubatividade = async () => {
    if (editingSubatividade && editingSubatividade.titulo.trim()) {
      if (!validateDates(editingSubatividade.inicio, editingSubatividade.fim)) return;

      try {
        await updateMutation.mutateAsync({
          id: editingSubatividade.id,
          titulo: editingSubatividade.titulo,
          descricao: editingSubatividade.descricao,
          inicio: editingSubatividade.inicio,
          fim: editingSubatividade.fim,
          metragem: editingSubatividade.metragem ? parseInt(editingSubatividade.metragem) : undefined,
          atividadeId: editingSubatividade.atividadeId
        });
        toast.success("Subatividade atualizada com sucesso!");
      } catch (error: any) {
        toast.error(error.response?.data?.error || "Erro ao atualizar subatividade");
      }
    }
  };

  const parseDate = (dateString: any) => {
    if (!dateString) return null;
    if (dateString instanceof Date) return dateString;
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) return date;
    return null;
  };

  const formatDateForDisplay = (dateString: any) => {
    const date = parseDate(dateString);
    if (!date) return "";
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateForInput = (dateString: any) => {
    const date = parseDate(dateString);
    if (!date) return "";
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const openEditDialog = (e: React.MouseEvent, sub: any) => {
    e.stopPropagation();
    const formattedSub = {
      ...sub,
      inicio: formatDateForInput(sub.inicio),
      fim: formatDateForInput(sub.fim),
      metragem: sub.metragem?.toString() || "",
    };
    setEditingSubatividade(formattedSub);
    setIsEditDialogOpen(true);
  };

  const getProgressPercentage = (sub: any) => {
    if (!sub.metragem || sub.metragem === 0) return 0;
    return Math.round((sub.realizado || 0) / sub.metragem * 100);
  };

  const getGastoPercentage = (gasto: number, orcamento: number) => {
    if (!orcamento || orcamento === 0) return 0;
    return Math.min(Math.round((gasto || 0) / orcamento * 100), 100);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
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
                const projetoId = atividade?.projetoId || localStorage.getItem("last_projeto_id");
                if (projetoId) {
                  setLocation(`/projetos/${projetoId}/atividades`);
                } else {
                  setLocation("/projetos");
                }
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-bold">SubAtividades</h1>
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
          <h2 className="text-3xl font-bold text-gray-900">SubAtividades</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["subatividades", atividadeId] });
              }}
            >
              Atualizar Status
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setIsDialogOpen(true)}
            >
              + Nova SubAtividade
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando subatividades...</div>
        ) : subatividades.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhuma subatividade cadastrada.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subatividades.map((sub: any) => {
              const progress = getProgressPercentage(sub);
              const inicioFormatado = formatDateForDisplay(sub.inicio);
              const fimFormatado = formatDateForDisplay(sub.fim);
              
              return (
                <Card
                  key={sub.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer relative group"
                  onClick={() => setLocation(`/subatividades/${sub.id}/tarefas`)}
                >
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                    onClick={(e) => openEditDialog(e, sub)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-orange-200 shadow-sm">
                        <img 
                          src="/images/trabalhador.jpg" 
                          alt="Trabalhador" 
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{sub.titulo}</h3>
                        {sub.status === 1 && (
                          <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-red-200">
                            Atrasada
                          </span>
                        )}
                      </div>
                      {sub.descricao && (
                        <p className="text-gray-600 mb-3 line-clamp-2">{sub.descricao}</p>
                      )}
                      
                      <div className="space-y-3 mb-4">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-gray-600">Progresso Físico</span>
                            <span className="text-xs font-bold text-indigo-600">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-gray-600">Gasto Total vs Orçamento</span>
                            <span className="text-xs font-bold text-emerald-600">
                              {getGastoPercentage(sub.gasto, sub.orcamento_total)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all ${sub.gasto > sub.orcamento_total ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${getGastoPercentage(sub.gasto, sub.orcamento_total)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {formatCurrency(sub.gasto)} / {formatCurrency(sub.orcamento_total)}
                          </p>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-gray-600">Mão de Obra vs Orçado</span>
                            <span className="text-xs font-bold text-orange-600">
                              {getGastoPercentage(sub.gasto_mao_obra, sub.orcamento_mao_obra)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all ${sub.gasto_mao_obra > sub.orcamento_mao_obra ? 'bg-red-500' : 'bg-orange-500'}`}
                              style={{ width: `${getGastoPercentage(sub.gasto_mao_obra, sub.orcamento_mao_obra)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {formatCurrency(sub.gasto_mao_obra)} / {formatCurrency(sub.orcamento_mao_obra)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <p className="text-xs text-gray-500">
                          <span className="font-semibold">Início:</span> {inicioFormatado || "-"}
                        </p>
                        <p className="text-xs text-gray-500">
                          <span className="font-semibold">Fim:</span> {fimFormatado || "-"}
                        </p>
                        {sub.metragem && (
                          <p className="text-xs text-gray-500">
                            <span className="font-semibold">Realizado:</span> {sub.realizado || 0}m² / {sub.metragem}m²
                          </p>
                        )}
                      </div>
    
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/subatividades/${sub.id}/orcamento`);
                          }}
                        >
                          <Wallet className="h-4 w-4" />
                          Orçamento
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Criação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova SubAtividade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Título"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            />
            <Textarea
              placeholder="Descrição"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Metragem (m²)"
              value={formData.metragem}
              onChange={(e) => setFormData({ ...formData, metragem: e.target.value })}
            />
            <Input
              type="date"
              value={formData.inicio}
              onChange={(e) => setFormData({ ...formData, inicio: e.target.value })}
            />
            <Input
              type="date"
              value={formData.fim}
              onChange={(e) => setFormData({ ...formData, fim: e.target.value })}
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
                onClick={handleCreateSubatividade}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar SubAtividade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Título"
              value={editingSubatividade?.titulo || ""}
              onChange={(e) => setEditingSubatividade({ ...editingSubatividade, titulo: e.target.value })}
            />
            <Textarea
              placeholder="Descrição"
              value={editingSubatividade?.descricao || ""}
              onChange={(e) => setEditingSubatividade({ ...editingSubatividade, descricao: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Metragem (m²)"
              value={editingSubatividade?.metragem || ""}
              onChange={(e) => setEditingSubatividade({ ...editingSubatividade, metragem: e.target.value })}
            />
            <Input
              type="date"
              value={editingSubatividade?.inicio || ""}
              onChange={(e) => setEditingSubatividade({ ...editingSubatividade, inicio: e.target.value })}
            />
            <Input
              type="date"
              value={editingSubatividade?.fim || ""}
              onChange={(e) => setEditingSubatividade({ ...editingSubatividade, fim: e.target.value })}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={handleUpdateSubatividade}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
