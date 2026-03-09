import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiService } from "@/lib/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Edit, Wallet,Plus } from "lucide-react";

export default function OrcamentoPage() {
  const [match, params] = useRoute("/subatividades/:subatividadeId/orcamento");
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const subatividadeId = params?.subatividadeId || "";
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    descricao: "",
    unidade: "",
    qtde: "",
    unitarioMaoObra: "",
    totalMaoObra: "",
    total: "",
  });

  const { data: orcamentos = [], isLoading } = useQuery({
    queryKey: ["orcamento", subatividadeId],
    queryFn: () => apiService.orcamento.list(subatividadeId),
    enabled: !!subatividadeId,
  });

  // Pega o primeiro (e único) orçamento da lista
  const orcamentoUnico = orcamentos.length > 0 ? orcamentos[0] : null;

  const { data: subatividade } = useQuery({
    queryKey: ["subatividade", subatividadeId],
    queryFn: () => apiService.subatividades.get(subatividadeId),
    enabled: !!subatividadeId,
  });

  useEffect(() => {
    if (orcamentoUnico && isDialogOpen) {
      setFormData({
        descricao: orcamentoUnico.descricao || "",
        unidade: orcamentoUnico.unidade || "",
        qtde: orcamentoUnico.qtde?.toString() || "",
        unitarioMaoObra: orcamentoUnico.unitario_mao_obra?.toString() || "",
        totalMaoObra: orcamentoUnico.total_mao_obra?.toString() || "",
        total: orcamentoUnico.total?.toString() || "",
      });
    }
  }, [orcamentoUnico, isDialogOpen]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (orcamentoUnico) {
        return apiService.orcamento.update({ id: orcamentoUnico.id, ...data });
      }
      return apiService.orcamento.create(data);
    },
    onSuccess: () => {
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["orcamento", subatividadeId] });
    },
  });

  const handleSaveOrcamento = async () => {
    if (formData.descricao.trim()) {
      await saveMutation.mutateAsync({
        descricao: formData.descricao,
        unidade: formData.unidade || "",
        qtde: parseFloat(formData.qtde) || 0,
        unitarioMaoObra: parseFloat(formData.unitarioMaoObra) || 0,
        totalMaoObra: parseFloat(formData.totalMaoObra) || 0,
        total: parseFloat(formData.total) || 0,
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
                if (subatividade?.atividadeId) {
                  setLocation(`/atividades/${subatividade.atividadeId}/subatividades`);
                } else {
                  setLocation("/projetos");
                }
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-bold">Orçamento Único</h1>
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
            <h2 className="text-3xl font-bold text-gray-900">Orçamento da Subatividade</h2>
            <p className="text-gray-500">{subatividade?.titulo || "Carregando..."}</p>
          </div>
          {!isLoading && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 flex-1 md:flex-none gap-2"
              onClick={() => {
                if (!orcamentoUnico) {
                  setFormData({
                    descricao: "",
                    unidade: "",
                    qtde: "",
                    unitarioMaoObra: "",
                    totalMaoObra: "",
                    total: "",
                  });
                }
                setIsDialogOpen(true);
              }}
            >
              {orcamentoUnico ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {orcamentoUnico ? "Editar Orçamento" : "Definir Orçamento"}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando orçamento...</div>
        ) : !orcamentoUnico ? (
          <Card className="p-12 text-center text-gray-500 bg-white">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Nenhum orçamento definido para esta subatividade.</p>
            <p className="text-sm">Clique em "Definir Orçamento" para começar.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 bg-white shadow-md border-t-4 border-indigo-600">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Descrição Geral</h3>
              <p className="text-xl font-bold text-gray-900">{orcamentoUnico.descricao}</p>
            </Card>

            <Card className="p-6 bg-white shadow-md border-t-4 border-indigo-600">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Unidade / Quantidade</h3>
              <p className="text-xl font-bold text-gray-900">
                {orcamentoUnico.qtde} {orcamentoUnico.unidade}
              </p>
            </Card>

            <Card className="p-6 bg-white shadow-md border-t-4 border-indigo-600">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Mão de Obra</h3>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Unitário: R$ {Number(orcamentoUnico.unitario_mao_obra).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xl font-bold text-indigo-600">Total: R$ {Number(orcamentoUnico.total_mao_obra).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </Card>

            <Card className="p-6 bg-indigo-600 text-white shadow-md col-span-1 md:col-span-2 lg:col-span-3">
              <h3 className="text-sm font-semibold uppercase mb-2 opacity-80">Total Geral do Orçamento</h3>
              <p className="text-4xl font-black">
                R$ {Number(orcamentoUnico.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </Card>
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{orcamentoUnico ? "Editar Orçamento" : "Novo Orçamento"}</DialogTitle>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Unitário Mão de Obra (R$)</label>
                <Input
                  type="number"
                  placeholder="0,00"
                  step="0.01"
                  value={formData.unitarioMaoObra}
                  onChange={(e) => setFormData({ ...formData, unitarioMaoObra: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Mão de Obra (R$)</label>
                <Input
                  type="number"
                  placeholder="0,00"
                  step="0.01"
                  value={formData.totalMaoObra}
                  onChange={(e) => setFormData({ ...formData, totalMaoObra: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Total do Item (R$)</label>
              <Input
                type="number"
                placeholder="Valor total do orçamento"
                step="0.01"
                value={formData.total}
                onChange={(e) => setFormData({ ...formData, total: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={handleSaveOrcamento}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "Salvando..." : (orcamentoUnico ? "Salvar Alterações" : "Definir Orçamento")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
