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

## Colocar no ar na Vercel

O projeto já vem configurado (`vercel.json`): o site é gerado pelo Vite e a API roda como função em `api/index.js`.

1. Importe o repositório na Vercel (*Add New → Project*).
2. Em *Settings → Environment Variables*, crie `MONGODB_URI` com a string de conexão do Atlas e `ADMIN_CODE` com o código da loja (veja *Quem administra*).
3. No Atlas, em *Network Access*, libere `0.0.0.0/0`. As funções da Vercel não têm IP fixo, então essa é a forma indicada pelo próprio MongoDB; a proteção fica por conta do usuário e da senha do banco.
4. Faça o deploy.

Limite da Vercel: cada envio aceita até 4,5 MB. O site já reduz as fotos antes de enviar e avisa se as fotos novas de uma peça passarem do limite.

## Outra hospedagem Node

```bash
npm run build
npm start        # entrega o site e a API na porta PORT (padrão 3001)
```

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

## Quem administra

Só a conta **nicholasnoahaa3@gmail.com** vê a área **Gerenciar** (peças, reservas e dados da loja). O papel é calculado pelo e-mail a cada acesso, então nenhuma outra conta vira administradora, nem mexendo no banco.

Como o site não confirma e-mail, esse endereço é **reservado**: para criar a conta com ele é preciso o código da loja, definido na variável `ADMIN_CODE`. Sem essa variável, ninguém consegue criar a conta da loja.

1. Na Vercel, em *Settings → Environment Variables*, crie `ADMIN_CODE` com um código só seu (uma frase longa serve).
2. Faça o deploy, abra o site e vá em **Entrar → Sou novo por aqui** com o e-mail da loja.
3. O site pede o **Código da loja**. Digite o mesmo valor do `ADMIN_CODE`.
4. Em **Gerenciar → Dados da loja**, preencha endereço, horário, prazo, pagamento e contato. Nada vem preenchido: só aparece no site o que você escrever.

Para trocar ou acrescentar administradores, defina `ADMIN_EMAILS` (vários separados por vírgula).

## Coleções no MongoDB

| Coleção | Conteúdo |
|---|---|
| `users` | contas (nome, e-mail, telefone, hash da senha, papel) |
| `sessions` | sessões de login, expiram sozinhas em 30 dias |
| `pieces` | peças do catálogo |
| `photos` | fotos das peças (binário) |
| `reservations` | reservas e histórico |
| `config` | dados da loja (documento `loja`) |
