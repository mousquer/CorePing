module.exports = {
    getPackageJson: () => ({
        "name": "omnisender",
        "version": "1.0.5",
        "description": "OmniSender - Whatsapp e Discord.",
        "main": "src/app.js",
        "scripts": {
            "dev": "nodemon src/app.js",
            "start": "pm2 start ecosystem.config.js --env production",
            "stop": "pm2 stop ecosystem.config.js",
            "restart": "pm2 restart ecosystem.config.js",
            "logs": "pm2 logs",
            "prisma:migrate": "npx prisma migrate dev --name init",
            "prisma:generate": "npx prisma generate"
        },
        "dependencies": {
            "bcryptjs": "^2.4.3", 
            "cookie-parser": "^1.4.7", 
            "dotenv": "^16.3.1",
            "ejs": "^3.1.10", 
            "express": "^4.21.2", 
            "express-validator": "^7.0.1",
            "express-rate-limit": "^7.1.0",
            "helmet": "^7.1.0",
            "jsonwebtoken": "^9.0.2",
            "socket.io": "^4.7.2", 
            "whatsapp-web.js": "https://github.com/pedroslopez/whatsapp-web.js/tarball/main", 
            "axios": "^1.7.9",
            "pm2": "^5.3.0", 
            "@prisma/client": "^5.22.0",
            "multer": "^1.4.5-lts.1", 
            "form-data": "^4.0.0",
            "qrcode": "^1.5.3",
            "nodemailer": "^6.9.7"
        },
        "devDependencies": { 
            "nodemon": "^3.0.1", 
            "prisma": "^5.22.0" 
        }
    }),

    getEcosystem: () => `
    module.exports = {
      apps : [{
        name   : "omnisender",
        script : "./src/app.js",
        watch  : false,
        max_memory_restart: '600M',
        autorestart: true,
        env: { NODE_ENV: "development" },
        env_production: { NODE_ENV: "production" }
      }]
    }`,

    getEnv: () => {
        const crypto = require('crypto');
        return `PORT=3000\nJWT_SECRET=${crypto.randomBytes(32).toString('hex')}\nNODE_ENV=production`;
    },

    getReadme: (osType) => `
# OmniSender v1.0.5

Hub de notificações centralizado para WhatsApp e Discord.

## ⚡ Recursos Principais
* **Multi-Canal:** Envio simultâneo para Grupos WhatsApp e Webhooks Discord.
* **Editor Produtivo:** Atalhos de teclado, Emojis, Links e Imagens.
* **Smart Splitter:** Mensagens longas são divididas automaticamente.
* **Configuração Robusta:** Painel de controle com salvamento em tempo real (AJAX).

## 📋 Instalação (Windows/Linux)
1. Baixe e extraia.
2. \`node setup.js\`
3. Escolha **[1] Instalar/Atualizar**.
4. Acesse: \`http://localhost:3000\`
`
};