-- Adicionar política para permitir verificar se existe algum reseller (apenas para contagem)
-- Isso é necessário para a página inicial decidir se mostra setup ou landing
CREATE POLICY "Anyone can check if resellers exist" 
ON public.resellers 
FOR SELECT 
USING (true);