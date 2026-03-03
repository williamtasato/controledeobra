import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiService } from "@/lib/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Plus, Wallet } from "lucide-react";

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

  const createMutation = useMutation({
    mutationFn: apiService.orcamento.create,
    onSuccess: () => {
      setFormData({
        descricao: "",
        unidade: "",
        qtde: "",
        unitarioMaoObra: "",
        total: "",
      });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["orcamento", subatividadeId] });
    },
  });

  const handleCreateOrcamento = async () => {
    if (formData.descricao.trim()) {
      const qtdeNum = parseFloat(formData.qtde) || 0;
      const unitarioNum = parseFloat(formData.unitarioMaoObra) || 0;
      const totalNum = formData.total ? parseFloat(formData.total) : (qtdeNum * unitarioNum);

      await createMutation.mutateAsync({
        descricao: formData.descricao,
        unidade: formData.unidade || undefined,
        qtde: qtdeNum,
        unitarioMaoObra: unitarioNum,
        total: totalNum,
        subatividadeId,
      });
    }
  };

  const totalMaoObra = orcamentos.reduce((sum: number, item: any) => sum + (Number(item.unitarioMaoObra) * (Number(item.qtde) || 0)), 0);
  const totalGeral = orcamentos.reduce((sum: number, item: any) => sum + (Number(item.total) || 0), 0);

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
            <h1 className="text-xl font-bold">Orçamento</h1>
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
            <h2 className="text-3xl font-bold text-gray-900">Orçamento</h2>
            <p className="text-gray-500">{subatividade?.titulo || "Carregando..."}</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 flex-1 md:flex-none gap-2"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Novo Item
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando orçamento...</div>
        ) : orcamentos.length === 0 ? (
          <Card className="p-12 text-center text-gray-500 bg-white">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Nenhum item de orçamento cadastrado.</p>
            <p className="text-sm">Clique em "Novo Item" para começar a orçar esta subatividade.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden bg-white shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="p-4 text-left text-sm font-semibold text-gray-600">Descrição</th>
                    <th className="p-4 text-center text-sm font-semibold text-gray-600">Unidade</th>
                    <th className="p-4 text-center text-sm font-semibold text-gray-600">Qtde</th>
                    <th className="p-4 text-right text-sm font-semibold text-gray-600">Unitário M.O.</th>
                    <th className="p-4 text-right text-sm font-semibold text-gray-600">Total Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orcamentos.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm text-gray-900 font-medium">{item.descricao}</td>
                      <td className="p-4 text-sm text-gray-500 text-center">{item.unidade || "-"}</td>
                      <td className="p-4 text-sm text-gray-500 text-center">{item.qtde || "0"}</td>
                      <td className="p-4 text-sm text-gray-500 text-right">
                        {item.unitarioMaoObra ? `R$ ${Number(item.unitarioMaoObra).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "-"}
                      </td>
                      <td className="p-4 text-sm text-indigo-600 text-right font-bold">
                        {item.total ? `R$ ${Number(item.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-200">
                  <tr className="bg-gray-50 text-gray-700 font-semibold">
                    <td colSpan={4} className="p-4 text-right">
                      Total Mão de Obra:
                    </td>
                    <td className="p-4 text-right">
                      R$ {totalMaoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-indigo-600 text-white font-bold">
                    <td colSpan={4} className="p-4 text-right">
                      Total Geral:
                    </td>
                    <td className="p-4 text-right text-lg">
                      R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Item de Orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Input
                placeholder="Ex: Cimento, Mão de obra, etc"
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
                <label className="text-sm font-medium">Total do Item (Opcional)</label>
                <Input
                  type="number"
                  placeholder="Calculado se vazio"
                  step="0.01"
                  value={formData.total}
                  onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 italic">
              * Se o "Total do Item" ficar vazio, ele será calculado como (Quantidade x Unitário M.O.).
            </p>
            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={handleCreateOrcamento}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Criando..." : "Adicionar Item"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
