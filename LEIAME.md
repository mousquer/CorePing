# CorePing: Envio de mensagens para Discord e WhatsApp em um local
O CorePing é uma aplicação self-hosted desenvolvida em Node.js, projetada para disparar mensagens simultaneamente para o Discord e o WhatsApp.

O objetivo do projeto é facilitar e democratizar a comunicação multicanal. Sem a necessidade de assinar serviços de terceiros para funções simples, o CorePing permite que você centralize seus envios de forma gratuita e direta. 

A ferramenta foi desenhada para ser acessível, rodando perfeitamente tanto em ambientes Windows quanto Linux.

## Funcionalidades (v1.0.5)
A primeira versão já entrega o essencial para o fluxo de mensagens, com foco em usabilidade, controle e segurança:

* **Windows/Linux/AWS:** Instale em apenas alguns minutos no ambiente que você mais está familiarizado (Pode rodar até localmente no seu computador).

* **WhatsApp:** Conecte sua conta rapidamente através da leitura de QR Code usando a câmera do seu dispositivo direto na interface.

* **Discord:** Configure facilmente o canal de destino utilizando seu Webhook.

* **Controle Granular de Destino:** Flexibilidade para enviar a mensagem para ambas as plataformas simultaneamente ou selecionar apenas uma delas, conforme a necessidade da sua campanha.

* **Bloqueio de Segurança:** Ajuste inteligente na tela de envio que desabilita o disparo e emite um alerta caso o usuário tente enviar uma mensagem sem ter pelo menos uma aplicação (WhatsApp ou Discord) configurada no sistema.

* **Gestão de Acessos:** Controle de acesso baseado em funções (RBAC) com níveis de privilégio: Super Admin, Admin e Sender, garantindo que apenas pessoas autorizadas façam os disparos.

* **Auditoria e Histórico:** Registro completo das atividades, gravando o título da mensagem e o usuário responsável pelo envio.

* **Smart Splitting (Divisão Inteligente):** Mensagens com mais de 2.000 caracteres são divididas e paginadas automaticamente (ex: [1/3], [2/3], [3/3]), contornando nativamente as limitações da versão gratuita do Discord.

* **Experiência do Usuário (UX):** Interface limpa com contador de caracteres em tempo real, atalhos de edição de texto e modal de confirmação de segurança para evitar o envio acidental de textos longos.

* **Security First:** Durante a instalação, o sistema realiza uma varredura e alerta automaticamente caso alguma dependência do pacote possua vulnerabilidades conhecidas.

## Pré-requisitos
Node.js: Versão 18.x ou superior instalada no seu sistema operacional.

* **Git:** Para realizar a clonagem do repositório (Não obrigatório).

* **Linux/AWS:** É necessário que as bibliotecas base do sistema operacional estejam atualizadas, pois o motor do WhatsApp (Puppeteer) roda em background e exige dependências nativas como libnss3.

## Como Instalar
A instalação acontece de forma totalmente automática. O script de setup detecta se você está utilizando Windows, Linux ou instâncias em nuvem (AWS) e cuida da instalação de pacotes e formatação do banco de dados sozinho.

Para rodar o projeto localmente ou em seu servidor, clone o repositório e execute os comandos abaixo na raiz do diretório:

Bash

diretamente em node:
```
  node .\setup.js
```
OU

Direto na aplicação.
```
    npm install
    npm run prisma:generate
    npm run prisma:migrate
    npm run dev
```
(Nota: A aplicação será inicializada automaticamente após a conclusão da configuração).

## Roadmap (Funcionalidades Futuras)
Próximos passos de desenvolvimento incluem:

* **Novas Integrações:** Suporte para disparos no Telegram e no Google Chat.

* **Melhorias de Interface:** Tela de preview (visualize como a mensagem será renderizada em cada plataforma antes do envio) e fluxo seguro para recuperação de senha.

* **Gestão de Comunidades:** Criação e segmentação de grupos de envio.

* **Controle Ativo:** Capacidade de excluir/editar mensagens já enviadas diretamente pelo painel do CorePing.

* **Setup Otimizado**: Refatoração e tratamento de erros no processo de instalação para torná-lo à prova de falhas.
