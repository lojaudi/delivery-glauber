
# Revisao Completa do Sistema - Plano de Correcao de Bugs

## Resumo Executivo

Apos uma analise detalhada do codigo, identifiquei **15 problemas criticos** que afetam o funcionamento correto do sistema multi-tenant. Os bugs estao organizados em 4 categorias principais.

---

## Categoria 1: Isolamento Multi-Tenant (Critico)

### Bug 1.1: Garcons exibidos para todos os restaurantes
**Arquivo:** `src/pages/admin/Waiters.tsx`
**Problema:** A query de garcons nao filtra por `restaurant_id`, exibindo todos os garcons do sistema para qualquer restaurante.
**Impacto:** Vazamento de dados entre restaurantes.
**Correcao:** Adicionar filtro `.eq('restaurant_id', restaurantId)` na query de waiters e usar `useAdminRestaurant`.

### Bug 1.2: Estatisticas de garcons calculadas globalmente
**Arquivo:** `src/pages/admin/Waiters.tsx` (linhas 59-70)
**Problema:** A query de `waiter-stats` busca `table_orders` sem filtrar por restaurante.
**Impacto:** Estatisticas incorretas mostrando dados de outros restaurantes.
**Correcao:** Adicionar filtro `restaurant_id` na query.

### Bug 1.3: Addon Options expostas globalmente
**Arquivo:** `src/hooks/useAddons.tsx` (linhas 233-251)
**Problema:** O hook `useAddonOptions` nao filtra por restaurante quando `groupId` nao e fornecido.
**Impacto:** Opcoes de acrescimos de outros restaurantes podem vazar.
**Correcao:** Filtrar opcoes apenas para grupos do restaurante atual.

### Bug 1.4: Busca de pedidos sem filtro de restaurante
**Arquivo:** `src/pages/MyOrders.tsx` (linhas 53-72)
**Problema:** A busca de pedidos por telefone retorna pedidos de todos os restaurantes.
**Impacto:** Cliente ve pedidos de outros estabelecimentos.
**Correcao:** Adicionar filtro por `restaurant_id` baseado no slug da URL.

---

## Categoria 2: Navegacao e Contexto do Restaurante

### Bug 2.1: Navegacao para landing page quando basePath vazio
**Arquivos afetados:**
- `src/pages/OrderStatus.tsx` (linhas 95 e 129)
- `src/pages/MyOrders.tsx` (linha 98)

**Problema:** Uso de `basePath || '/'` redireciona para a landing page global quando o slug nao esta disponivel.
**Impacto:** Usuario perde contexto do restaurante.
**Correcao:** Remover fallback para `/`, manter apenas `basePath`.

### Bug 2.2: Carrinho nao persiste slug do restaurante
**Arquivo:** `src/hooks/useCart.tsx`
**Problema:** O carrinho salva apenas os itens, sem o slug do restaurante. Se o usuario atualizar a pagina fora de uma rota com slug, o contexto e perdido.
**Impacto:** Usuario pode perder o contexto do restaurante ao atualizar a pagina.
**Correcao:** Persistir o slug junto com os itens do carrinho e usar para reconstruir o `basePath`.

### Bug 2.3: BasePath vazio causa navegacao quebrada
**Arquivos afetados:**
- `src/pages/Cart.tsx` (linhas 25, 44, 141)
- `src/pages/Checkout.tsx` (linhas 285, 623)

**Problema:** Se `slug` for undefined, `basePath` sera uma string vazia, e `navigate(basePath)` equivale a `navigate('')` que pode ter comportamento imprevisivel.
**Impacto:** Navegacao incorreta ou erro.
**Correcao:** Garantir que navegacao sempre tenha caminho valido.

---

## Categoria 3: Seguranca (RLS)

### Bug 3.1: Politicas RLS muito permissivas
**Detectado pelo linter Supabase**
**Problema:** 2 politicas RLS usam `USING (true)` ou `WITH CHECK (true)` para operacoes INSERT/UPDATE/DELETE.
**Impacto:** Potencial acesso nao autorizado a dados.
**Correcao:** Revisar e restringir as politicas RLS afetadas.

### Bug 3.2: Protecao contra senhas vazadas desabilitada
**Detectado pelo linter Supabase**
**Problema:** O recurso de verificacao de senhas vazadas esta desabilitado.
**Impacto:** Usuarios podem usar senhas comprometidas.
**Correcao:** Habilitar a protecao nas configuracoes de autenticacao.

---

## Categoria 4: Bugs Funcionais

### Bug 4.1: Preco total no carrinho nao inclui addons
**Arquivo:** `src/hooks/useCart.tsx` (linha 90)
**Problema:** O calculo do `totalPrice` usa apenas `item.product.price * item.quantity`, sem considerar os precos dos addons selecionados.
**Impacto:** Total exibido no carrinho pode estar incorreto.
**Correcao:** Recalcular preco incluindo addons ou garantir que `product.price` ja inclua addons no momento da adicao.

### Bug 4.2: useOrderWithItems nao valida ownership
**Arquivo:** `src/hooks/useOrders.tsx` (linhas 117-141)
**Problema:** Busca pedido por ID sem verificar se pertence ao restaurante atual.
**Impacto:** Potencial acesso a pedidos de outros restaurantes.
**Correcao:** Adicionar verificacao de `restaurant_id` ou implementar validacao via RLS.

### Bug 4.3: Mutacoes de Kitchen nao validam restaurante
**Arquivo:** `src/hooks/useKitchenItems.tsx` (linhas 191-229)
**Problema:** Funcao `updateItemStatus` atualiza itens sem verificar se pertencem ao restaurante atual.
**Impacto:** Possibilidade de modificar pedidos de outros restaurantes.
**Correcao:** Adicionar validacao antes das mutacoes.

---

## Plano de Implementacao

### Fase 1: Correcoes Criticas de Multi-Tenancy (Prioridade Alta)

1. **Waiters.tsx** - Adicionar filtro `restaurant_id`:
   - Importar `useAdminRestaurant`
   - Filtrar query de waiters
   - Filtrar query de waiter-stats

2. **MyOrders.tsx** - Filtrar pedidos por restaurante:
   - Obter `restaurantId` pelo slug
   - Adicionar `.eq('restaurant_id', restaurantId)` na busca

3. **useAddons.tsx** - Restringir addon options:
   - Modificar `useAddonOptions` para aceitar filtro por restaurante

### Fase 2: Correcoes de Navegacao (Prioridade Media)

4. **useCart.tsx** - Persistir slug:
   - Modificar estrutura de armazenamento para incluir `restaurantSlug`
   - Adicionar funcao para recuperar slug

5. **OrderStatus.tsx e MyOrders.tsx** - Remover fallbacks:
   - Substituir `basePath || '/'` por `basePath`
   - Considerar mostrar erro se slug nao disponivel

### Fase 3: Seguranca (Prioridade Alta)

6. **Revisar RLS policies** no Supabase:
   - Identificar tabelas com politicas permissivas
   - Implementar restricoes adequadas

7. **Habilitar leaked password protection**

### Fase 4: Validacoes Adicionais

8. **useOrders.tsx** - Validar ownership em queries
9. **useKitchenItems.tsx** - Validar restaurante em mutacoes

---

## Detalhes Tecnicos

### Alteracoes em Waiters.tsx
```text
Linha 14: Adicionar import { useAdminRestaurant } from '@/hooks/useAdminRestaurant';
Linha 43: Adicionar const { restaurantId, isLoading: loadingRestaurant } = useAdminRestaurant();
Linha 47: Alterar queryKey para ['waiters', restaurantId]
Linha 48-51: Adicionar if (!restaurantId) return []; e filtro .eq('restaurant_id', restaurantId)
Linha 61: Alterar queryKey para ['waiter-stats', restaurantId]
Linha 65-69: Adicionar filtro .eq('restaurant_id', restaurantId)
Linha 102-108: Adicionar restaurant_id ao criar waiter
```

### Alteracoes em useCart.tsx
```text
Alterar estrutura de storage para:
{
  items: CartItem[],
  restaurantSlug: string | null
}

Adicionar funcoes:
- saveRestaurantSlug(slug: string)
- getRestaurantSlug(): string | null
```

### Alteracoes em MyOrders.tsx
```text
Linha 53-66: Buscar restaurantId pelo slug antes da query
Adicionar .eq('restaurant_id', restaurantId) na busca de pedidos
```

---

## Arquivos a Modificar

| Arquivo | Tipo de Correcao |
|---------|------------------|
| `src/pages/admin/Waiters.tsx` | Multi-tenancy |
| `src/pages/MyOrders.tsx` | Multi-tenancy + Navegacao |
| `src/pages/OrderStatus.tsx` | Navegacao |
| `src/hooks/useCart.tsx` | Persistencia de contexto |
| `src/hooks/useAddons.tsx` | Multi-tenancy |
| `src/hooks/useOrders.tsx` | Validacao de ownership |
| `src/hooks/useKitchenItems.tsx` | Validacao de mutacoes |

---

## Estimativa de Esforco

- **Fase 1 (Critico):** ~30 minutos
- **Fase 2 (Navegacao):** ~20 minutos
- **Fase 3 (Seguranca):** ~15 minutos
- **Fase 4 (Validacoes):** ~15 minutos

**Total estimado:** ~1h20min
