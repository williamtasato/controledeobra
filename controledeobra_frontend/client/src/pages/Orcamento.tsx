import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiService } from "@/lib/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Edit, Wallet, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function OrcamentoPage() {
  const [match, params] = useRoute("/subatividades/:subatividadeId/orcamento");
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const subatividadeId = params?.subatividadeId || "";
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrcamento, setEditingOrcamento] = useState<any>(null);
  const [formData, setFormData] = useState({
    descricao: "",
    unidade: "",
    qtde: "",
    unitarioMaoObra: "",
    totalMaoObra: "",
    unitarioMaterial: "",
    totalMaterial: "",
    tipoMaterial: "",
    total: "",
  });

  const { data: orcamentos = [], isLoading } = useQuery({
    queryKey: ["orcamento", subatividadeId],
    queryFn: () => apiService.orcamento.list(subatividadeId),
    enabled: !!subatividadeId,
  });

  const { data: subatividade } = useQuery({
    queryKey: ["subatividade", subatividadeId],
    queryFn: () => apiService.subatividades.get(subatividadeId),
    enabled: !!subatividadeId,
  });

  // Calcular Total Mão de Obra automaticamente (unitário × quantidade)
  useEffect(() => {
    const unitarioMaoObra = parseFloat(formData.unitarioMaoObra) || 0;
    const qtde = parseFloat(formData.qtde) || 0;
    const totalMaoObra = unitarioMaoObra * qtde;
    
    setFormData(prev => ({
      ...prev,
      totalMaoObra: totalMaoObra.toString()
    }));
  }, [formData.unitarioMaoObra, formData.qtde]);

  // Calcular Total Material automaticamente (unitário × quantidade)
  useEffect(() => {
    const unitarioMaterial = parseFloat(formData.unitarioMaterial) || 0;
    const qtde = parseFloat(formData.qtde) || 0;
    const totalMaterial = unitarioMaterial * qtde;
    
    setFormData(prev => ({
      ...prev,
      totalMaterial: totalMaterial.toString()
    }));
  }, [formData.unitarioMaterial, formData.qtde]);

  // Atualizar total geral automaticamente quando mão de obra ou material mudam
  useEffect(() => {
    const totalMaoObra = parseFloat(formData.totalMaoObra) || 0;
    const totalMaterial = parseFloat(formData.totalMaterial) || 0;
    const novoTotal = totalMaoObra + totalMaterial;
    
    setFormData(prev => ({
      ...prev,
      total: novoTotal.toString()
    }));
  }, [formData.totalMaoObra, formData.totalMaterial]);

  useEffect(() => {
    if (editingOrcamento) {
      setFormData({
        descricao: editingOrcamento.descricao || "",
        unidade: editingOrcamento.unidade || "",
        qtde: editingOrcamento.qtde?.toString() || "",
        unitarioMaoObra: editingOrcamento.unitario_mao_obra?.toString() || "",
        totalMaoObra: editingOrcamento.total_mao_obra?.toString() || "",
        unitarioMaterial: editingOrcamento.unitario_material?.toString() || "",
        totalMaterial: editingOrcamento.total_material?.toString() || "",
        tipoMaterial: editingOrcamento.tipo_material || "",
        total: editingOrcamento.total?.toString() || "",
      });
    } else {
      setFormData({
        descricao: "",
        unidade: "",
        qtde: "",
        unitarioMaoObra: "",
        totalMaoObra: "",
        unitarioMaterial: "",
        totalMaterial: "",
        tipoMaterial: "",
        total: "",
      });
    }
  }, [editingOrcamento, isDialogOpen]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingOrcamento) {
        return apiService.orcamento.update({ id: editingOrcamento.id, ...data });
      }
      return apiService.orcamento.create(data);
    },
    onSuccess: () => {
      setIsDialogOpen(false);
      setEditingOrcamento(null);
      queryClient.invalidateQueries({ queryKey: ["orcamento", subatividadeId] });
      queryClient.invalidateQueries({ queryKey: ["subatividades"] });
      toast.success(editingOrcamento ? "Orçamento atualizado!" : "Orçamento adicionado!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.orcamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orcamento", subatividadeId] });
      queryClient.invalidateQueries({ queryKey: ["subatividades"] });
      toast.success("Orçamento removido!");
    },
  });

  const handleSaveOrcamento = async () => {
    if (formData.descricao.trim()) {
      const totalMaoObra = parseFloat(formData.totalMaoObra) || 0;
      const totalMaterial = parseFloat(formData.totalMaterial) || 0;
      const total = totalMaoObra + totalMaterial;

      await saveMutation.mutateAsync({
        descricao: formData.descricao,
        unidade: formData.unidade || "",
        qtde: parseFloat(formData.qtde) || 0,
        unitarioMaoObra: parseFloat(formData.unitarioMaoObra) || 0,
        totalMaoObra: totalMaoObra,
        unitarioMaterial: parseFloat(formData.unitarioMaterial) || 0,
        totalMaterial: totalMaterial,
        tipoMaterial: formData.tipoMaterial || "",
        total: total,
        subatividadeId,
      });
    }
  };

  // Calcular totais
  const totalMaoObra = orcamentos.reduce((acc: number, curr: any) => acc + (parseFloat(curr.total_mao_obra) || 0), 0);
  const totalMaterial = orcamentos.reduce((acc: number, curr: any) => acc + (parseFloat(curr.total_material) || 0), 0);
  const totalGeral = totalMaoObra + totalMaterial;

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
                 if (subatividade?.atividade_id) {
                   localStorage.setItem("last_atividade_id", subatividade.atividade_id.toString());
                   setLocation(`/atividades/${subatividade.atividade_id}/subatividades`);
                 } else {
                   setLocation("/projetos");
                 }
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-bold">Orçamentos</h1>
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Orçamentos da Subatividade</h2>
            <p className="text-gray-500">{subatividade?.titulo || "Carregando..."}</p>
          </div>
          {!isLoading && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 flex-1 md:flex-none gap-2"
              onClick={() => {
                setEditingOrcamento(null);
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Adicionar Orçamento
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando orçamentos...</div>
        ) : orcamentos.length === 0 ? (
          <Card className="p-12 text-center text-gray-500 bg-white">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Nenhum orçamento definido para esta subatividade.</p>
            <p className="text-sm">Clique em "Adicionar Orçamento" para começar.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 bg-white shadow-md border-t-4 border-orange-500">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Total Mão de Obra</h3>
                <p className="text-3xl font-bold text-orange-600">
                  R$ {totalMaoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </Card>

              <Card className="p-6 bg-white shadow-md border-t-4 border-green-500">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Total Materiais</h3>
                <p className="text-3xl font-bold text-green-600">
                  R$ {totalMaterial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </Card>

              <Card className="p-6 bg-indigo-600 text-white shadow-md border-t-4 border-indigo-700">
                <h3 className="text-sm font-semibold uppercase mb-2 opacity-80">Total Geral</h3>
                <p className="text-3xl font-bold">
                  R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </Card>
            </div>

            {/* Lista de Orçamentos */}
            <div className="grid grid-cols-1 gap-4">
              {orcamentos.map((orc: any) => (
                <Card key={orc.id} className="p-4 bg-white shadow-md border-l-4 border-indigo-600 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900">{orc.descricao}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                      <div>
                        <span className="block font-semibold text-gray-400 uppercase text-[10px]">Qtd/Unid</span>
                        {orc.qtde} {orc.unidade}
                      </div>
                      <div>
                        <span className="block font-semibold text-gray-400 uppercase text-[10px]">Mão de Obra</span>
                        R$ {Number(orc.total_mao_obra).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div>
                        <span className="block font-semibold text-gray-400 uppercase text-[10px]">Material</span>
                        R$ {Number(orc.total_material).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div>
                        <span className="block font-semibold text-gray-400 uppercase text-[10px]">Total Item</span>
                        <span className="font-bold text-indigo-600">R$ {Number(orc.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-indigo-600 border-indigo-600"
                      onClick={() => {
                        setEditingOrcamento(orc);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-red-600 border-red-600"
                      onClick={() => {
                        if (confirm("Deseja realmente excluir este orçamento?")) {
                          deleteMutation.mutate(orc.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrcamento ? "Editar Orçamento" : "Novo Orçamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Input
                placeholder="Ex: Orçamento base da subatividade"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Unidade</label>
                <Input
                  placeholder="Ex: m², kg, un"
                  value={formData.unidade}
                  onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantidade</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.qtde}
                  onChange={(e) => setFormData({ ...formData, qtde: e.target.value })}
                />
              </div>
            </div>

            {/* Seção Mão de Obra */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Mão de Obra</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unitário (R$)</label>
                  <Input
                    type="number"
                    placeholder="0,00"
                    step="0.01"
                    value={formData.unitarioMaoObra}
                    onChange={(e) => setFormData({ ...formData, unitarioMaoObra: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total (R$)</label>
                  <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 font-semibold">
                    R$ {(parseFloat(formData.totalMaoObra) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Seção Materiais */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Materiais</h4>
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium">Tipo de Material</label>
                <Input
                  placeholder="Ex: Cimento, Areia, etc"
                  value={formData.tipoMaterial}
                  onChange={(e) => setFormData({ ...formData, tipoMaterial: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unitário (R$)</label>
                  <Input
                    type="number"
                    placeholder="0,00"
                    step="0.01"
                    value={formData.unitarioMaterial}
                    onChange={(e) => setFormData({ ...formData, unitarioMaterial: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total (R$)</label>
                  <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 font-semibold">
                    R$ {(parseFloat(formData.totalMaterial) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Seção Total */}
            <div className="border-t pt-4 bg-indigo-50 p-4 rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Total do Item (Calculado Automaticamente)</label>
                <div className="text-3xl font-bold text-indigo-600">
                  R$ {(parseFloat(formData.total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500">
                  Soma de Mão de Obra (R$ {(parseFloat(formData.totalMaoObra) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) + Materiais (R$ {(parseFloat(formData.totalMaterial) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingOrcamento(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={handleSaveOrcamento}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Salvando..." : (editingOrcamento ? "Salvar Alterações" : "Adicionar Orçamento")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
