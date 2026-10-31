# Brecholândia

Site de catálogo para brechó, com reserva **somente para retirada na loja** (sem entrega).

## Rodar

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera a pasta dist/ (site estático)
```

## O que tem

- **Catálogo** com filtros por categoria, tipo de peça, cor, condição, tamanho, faixa de preço e busca. Os filtros ficam na URL, então dá para compartilhar um catálogo já filtrado.
- **Página da peça** com fotos, condição (com observações de desgaste), medidas, marca e botão de reserva.
- **Login e cadastro.** A conta é necessária para reservar.
- **Somente retirada:** ao reservar, a peça sai do catálogo e fica no nome do cliente até ser retirada ou cancelada.
- **Gerenciar** (só administradora): cadastro/edição de peças com até 6 fotos (arraste para reordenar), lista de reservas com nome e telefone do cliente, botões “Marcar retirada” e “Cancelar”, e os dados da loja.
- Animações com [Motion](https://motion.dev) respeitando a preferência do sistema por menos movimento.

## Primeiro acesso

1. Abra o site e vá em **Entrar**. A **primeira conta criada vira administradora**.
2. Em **Gerenciar → Dados da loja**, preencha endereço, horário, prazo de retirada, formas de pagamento e contato. Nada disso vem preenchido: só aparece no site o que você escrever ali.
3. Em **+ Nova peça**, cadastre as peças.

## Limitação importante

Os dados (contas, peças, fotos, reservas) ficam no `localStorage` **do navegador**. Isso permite testar tudo sem servidor, mas cada navegador tem seu próprio banco: clientes não vão ver as peças que você cadastrou no seu computador.

Para colocar no ar de verdade, troque as funções de `src/lib/db.ts` por chamadas a um backend (por exemplo Supabase ou Firebase). O resto do site usa só essas funções, então a troca fica concentrada nesse arquivo.
