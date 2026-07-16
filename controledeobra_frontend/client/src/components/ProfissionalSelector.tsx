import React, { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';

interface Profissional {
  id: string;
  nome: string;
  tipo: string;
  descricao?: string;
}

interface ProfissionalSelectorProps {
  tarefaId: string | number;
  onProfissionaisChange?: (profissionais: Profissional[]) => void;
}

export function ProfissionalSelector({ tarefaId, onProfissionaisChange }: ProfissionalSelectorProps) {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [selecionados, setSelecionados] = useState<Profissional[]>([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    carregarProfissionais();
    carregarProfissionaisTarefa();
  }, [tarefaId]);

  const carregarProfissionais = async () => {
    try {
      setLoading(true);
      const data = await apiService.profissionais.list();
      setProfissionais(data || []);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarProfissionaisTarefa = async () => {
    try {
      const data = await apiService.tarefaProfissionais.list(tarefaId);
      setSelecionados(data || []);
      onProfissionaisChange?.(data || []);
    } catch (error) {
      console.error('Erro ao carregar profissionais da tarefa:', error);
    }
  };

  const handleToggleProfissional = async (profissional: Profissional) => {
    const jaEstaAdicionado = selecionados.some(p => p.id === profissional.id);

    if (jaEstaAdicionado) {
      // Remover
      try {
        const tarefaProf = selecionados.find(p => p.id === profissional.id);
        if (tarefaProf) {
          await apiService.tarefaProfissionais.remove(tarefaProf.id);
          const novosSelecionados = selecionados.filter(p => p.id !== profissional.id);
          setSelecionados(novosSelecionados);
          onProfissionaisChange?.(novosSelecionados);
        }
      } catch (error) {
        console.error('Erro ao remover profissional:', error);
      }
    } else {
      // Adicionar
      try {
        await apiService.tarefaProfissionais.add(tarefaId, profissional.id);
        const novosSelecionados = [...selecionados, profissional];
        setSelecionados(novosSelecionados);
        onProfissionaisChange?.(novosSelecionados);
      } catch (error) {
        console.error('Erro ao adicionar profissional:', error);
      }
    }
  };

  const profissionaisFiltrados = profissionais.filter(p =>
    p.nome.toLowerCase().includes(filtro.toLowerCase())
  );

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'Padrão':
        return 'bg-blue-100 text-blue-800';
      case 'Personalizada':
        return 'bg-purple-100 text-purple-800';
      case 'Grupo':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          Selecione os profissionais... ({selecionados.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selecione os profissionais</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Filtro de busca..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full"
          />

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-gray-500">Carregando...</p>
            ) : profissionaisFiltrados.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum profissional encontrado</p>
            ) : (
              profissionaisFiltrados.map((profissional) => (
                <div key={profissional.id} className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
                  <Checkbox
                    id={`prof-${profissional.id}`}
                    checked={selecionados.some(p => p.id === profissional.id)}
                    onCheckedChange={() => handleToggleProfissional(profissional)}
                  />
                  <label
                    htmlFor={`prof-${profissional.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{profissional.nome}</span>
                      <Badge className={`text-xs ${getTipoBadgeColor(profissional.tipo)}`}>
                        {profissional.tipo}
                      </Badge>
                    </div>
                    {profissional.descricao && (
                      <div className="text-xs text-gray-500">{profissional.descricao}</div>
                    )}
                  </label>
                </div>
              ))
            )}
          </div>

          {selecionados.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">Selecionados:</p>
              <div className="space-y-1">
                {selecionados.map((prof) => (
                  <div key={prof.id} className="text-sm text-gray-600 flex items-center gap-2">
                    • {prof.nome}
                    <Badge variant="outline" className="text-xs">{prof.tipo}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={() => setOpen(false)}
            className="w-full"
          >
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
