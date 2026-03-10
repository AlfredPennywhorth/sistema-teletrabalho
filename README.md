# Sistema de Teletrabalho

Sistema para gerenciamento de escalas de trabalho (presencial/remoto) integrado com o Google Firebase.

## 🚀 Como Rodar o Projeto em Outro Computador

Para editar ou rodar este projeto em uma nova máquina, siga os passos abaixo:

### 1. Pré-requisitos
Certifique-se de ter instalado:
- **Node.js** (versão 18 ou superior): [Download](https://nodejs.org/)
- **Git** (opcional, para clonar): [Download](https://git-scm.com/)

### 2. Configuração Inicial

1.  **Baixe o código**: Clone o repositório ou copie a pasta do projeto.
2.  **Instale as dependências**:
    Abra o terminal na pasta do projeto e execute:
    ```bash
    npm install
    ```

3.  **Configure as Variáveis de Ambiente**:
    O arquivo `.env` (que contém as chaves de acesso) **não** é copiado automaticamente por segurança.
    - Crie um arquivo chamado `.env` na raiz do projeto.
    - Copie o conteúdo de `.env.example` para dentro dele.
    - Preencha os valores com as chaves do Firebase (disponíveis no Console do Firebase).

### 3. Rodando Localmente
Para iniciar o servidor de desenvolvimento:
```bash
npm run dev
```
O sistema estará acessível em `http://localhost:5173`.

### 4. Fazendo Deploy (Publicar Alterações)

#### Opção A: Vercel (Recomendado)
Este projeto está configurado para deploy automático na Vercel ao fazer push para o GitHub.
1.  Acesse o painel da Vercel.
2.  Em **Settings > Environment Variables**, adicione as mesmas chaves do seu arquivo `.env` (VITE_FIREBASE_...).
3.  Faça o push para o branch `main`.

#### Opção B: Firebase Hosting
Para atualizar a versão no Firebase Hosting (`sistema-teletrabalho-v2.web.app`):

1.  Gere a versão de produção:
    ```bash
    npm run build
    ```
    *(Se der erro de permissão no Windows, use: `cmd /c "npm run build"`)*

2.  Envie para o Firebase:
    ```bash
    npx firebase deploy --only hosting --project sistema-teletrabalho-v2
    ```
    *(Se der erro de permissão, use: `cmd /c "npx firebase deploy --only hosting --project sistema-teletrabalho-v2"`)*


---

## 🛠️ Tecnologias
- React + Vite
- Tailwind CSS
- Firebase (Auth, Firestore, Hosting)
- BrasilAPI (Feriados)
