# PROPOSTA TÉCNICA REFINADA: SISTEMA INTEGRADO DE GESTÃO DO CICLO ELEITORAL (STAE-SOFALA)

## 1. INTRODUÇÃO E LOGÍSTICA DO CONCURSO
A presente proposta expande o Projecto original para abranger a gestão completa do candidato, desde o **Concurso Público** até à sua **Afectação Final**. O sistema servirá como motor central de coordenação para os dois grandes marcos: o **Recenseamento Eleitoral** e a **Votação**.

---

## 2. O CICLO DE VIDA DO CANDIDATO (PIPELINE INTEGRADO)

O sistema gerirá todas as categorias (Formadores, Brigadistas, Agentes de Educação Cívica e MMVs) através de um fluxo automatizado e seguro:

1.  **Fase de Candidatura e Avaliação**:
    *   O sistema recebe e processa os dados do concurso público.
    *   O administrador valida os aprovados para a formação conforme a categoria e distrito.

2.  **Módulo de Formação e Gestão de Turmas**:
    *   Geração automática de **Listas de Turmas** para as diversas áreas de formação.
    *   **Cartão de Identidade Digital (CID)**: Cada formando terá acesso, via portal móvel, a um Cartão Oficial contendo a sua **Foto, Nome Completo e ID (NUIT)**.
    *   **Código QR de Alta Segurança**: O cartão integra um código QR que descodifica a identidade completa do formando (ID, Nome e Ligação à Fotografia), permitindo a validação instantânea do acesso aos locais de formação.

2.1 Interface Móvel: PWA (Progressive Web App) e Validação IA (OCR)
Em vez de uma aplicação nativa convencional (Basic4Android), propõe-se o desenvolvimento de uma **PWA baseada em React (Vite)** com inteligência artificial integrada.
*   **Acesso Universal**: Funciona em qualquer dispositivo sem necessidade de descarregamento de lojas oficiais.
*   **Validação por IA (OCR)**: O sistema permite ao candidato carregar o seu Bilhete de Identidade (BI) ou NUIT. A plataforma utiliza tecnologia de reconhecimento óptico de caracteres para ler e preencher automaticamente os dados do concurso, eliminando erros humanos de digitação e fraudes no processo de candidatura.
*   **Performance Excepcional**: O uso de **Vite** garante que a aplicação carregue em milissegundos, mesmo em redes móveis de baixa velocidade.

3.  **Fase de Resultados e Distribuição Operacional**:
    *   Publicação transparente das pautas finais.
    *   **Agrupamento Inteligente**: Organização automática de brigadas (ex: 3 elementos por brigada de recenseamento) e mesas de voto.

---

## 3. SISTEMA DE NOTIFICAÇÕES E CONSULTA MULTI-CANAL
A plataforma garante que a informação chegue a todos os candidatos através de:
*   **Aplicação Móvel**: Controlo total e visualização do QR Code.
*   **Comando USSD**: Consulta de resultados para telemóveis básicos (sem internet).
*   **Alertas SMS**: Notificações automáticas de aprovação ou alteração de local.

---

## 4. CONCLUSÃO
Esta visão integrada transforma o STAE-Sofala num exemplo de transparência administrativa, assegurando que cada agente eleitoral seja identificado com rigor técnico desde o primeiro dia da formação.

**BEIRA, 19 DE MARÇO DE 2026**
**Equipa Técnica de Desenvolvimento**
