import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiService } from "@/lib/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Edit2, Trash2, Users } from "lucide-react";
import { TIPOS_PROFISSIONAIS } from "@shared/const";

export default function ProfissionaisPage() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "Padrão",
    descricao: "",
  });

  const { data: profissionais = [], isLoading } = useQuery({
    queryKey: ["profissionais"],
    queryFn: () => apiService.profissionais.list(),
  });

  const createMutation = useMutation({
    mutationFn: apiService.profissionais.create,
    onSuccess: () => {
      resetForm();
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["profissionais"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiService.profissionais.update(data),
    onSuccess: () => {
      resetForm();
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["profissionais"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => apiService.profissionais.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profissionais"] });
    },
  });

  const resetForm = () => {
    setFormData({ nome: "", tipo: "Padrão", descricao: "" });
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

  const handleEdit = (prof: any) => {
    setEditingId(prof.id);
    setFormData({
      nome: prof.nome,
      tipo: prof.tipo || "Padrão",
      descricao: prof.descricao || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string | number) => {
    if (confirm("Deseja realmente excluir este profissional?")) {
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
            <h1 className="text-xl font-bold">Gestão de Profissionais</h1>
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
          <h2 className="text-3xl font-bold text-gray-900">Profissionais / Mão de Obra</h2>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
          >
            + Novo Profissional
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando profissionais...</div>
        ) : profissionais.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum profissional cadastrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profissionais.map((prof: any) => (
              <Card key={prof.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{prof.nome}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        prof.tipo === 'Grupo' ? 'bg-purple-100 text-purple-700' : 
                        prof.tipo === 'Personalizada' ? 'bg-orange-100 text-orange-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {prof.tipo}
                      </span>
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{prof.descricao || "Sem descrição"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(prof)}>
                      <Edit2 className="h-4 w-4 text-indigo-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(prof.id)}>
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
            <DialogTitle>{editingId ? "Editar Profissional" : "Novo Profissional"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium">Nome do Profissional / Cargo</label>
              <Input
                placeholder="Ex: Pedreiro Especialista"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select 
                value={formData.tipo} 
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PROFISSIONAIS.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição / Observações</label>
              <Textarea
                placeholder="Detalhes sobre o profissional..."
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
