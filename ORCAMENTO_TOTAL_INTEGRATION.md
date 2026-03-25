# Integração da Tabela `orcamento_total`

## Visão Geral

A tabela `orcamento_total` foi integrada ao projeto **controledeobra** para armazenar e gerenciar a soma dos orçamentos por subatividade. Como as subatividades podem ter múltiplos orçamentos, esta tabela centraliza os totais consolidados de mão de obra, material e valor total.

## Estrutura da Tabela

```sql
CREATE TABLE `orcamento_total` (
  `id` bigint(20) NOT NULL,
  `sub_atividade_id` bigint(20) NOT NULL,
  `total_mao_obra` double NOT NULL,
  `total_material` double NOT NULL,
  `total` double NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `orcamento_total`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `orcamento_total`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;
```

## Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | bigint(20) | Identificador único (auto-incremento) |
| `sub_atividade_id` | bigint(20) | Referência à subatividade |
| `total_mao_obra` | double | Soma de todos os totais de mão de obra dos orçamentos |
| `total_material` | double | Soma de todos os totais de material dos orçamentos |
| `total` | double | Soma total de todos os orçamentos (mão de obra + material) |

## Funcionalidades Implementadas

### 1. Funções de Banco de Dados (`db.ts`)

#### `getOrcamentoTotal(subatividadeId)`
Recupera o orçamento total de uma subatividade específica.

```typescript
const orcamentoTotal = await db.getOrcamentoTotal(subatividadeId);
```

**Retorno:**
```typescript
{
  id: "1",
  sub_atividade_id: "123",
  total_mao_obra: 5000.00,
  total_material: 3000.00,
  total: 8000.00
}
```

#### `getOrcamentosTotais(subatividadeIds)`
Recupera os orçamentos totais de múltiplas subatividades.

```typescript
const orcamentosTotais = await db.getOrcamentosTotais([123, 124, 125]);
```

**Retorno:**
```typescript
[
  {
    id: "1",
    sub_atividade_id: "123",
    total_mao_obra: 5000.00,
    total_material: 3000.00,
    total: 8000.00
  },
  // ... mais registros
]
```

#### `updateOrcamentoTotal(subatividadeId)` (Função Interna)
Função auxiliar que recalcula e atualiza automaticamente o `orcamento_total` baseado em todos os orçamentos da subatividade.

**Fluxo:**
1. Busca todos os orçamentos da subatividade
2. Calcula a soma de `total_mao_obra`, `total_material` e `total`
3. Verifica se já existe um registro de `orcamento_total`
4. Se existir, atualiza; caso contrário, cria um novo registro

### 2. Integração com Operações de Orçamento

A função `updateOrcamentoTotal()` é chamada automaticamente em três cenários:

#### a) Criação de Orçamento (`createOrcamento`)
```typescript
export async function createOrcamento(data: any) {
  // ... código de inserção ...
  
  // Atualiza o orcamento_total
  await updateOrcamentoTotal(sub_atividade_id);
  
  return { id: result.insertId.toString(), ...data };
}
```

#### b) Atualização de Orçamento (`updateOrcamento`)
```typescript
export async function updateOrcamento(id: string | number | bigint, data: any) {
  // ... código de atualização ...
  
  // Busca a sub_atividade_id antes de atualizar
  const [orcamentos]: any = await pool.execute('SELECT sub_atividade_id FROM orcamento WHERE id = ?', [id]);
  const subatividadeId = orcamentos[0]?.sub_atividade_id;

  // ... atualização do orçamento ...
  
  // Atualiza o orcamento_total
  if (subatividadeId) {
    await updateOrcamentoTotal(subatividadeId);
  }
  
  return { id: id.toString(), ...data };
}
```

#### c) Exclusão de Orçamento (`deleteOrcamento`)
```typescript
export async function deleteOrcamento(id: string | number | bigint) {
  // Busca a sub_atividade_id antes de deletar
  const [orcamentos]: any = await pool.execute('SELECT sub_atividade_id FROM orcamento WHERE id = ?', [id]);
  const subatividadeId = orcamentos[0]?.sub_atividade_id;
  
  await pool.execute('DELETE FROM orcamento WHERE id = ?', [id]);
  
  // Atualiza o orcamento_total
  if (subatividadeId) {
    await updateOrcamentoTotal(subatividadeId);
  }
  
  return { id: id.toString() };
}
```

### 3. Rotas da API (REST)

Novas rotas foram adicionadas ao `rest_routes.ts`:

#### `GET /api/orcamento-total?subatividadeId={id}`
Recupera o orçamento total de uma subatividade específica.

**Parâmetros:** `subatividadeId` (query string)

**Saída:**
```json
{
  "id": "1",
  "sub_atividade_id": "123",
  "total_mao_obra": 5000.00,
  "total_material": 3000.00,
  "total": 8000.00
}
```

#### `GET /api/orcamento-total/list?subatividadeIds={id1,id2,...}`
Recupera os orçamentos totais de múltiplas subatividades.

**Parâmetros:** `subatividadeIds` (query string, IDs separados por vírgula)

**Saída:** Array de objetos `orcamento_total`

## Fluxo de Funcionamento

```
┌─────────────────────────────────────────────────────────────┐
│                    Operação de Orçamento                     │
│                                                              │
│  1. Criar/Atualizar/Deletar Orçamento                       │
│     └─> Executa operação no banco de dados                 │
│         └─> Chama updateOrcamentoTotal()                   │
│             ├─> Busca todos os orçamentos da subatividade  │
│             ├─> Calcula somas (mão de obra, material, total)
│             └─> Insere/Atualiza registro em orcamento_total│
│                                                              │
│  2. Frontend pode consultar o total consolidado             │
│     └─> Chamada à API: GET /api/orcamento-total            │
│         └─> Retorna os totais consolidados                 │
└─────────────────────────────────────────────────────────────┘
```

## Exemplo de Uso no Frontend

```typescript
// Importar o apiService
import { apiService } from "@/lib/api";

// Dentro de um componente React
const { data: orcamentoTotal } = useQuery({
  queryKey: ["orcamentoTotal", subatividadeId],
  queryFn: () => apiService.orcamentoTotal.get(subatividadeId),
  enabled: !!subatividadeId,
});

// Exibir os totais
if (orcamentoTotal) {
  console.log(`Mão de Obra: R$ ${orcamentoTotal.total_mao_obra}`);
  console.log(`Material: R$ ${orcamentoTotal.total_material}`);
  console.log(`Total: R$ ${orcamentoTotal.total}`);
}
```

## Benefícios

1. **Consolidação de Dados**: Centraliza a soma de múltiplos orçamentos por subatividade
2. **Performance**: Evita cálculos repetidos no frontend
3. **Consistência**: Garante que os totais estejam sempre sincronizados
4. **Escalabilidade**: Facilita relatórios e análises de custos
5. **Automação**: Atualização automática em cada operação de orçamento

## Notas Importantes

- A função `updateOrcamentoTotal()` é chamada automaticamente, não requer ação manual
- Se não houver orçamentos para uma subatividade, um registro com totais zerados será criado
- Os valores são armazenados como `double` para precisão decimal
- A tabela usa `utf8mb4` para suporte completo a caracteres Unicode
- Erros na atualização do `orcamento_total` não interrompem a operação principal (logging apenas)

## Migração de Dados (Se Necessário)

Para popular a tabela `orcamento_total` com dados existentes:

```sql
INSERT INTO orcamento_total (sub_atividade_id, total_mao_obra, total_material, total)
SELECT 
  sub_atividade_id,
  SUM(total_mao_obra) as total_mao_obra,
  SUM(total_material) as total_material,
  SUM(total) as total
FROM orcamento
GROUP BY sub_atividade_id
ON DUPLICATE KEY UPDATE
  total_mao_obra = VALUES(total_mao_obra),
  total_material = VALUES(total_material),
  total = VALUES(total);
```

## Arquivos Modificados

- `controledeobra_backend/server/db.ts` - Adicionadas funções de gerenciamento do `orcamento_total`
- `controledeobra_backend/server/routers.ts` - Adicionadas rotas da API para `orcamentoTotal`

## Próximos Passos

1. Testar a integração com dados reais
2. Adicionar interface no frontend para exibir os totais consolidados
3. Implementar relatórios baseados em `orcamento_total`
4. Considerar cache para melhor performance em consultas frequentes
