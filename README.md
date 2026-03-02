# OmniSender: Unified Open-Source Messaging
OmniSender is a self-hosted Node.js application designed to broadcast messages simultaneously to Discord and WhatsApp.

The project's goal is to facilitate and democratize multichannel communication. Without the need to subscribe to third-party services for basic features, OmniSender allows you to centralize your messaging for free in a straightforward manner. The tool was built to be accessible, running seamlessly on both Windows and Linux environments.

## Features (v1.0.0)
The first release delivers the essentials for your messaging workflow, focusing on usability, control, and security:

**Simplified Setup:**

* **WhatsApp:** Quickly connect your account via QR Code scanning using your device's camera directly within the interface.

* **Discord:** Easily configure the destination channel using your Webhook.

* **Granular Destination Control:** Flexibility to broadcast your message to both platforms simultaneously or select just one, depending on your needs.

* **Access Management:** Role-Based Access Control (RBAC) featuring Super Admin, Admin, and Sender privilege levels, ensuring that only authorized users can dispatch messages.

* **Audit and Logging:** Comprehensive activity history, recording the message title and the user responsible for the broadcast.

* **Smart Splitting:** Messages exceeding 2,000 characters are automatically divided and paginated (e.g., [1/3], [2/3], [3/3]), natively bypassing the limitations of Discord's free tier.

* **User Experience (UX):** Clean interface with a real-time character counter and a security confirmation modal to prevent accidental long-text dispatches.

* **Security First:** During installation, the system performs a scan and automatically alerts you if any package dependency contains known vulnerabilities.

## Installation
To run the project locally, clone the repository and execute the following commands in the root directory:

Bash
    npm install
    npm run prisma:generate
    n pm run prisma:migrate
    npm run dev
(Note: The application will initialize automatically after the setup is complete).

## Roadmap (Upcoming Features)

Our next development steps include:

* **New Integrations:** Support for broadcasting on Telegram and Google Chat.

* **Interface Enhancements:** Preview screen (view how the message will render on each platform before sending) and a secure password recovery flow.

* **Community Management:** Creation and segmentation of recipient groups.

* **Active Control:** The ability to delete previously sent messages directly from the OmniSender dashboard.

* **Optimized Setup:** Refactoring and error handling in the installation process to make it fail-safe.
