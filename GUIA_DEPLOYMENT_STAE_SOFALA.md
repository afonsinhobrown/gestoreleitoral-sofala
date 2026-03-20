# 📋 GUIA DE LANÇAMENTO: STAE-SOFALA NACIONAL

Este guia contém todos os passos para colocar o sistema online. Siga a ordem rigorosamente para garantir a conexão entre o servidor e os portais.

---

## 🛠️ PASSO 1: Preparação do GitHub (O Alicerce)
Antes de tudo, o código tem de estar na "nuvem" do GitHub.

1.  Crie um novo repositório no seu GitHub (ex: `gestoreleitoral-staesofala`).
2.  Abra o terminal na pasta do projecto e envie o código:
    ```bash
    git init
    git add .
    git commit -m "Lançamento Nacional STAE"
    git branch -M main
    git remote add origin https://github.com/O-SEU-USUARIO/O-SEU-REPO.git
    git push -u origin main
    ```

---

## 🚀 PASSO 2: Configuração do Render (O Coração / API)
Aqui vamos colocar o servidor que processa os BIs e a Base de Dados de Moçambique.

1.  Aceda a **[dashboard.render.com](https://dashboard.render.com)** e crie conta.
2.  Clique em **"New"** (botão azul) -> Escolha **"Blueprint"**.
3.  Ligue a sua conta do GitHub e selecione o repositório do projecto.
4.  O Render lerá o ficheiro `render.yaml` que eu criei e irá configurar o serviço **`stae-api-sofala`**.
5.  **IMPORTANTE (Variável de Ambiente)**: 
    *   No painel do serviço `stae-api-sofala`, vá a **"Environment"**.
    *   Clique em **"Add Environment Variable"**.
    *   **Key**: `DATABASE_URL`
    *   **Value**: Copie o link do seu **Neon DB** (ex: `postgresql://alexandre...`).
6.  **O Link Final**: Quando o Render terminar (ficar verde), ele dará um link (ex: `https://stae-api-sofala.onrender.com`). **COPIE ESTE LINK.**

---

## 💻 PASSO 3: Configuração do Vercel (A Janela / Portais)
Agora vamos colocar o ecrã do candidato e o painel administrativo. Vamos fazer isto DUAS VEZES (uma para o portal móvel e outra para o dashboard admin).

### A. Lançamento do Portal do Candidato (Para o Telemóvel)
1.  Aceda a **[vercel.com](https://vercel.com)** e crie conta.
2.  Clique em **"Add New"** -> **"Project"**. Selecione o seu repositório do GitHub.
3.  **CONFIGURAÇÃO CRUCIAL (Root Directory)**:
    *   Clique em "Edit" e selecione a pasta **`stae-mobile-portal`**.
    *   **Framework Preset**: Escolha **Vite**.
4.  **VARIÁVEL DE AMBIENTE (O Segredo)**:
    *   Abra a secção "Environment Variables" (antes de clicar em Deploy).
    *   **Key**: `VITE_API_URL`
    *   **Value**: O link que copiou do Render (ex: `https://stae-api-sofala.onrender.com`).
5.  Clique em **"Deploy"**.

### B. Lançamento do Painel Administrativo (Para o Afonso)
1.  Repita os passos acima (clique em "Add New Project" no dashboard do Vercel).
2.  **Root Directory**: Selecione desta vez a pasta **`stae-admin-dashboard`**.
3.  **Environment Variables**: Use novamente a **Key**: `VITE_API_URL` com o mesmo link do Render.
4.  Clique em **"Deploy"**.

---

## ✅ VALIDAÇÃO FINAL
- Abra o link que o Vercel lhe deu para o **Portal do Candidato**.
- Tente fazer o registo do seu BI. 
- Se a fotografia for lida e aparecer a mensagem de sucesso com a credencial, o **STAE MOÇAMBIQUE** está oficialmente online para todo o país! 🇲🇿
