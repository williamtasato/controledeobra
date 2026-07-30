import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiService } from "@/lib/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Edit2, Trash2, HardHat } from "lucide-react";

export default function EquipamentosPage() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
  });

  const { data: equipamentos = [], isLoading } = useQuery({
    queryKey: ["equipamentos"],
    queryFn: () => apiService.equipamentos.list(),
  });

  const createMutation = useMutation({
    mutationFn: apiService.equipamentos.create,
    onSuccess: () => {
      resetForm();
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiService.equipamentos.update(data),
    onSuccess: () => {
      resetForm();
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => apiService.equipamentos.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
    },
  });

  const resetForm = () => {
    setFormData({ nome: "", descricao: "" });
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) return;

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleEdit = (equip: any) => {
    setEditingId(equip.id);
    setFormData({
      nome: equip.nome,
      descricao: equip.descricao || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string | number) => {
    if (confirm("Deseja realmente excluir este equipamento?")) {
      await deleteMutation.mutateAsync(id);
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
              onClick={() => setLocation("/projetos")}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-bold">Gestão de Equipamentos</h1>
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
          <h2 className="text-3xl font-bold text-gray-900">Equipamentos</h2>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
          >
            + Novo Equipamento
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando equipamentos...</div>
        ) : equipamentos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum equipamento cadastrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipamentos.map((equip: any) => (
              <Card key={equip.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <HardHat className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{equip.nome}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2">{equip.descricao || "Sem descrição"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(equip)}>
                      <Edit2 className="h-4 w-4 text-indigo-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(equip.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
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
            <DialogTitle>{editingId ? "Editar Equipamento" : "Novo Equipamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium">Nome do Equipamento</label>
              <Input
                placeholder="Ex: Betoneira 400L"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                placeholder="Detalhes sobre o equipamento..."
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
