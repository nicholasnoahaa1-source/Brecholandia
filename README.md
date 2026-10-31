# Brecholândia

Site de catálogo para brechó, com reserva **somente para retirada na loja** (sem entrega).
Front-end em React + Vite + Motion. Servidor em Node (Express) com banco **MongoDB**.

## Configurar o MongoDB

1. Crie um cluster no [MongoDB Atlas](https://cloud.mongodb.com) (o plano gratuito M0 serve) ou use um MongoDB próprio.
2. Crie um usuário do banco e libere o IP do servidor em *Network Access*.
3. Copie `.env.example` para `.env` e cole a string de conexão em `MONGODB_URI`.

As coleções e índices são criados sozinhos na primeira vez que o servidor sobe.

## Rodar em desenvolvimento

Dois terminais:

```bash
npm install
npm run api      # servidor + MongoDB na porta 3001
npm run dev      # site com recarregamento; /api é repassado para a porta 3001
```

## Colocar no ar

```bash
npm install
npm run build    # gera dist/
npm start        # o mesmo servidor entrega o site e a API (porta PORT, padrão 3001)
```

Funciona em qualquer hospedagem que rode Node 20.12+ (Render, Railway, Fly.io, uma VPS…). Defina `MONGODB_URI` nas variáveis de ambiente da hospedagem. Em produção (`NODE_ENV=production`, que o `npm start` já define) o cookie de sessão exige HTTPS.

## Testes

```bash
npm test
```

Testam a API (cadastro, login, permissões, reserva exclusiva, retirada, cancelamento, fotos) usando um banco simulado em memória, sem precisar de MongoDB.

## O que tem

- **Catálogo** com filtros por categoria, tipo de peça, cor, condição, tamanho, faixa de preço e busca. Os filtros ficam na URL.
- **Página da peça** com fotos, condição, medidas, marca e botão de reserva.
- **Login e cadastro.** Senhas guardadas com scrypt; sessão em cookie `HttpOnly`.
- **Somente retirada:** a reserva é atômica no banco (duas pessoas não reservam a mesma peça). A peça fica no nome do cliente até a loja marcar “Retirada” ou alguém cancelar.
- **Gerenciar** (só administração): peças com até 6 fotos (guardadas no MongoDB), reservas com nome e telefone do cliente, dados da loja.

## Primeiro acesso

1. Abra o site e vá em **Entrar**. A **primeira conta criada vira administradora**.
2. Em **Gerenciar → Dados da loja**, preencha endereço, horário, prazo, pagamento e contato. Nada vem preenchido: só aparece no site o que você escrever.
3. Em **+ Nova peça**, cadastre as peças.

## Coleções no MongoDB

| Coleção | Conteúdo |
|---|---|
| `users` | contas (nome, e-mail, telefone, hash da senha, papel) |
| `sessions` | sessões de login, expiram sozinhas em 30 dias |
| `pieces` | peças do catálogo |
| `photos` | fotos das peças (binário) |
| `reservations` | reservas e histórico |
| `config` | dados da loja (documento `loja`) |
