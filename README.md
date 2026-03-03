## Este readme está escrito em Português e Inglês. |  This readme its in Portuguese and English bellow.


## Português.
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

## English Version.

# CorePing: Unified and Open-Source Messaging
CorePing is a self-hosted application developed in Node.js, designed to broadcast messages simultaneously to Discord and WhatsApp.

The project's goal is to facilitate and democratize multichannel communication. Without the need to subscribe to third-party services for simple functions, CorePing allows you to centralize your broadcasts directly and for free. The tool was designed to be accessible, running perfectly in both Windows and Linux environments.

## Features (v1.0.4)
The first release already delivers the essentials for the messaging workflow, focusing on usability, control, and security:

* **Windows/Linux/AWS:** Install in just a few minutes in the environment you are most familiar with (can even run locally).

* **WhatsApp:** Quickly connect your account by scanning a QR Code using your device's camera directly in the interface.

* **Discord:** Easily configure the destination channel using your Webhook.

* **Granular Destination Control:** Flexibility to send the message to both platforms simultaneously or select only one, according to your campaign's needs.

* **Security Lock:** Smart adjustment on the sending screen that disables broadcasting and issues an alert if the user tries to send a message without having at least one application (WhatsApp or Discord) configured in the system.

* **Access Management:** Role-based access control (RBAC) with privilege levels: Super Admin, Admin, and Sender, ensuring only authorized personnel can broadcast.

* **Auditing and History:** Complete log of activities, recording the message title and the user responsible for the broadcast.

* **Smart Splitting:** Messages longer than 2,000 characters are automatically split and paginated (e.g., [1/3], [2/3], [3/3]), natively bypassing Discord's free version limitations.

* **User Experience (UX):** Clean interface with a real-time character counter and a security confirmation modal to prevent accidental sending of long texts.

* **Security First:** During installation, the system scans and automatically alerts you if any package dependency has known vulnerabilities.

## Prerequisites
* **Node.js:** Version 18.x or higher installed on your system.

* **Git:** To clone the repository (no mandatory).

* **Linux/AWS:** Base operating system libraries must be up-to-date, as the WhatsApp engine (Puppeteer) runs in the background and requires native dependencies like libnss3.

## How to Install
The installation is fully automatic. The setup script detects whether you are using Windows, Linux, or cloud instances (AWS) and handles package installation and database formatting on its own.

To run the project locally or on your server, clone the repository and run the commands below in the root directory:

Bash

directly in node:
```
  node .\setup.js
```
OR

Directly in the application.
```
    npm install
    npm run prisma:generate
    npm run prisma:migrate
    npm run dev
```
(Note: The application will start automatically after the setup is complete).

## Roadmap (Future Features)
Our next development steps include:

* **New Integrations:** Support for broadcasting to Telegram and Google Chat.

* **Interface Improvements:** Preview screen (see how the message will be rendered on each platform before sending) and a secure password recovery flow.

* **Community Management:** Creation and segmentation of broadcasting groups.

* **Active Control:** Ability to delete already sent messages directly from the CorePing panel.

* **Optimized Setup:** Refactoring and error handling in the installation process to make it fail-proof.
