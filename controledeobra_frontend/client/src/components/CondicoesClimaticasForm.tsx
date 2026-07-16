import React, { useState, useEffect } from 'react';
import { apiService } from '@/lib/api';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PERIODOS_DIA } from '@shared/const';

interface CondicaoClimatica {
  id?: string;
  periodo: string;
  tempo?: string;
  condicao?: string;
}

interface CondicoesClimaticasFormProps {
  tarefaId: string | number;
  onCondicoesChange?: (condicoes: CondicaoClimatica[]) => void;
}

const OPCOES_TEMPO = ['Claro', 'Nublado', 'Chuvoso', 'Parcialmente nublado'];
const OPCOES_CONDICAO = ['Praticável', 'Não praticável', 'Parcialmente praticável'];

export function CondicoesClimaticasForm({ tarefaId, onCondicoesChange }: CondicoesClimaticasFormProps) {
  const [condicoes, setCondicoes] = useState<CondicaoClimatica[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarCondicoes();
  }, [tarefaId]);

  const carregarCondicoes = async () => {
    try {
      setLoading(true);
      const data = await apiService.condicoesClimaticas.list(tarefaId);
      
      // Garantir que todos os períodos estejam presentes
      const condicoesCompletas = PERIODOS_DIA.map(periodo => {
        const condicaoExistente = data?.find((c: any) => c.periodo === periodo);
        return condicaoExistente || { periodo, tempo: '', condicao: '' };
      });
      
      setCondicoes(condicoesCompletas);
      onCondicoesChange?.(condicoesCompletas);
    } catch (error) {
      console.error('Erro ao carregar condições climáticas:', error);
      // Inicializar com períodos vazios
      const condicoesVazias = PERIODOS_DIA.map(periodo => ({
        periodo,
        tempo: '',
        condicao: ''
      }));
      setCondicoes(condicoesVazias);
    } finally {
      setLoading(false);
    }
  };

  const handleAtualizarCondicao = async (index: number, campo: string, valor: string) => {
    const novasCondicoes = [...condicoes];
    novasCondicoes[index] = {
      ...novasCondicoes[index],
      [campo]: valor
    };
    setCondicoes(novasCondicoes);
    
    // Salvar automaticamente
    try {
      await apiService.condicoesClimaticas.save(tarefaId, novasCondicoes);
      onCondicoesChange?.(novasCondicoes);
    } catch (error) {
      console.error('Erro ao salvar condições climáticas:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Condições Climáticas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-gray-500">Carregando...</p>
          ) : (
            condicoes.map((condicao, index) => (
              <div key={condicao.periodo} className="space-y-2 p-3 border rounded-lg">
                <h4 className="font-medium text-sm">{condicao.periodo}</h4>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* Tempo */}
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Tempo</label>
                    <Select
                      value={condicao.tempo || ''}
                      onValueChange={(valor) => handleAtualizarCondicao(index, 'tempo', valor)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {OPCOES_TEMPO.map(opcao => (
                          <SelectItem key={opcao} value={opcao}>
                            {opcao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Condição */}
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Condição</label>
                    <Select
                      value={condicao.condicao || ''}
                      onValueChange={(valor) => handleAtualizarCondicao(index, 'condicao', valor)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {OPCOES_CONDICAO.map(opcao => (
                          <SelectItem key={opcao} value={opcao}>
                            {opcao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
