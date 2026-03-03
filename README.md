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
