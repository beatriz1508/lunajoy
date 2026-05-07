# Sales AI — Documento de Handoff

**Repositório:** https://github.com/beatriz1508/lunajoy  
**Deploy:** Vercel (projeto `sales-ai`)  
**Stack:** Next.js 14 · Supabase · OpenAI · GoHighLevel · Apify · Hunter.io

---

## O que é esse projeto

Plataforma interna de IA para o time de vendas da LunaJoy. O objetivo é acelerar o trabalho do consultor de vendas em cada etapa do ciclo — desde prospectar leads até escrever emails e preparar reuniões.

---

## Funcionalidades

| Módulo | O que faz |
|---|---|
| **Copilot** | Chat com IA que tem acesso à base de conhecimento e histórico de leads |
| **Emails** | Gera emails de outreach personalizados por clínica e envia via Gmail |
| **Leads** | Busca clínicas no Google Maps (via Apify), enriquece com dados e emails, e empurra para o GHL |
| **Meetings** | Gera documento de preparação para reuniões com contexto da clínica |
| **Brainstorm** | Assistente de IA para ideias e estratégias de vendas |
| **Training** | Sessões de treinamento gamificadas com XP e níveis |
| **Knowledge** | Base de conhecimento compartilhada (objeções, playbooks, argumentos) |
| **Playbook / GHL Playbook** | Referência de processo de vendas e fluxo de ligações no GHL |
| **History** | Histórico de sessões e ações do consultor |

---

## Automação separada — Gmail BCC → GHL

Além do app principal, existe uma automação em `lunajoy-gmail-ghl-sync/` que roda via **n8n**:

Quando um consultor envia um email de cold outreach para uma nova clínica e adiciona um inbox de automação no BCC, o sistema:
1. Detecta o email recebido
2. Verifica se o contato já existe no GHL
3. Se não existir, cria o contato e registra o email como conversa no GHL

Isso resolve o problema em que o conector nativo do GHL só funciona para contatos que já existem.

---

## Integrações externas

| Serviço | Para que serve |
|---|---|
| **Supabase** | Banco de dados e autenticação (Google OAuth) |
| **OpenAI** | Geração de texto, busca semântica, enriquecimento de leads |
| **GoHighLevel (GHL)** | CRM — leads são criados e gerenciados aqui |
| **Apify** | Scraping de clínicas no Google Maps |
| **Hunter.io** | Descoberta de emails por domínio |
| **Google Service Account** | Envio de emails via Gmail e acesso ao Google Calendar |
| **n8n** | Automação de workflows (Gmail BCC → GHL) |

---

## Como configurar do zero

1. Clonar o repo: `git clone https://github.com/beatriz1508/lunajoy.git`
2. Instalar dependências: `npm install`
3. Copiar variáveis de ambiente: `cp .env.local.example .env.local` e preencher com as credenciais
4. Criar o banco de dados: rodar `supabase/schema.sql` no Supabase SQL Editor
5. Rodar local: `npm run dev`
6. Para publicar: importar o repo no Vercel (vercel.com/new) e adicionar as variáveis de ambiente

O arquivo `.env.local.example` lista todas as variáveis necessárias e de onde obter cada uma.

O [README.md](README.md) no repositório tem o guia completo passo a passo.

---

## Observações importantes

- O login é via **Google OAuth** (Supabase Auth) — só emails autorizados conseguem entrar
- O envio de emails usa um **Google Service Account** com delegação de domínio — não é OAuth do usuário
- O token do GHL (Private Integration) expira — se parar de funcionar, gerar um novo em GHL → Settings → Integrations
- O projeto foi desenvolvido com **Claude Code** (IA da Anthropic) e pode ser continuado da mesma forma
