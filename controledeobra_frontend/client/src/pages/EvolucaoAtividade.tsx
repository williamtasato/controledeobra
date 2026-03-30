import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, BarChart3, Table as TableIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

export default function EvolucaoAtividadePage() {
  const [match, params] = useRoute("/atividades/:atividadeId/evolucao");
  const [, setLocation] = useLocation();
  const atividadeId = params?.atividadeId || "";

  const { data: atividade } = useQuery({
    queryKey: ["atividade", atividadeId],
    queryFn: () => apiService.atividades.get(atividadeId),
    enabled: !!atividadeId,
  });

  const { data: subatividades = [], isLoading } = useQuery({
    queryKey: ["subatividades", atividadeId],
    queryFn: async () => {
      const result = await apiService.subatividades.list(atividadeId);
      if (atividadeId && atividade?.projetoId) {
        localStorage.setItem("last_projeto_id", atividade.projetoId.toString());
      }
      return result;
    },
    enabled: !!atividadeId,
  });

  const chartData = subatividades.map((sub: any) => {
    const metragem = parseFloat(sub.metragem) || 0;
    const realizado = parseFloat(sub.realizado) || 0;
    const percentual = metragem > 0 ? Math.min(100, (realizado / metragem) * 100) : 0;
    
    return {
      name: sub.titulo,
      percentual: parseFloat(percentual.toFixed(2)),
      realizado: realizado,
      total: metragem
    };
  });

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-indigo-600 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-indigo-700"
            onClick={() => {
              const projetoId = atividade?.projetoId || localStorage.getItem("last_projeto_id");
              if (projetoId) {
                setLocation(`/projetos/${projetoId}/atividades`);
              } else {
                setLocation("/projetos");
              }
            }}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Evolução: {atividade?.titulo}</h1>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-8">
        {/* Seção do Gráfico */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-900">Gráfico de Progresso (%)</h2>
          </div>
          <Card className="p-6 bg-white shadow-md">
            <div className="h-[400px] w-full">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">Carregando gráfico...</div>
              ) : chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">Sem dados para exibir</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={150} 
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`${value}%`, 'Progresso']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="percentual" radius={[0, 4, 4, 0]} barSize={30}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      <LabelList dataKey="percentual" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: '12px', fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </section>

        {/* Seção da Tabela */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TableIcon className="h-6 w-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-900">Detalhamento das Subatividades</h2>
          </div>
          <Card className="overflow-hidden shadow-md">
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="font-bold">Subatividade</TableHead>
                  <TableHead className="text-center font-bold">Metragem Total</TableHead>
                  <TableHead className="text-center font-bold">Realizado Atual</TableHead>
                  <TableHead className="text-right font-bold">Progresso (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">Carregando dados...</TableCell>
                  </TableRow>
                ) : subatividades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">Nenhuma subatividade encontrada</TableCell>
                  </TableRow>
                ) : (
                  subatividades.map((sub: any) => {
                    const metragem = parseFloat(sub.metragem) || 0;
                    const realizado = parseFloat(sub.realizado) || 0;
                    const percentual = metragem > 0 ? (realizado / metragem) * 100 : 0;
                    
                    return (
                      <TableRow key={sub.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{sub.titulo}</TableCell>
                        <TableCell className="text-center">{metragem} m²</TableCell>
                        <TableCell className="text-center">{realizado} m²</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-indigo-600 h-2 rounded-full" 
                                style={{ width: `${Math.min(100, percentual)}%` }}
                              ></div>
                            </div>
                            <span className="font-bold min-w-[50px]">{percentual.toFixed(2)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </section>
      </main>
    </div>
  );
}
