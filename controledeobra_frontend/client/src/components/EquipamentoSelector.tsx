import React, { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface Equipamento {
  id: string;
  nome: string;
  descricao?: string;
}

interface EquipamentoSelectorProps {
  tarefaId: string | number;
  onEquipamentosChange?: (equipamentos: Equipamento[]) => void;
}

export function EquipamentoSelector({ tarefaId, onEquipamentosChange }: EquipamentoSelectorProps) {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [selecionados, setSelecionados] = useState<Equipamento[]>([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    carregarEquipamentos();
    carregarEquipamentosTarefa();
  }, [tarefaId]);

  const carregarEquipamentos = async () => {
    try {
      setLoading(true);
      const data = await apiService.equipamentos.list();
      setEquipamentos(data || []);
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarEquipamentosTarefa = async () => {
    try {
      const data = await apiService.tarefaEquipamentos.list(tarefaId);
      setSelecionados(data || []);
      onEquipamentosChange?.(data || []);
    } catch (error) {
      console.error('Erro ao carregar equipamentos da tarefa:', error);
    }
  };

  const handleToggleEquipamento = async (equipamento: Equipamento) => {
    const jaEstaAdicionado = selecionados.some(e => e.id === equipamento.id);

    if (jaEstaAdicionado) {
      // Remover
      try {
        const tarefaEquip = selecionados.find(e => e.id === equipamento.id);
        if (tarefaEquip) {
          await apiService.tarefaEquipamentos.remove(tarefaEquip.id);
          const novosSelecionados = selecionados.filter(e => e.id !== equipamento.id);
          setSelecionados(novosSelecionados);
          onEquipamentosChange?.(novosSelecionados);
        }
      } catch (error) {
        console.error('Erro ao remover equipamento:', error);
      }
    } else {
      // Adicionar
      try {
        await apiService.tarefaEquipamentos.add(tarefaId, equipamento.id);
        const novosSelecionados = [...selecionados, equipamento];
        setSelecionados(novosSelecionados);
        onEquipamentosChange?.(novosSelecionados);
      } catch (error) {
        console.error('Erro ao adicionar equipamento:', error);
      }
    }
  };

  const equipamentosFiltrados = equipamentos.filter(e =>
    e.nome.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          Selecione os equipamentos... ({selecionados.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selecione os equipamentos</DialogTitle>
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
            ) : equipamentosFiltrados.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum equipamento encontrado</p>
            ) : (
              equipamentosFiltrados.map((equipamento) => (
                <div key={equipamento.id} className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
                  <Checkbox
                    id={`equip-${equipamento.id}`}
                    checked={selecionados.some(e => e.id === equipamento.id)}
                    onCheckedChange={() => handleToggleEquipamento(equipamento)}
                  />
                  <label
                    htmlFor={`equip-${equipamento.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{equipamento.nome}</div>
                    {equipamento.descricao && (
                      <div className="text-xs text-gray-500">{equipamento.descricao}</div>
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
                {selecionados.map((equip) => (
                  <div key={equip.id} className="text-sm text-gray-600">
                    • {equip.nome}
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
