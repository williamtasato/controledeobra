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
import { ChevronLeft, Pencil } from "lucide-react";

export default function AtividadesPage() {
  const [match, params] = useRoute("/projetos/:projetoId/atividades");
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const projetoId = params?.projetoId || "";
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    inicio: "",
    fim: "",
  });
  const [editingAtividade, setEditingAtividade] = useState<any>(null);

  const { data: atividades = [], isLoading } = useQuery({
    queryKey: ["atividades", projetoId],
    queryFn: () => apiService.atividades.list(projetoId),
    enabled: !!projetoId,
  });


  console.log(atividades)
  const createMutation = useMutation({
    mutationFn: apiService.atividades.create,
    onSuccess: () => {
      setFormData({ titulo: "", descricao: "", inicio: "", fim: "" });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["atividades", projetoId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiService.atividades.update(data),
    onSuccess: () => {
      setEditingAtividade(null);
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["atividades", projetoId] });
    },
  });

  const handleCreateAtividade = async () => {
    if (formData.titulo.trim()) {
      await createMutation.mutateAsync({
        ...formData,
        projetoId,
      });
    }
  };

  const handleUpdateAtividade = async () => {
    if (editingAtividade && editingAtividade.titulo.trim()) {
      await updateMutation.mutateAsync({
        id: editingAtividade.id,
        titulo: editingAtividade.titulo,
        descricao: editingAtividade.descricao,
        inicio: editingAtividade.inicio,
        fim: editingAtividade.fim,
        projetoId: editingAtividade.projetoId
      });
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

  const openEditDialog = (e: React.MouseEvent, atividade: any) => {
    e.stopPropagation();
    const formattedAtividade = {
      ...atividade,
      inicio: formatDateForInput(atividade.inicio),
      fim: formatDateForInput(atividade.fim),
    };
    setEditingAtividade(formattedAtividade);
    setIsEditDialogOpen(true);
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
            <h1 className="text-xl font-bold">Atividades</h1>
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
          <h2 className="text-3xl font-bold text-gray-900">Atividades</h2>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setIsDialogOpen(true)}
          >
            + Nova Atividade
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando atividades...</div>
        ) : atividades.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhuma atividade cadastrada.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {atividades.map((atividade: any) => {
              const inicioFormatado = formatDateForDisplay(atividade.inicio);
              const fimFormatado = formatDateForDisplay(atividade.fim);
              
              return (
                <Card
                  key={atividade.id}
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer relative group"
                  onClick={() => setLocation(`/atividades/${atividade.id}/subatividades`)}
                >
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                    onClick={(e) => openEditDialog(e, atividade)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{atividade.titulo}</h3>
                  {atividade.descricao && (
                    <p className="text-gray-600 mb-4">{atividade.descricao}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Início: {inicioFormatado || ""}
                  </p>
                  <p className="text-sm text-gray-500">
                    Fim: {fimFormatado || ""}
                  </p>
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
            <DialogTitle>Nova Atividade</DialogTitle>
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
                onClick={handleCreateAtividade}
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
            <DialogTitle>Editar Atividade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Título"
              value={editingAtividade?.titulo || ""}
              onChange={(e) => setEditingAtividade({ ...editingAtividade, titulo: e.target.value })}
            />
            <Textarea
              placeholder="Descrição"
              value={editingAtividade?.descricao || ""}
              onChange={(e) => setEditingAtividade({ ...editingAtividade, descricao: e.target.value })}
            />
            <Input
              type="date"
              value={editingAtividade?.inicio || ""}
              onChange={(e) => setEditingAtividade({ ...editingAtividade, inicio: e.target.value })}
            />
            <Input
              type="date"
              value={editingAtividade?.fim || ""}
              onChange={(e) => setEditingAtividade({ ...editingAtividade, fim: e.target.value })}
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
                onClick={handleUpdateAtividade}
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
