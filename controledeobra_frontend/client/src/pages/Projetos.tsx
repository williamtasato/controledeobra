import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiService } from "@/lib/api";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function ProjetosPage() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [nomeProjeto, setNomeProjeto] = useState("");
  const queryClient = useQueryClient();

  const { data: projetos = [], isLoading } = useQuery({
    queryKey: ["projetos"],
    queryFn: apiService.projetos.list,
  });

  const createMutation = useMutation({
    mutationFn: apiService.projetos.create,
    onSuccess: () => {
      setNomeProjeto("");
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
    },
  });

  const handleCreateProjeto = async () => {
    if (nomeProjeto.trim()) {
      await createMutation.mutateAsync({ nome: nomeProjeto });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-indigo-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Controle de Obras</h1>
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
          <h2 className="text-3xl font-bold text-gray-900">Projetos</h2>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setIsDialogOpen(true)}
          >
            + Novo Projeto
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Carregando projetos...</div>
        ) : projetos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum projeto cadastrado. Crie um novo projeto para começar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projetos.map((projeto: any) => (
              <Card
                key={projeto.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setLocation(`/projetos/${projeto.id}/atividades`)}
              >
                <div className="text-4xl mb-4">🏗️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{projeto.nome}</h3>
                <p className="text-sm text-gray-500">Clique para gerenciar atividades</p>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nome do projeto"
              value={nomeProjeto}
              onChange={(e) => setNomeProjeto(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleCreateProjeto();
                }
              }}
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
                onClick={handleCreateProjeto}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
