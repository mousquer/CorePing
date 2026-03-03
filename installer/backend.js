module.exports = {
    getAppJs: (osType) => {
        const isLinux = osType === 'linux' || osType === 'amazon';
        const puppeteerConfig = isLinux ? 
            `puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-first-run', '--single-process', '--disable-extensions'], timeout: 0 }` : `puppeteer: { timeout: 0 }`; 

        return `
require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const https = require('https');
const { Server } = require('socket.io');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const qrcode = require('qrcode');
const os = require('os');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            frameAncestors: ["'self'"],
            upgradeInsecureRequests: null
        }
    },
    crossOriginEmbedderPolicy: false
}));

const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 100 });

let server;
let protocol = 'http';
try {
    if (fs.existsSync('server.key') && fs.existsSync('server.cert')) {
        server = https.createServer({ key: fs.readFileSync('server.key'), cert: fs.readFileSync('server.cert') }, app);
        protocol = 'https';
    } else { server = createServer(app); }
} catch (e) { server = createServer(app); }

const io = new Server(server);

const upload = multer({ 
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'public/uploads/'),
        filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
    }),
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Apenas imagens (JPG, PNG, GIF).'));
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});
if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

let systemConfig = {};
let whatsappGroups = [];
let lastQrCode = null;
let isClientReady = false;
let waState = { status: 'IDLE', desc: 'Serviço Parado', percent: 0 };

async function loadConfig() {
    try {
        const configs = await prisma.systemConfig.findMany();
        configs.forEach(c => systemConfig[c.key] = c.value);
    } catch (e) {}
}
loadConfig();

function logServer(type, msg) {
    const time = new Date().toLocaleTimeString();
    console.log(\`[\${time}] [\${type}] \${msg}\`);
}

function formatMessageForPlatform(text, platform) {
    if (!text) return "";
    if (platform === 'discord') {
        return text
            .replace(/\\*([^\\*]+)\\*/g, '**$1**')
            .replace(/~([^~]+)~/g, '~~$1~~')
            .replace(/(?<!_)_([^_]+)_(?!_)/g, '*$1*'); 
    }
    return text;
}

function deleteSessionFolder() {
    const sessionPath = path.resolve(__dirname, '.wwebjs_auth');
    if (fs.existsSync(sessionPath)) {
        try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (e) {}
    }
}

// --- ENGINE WHATSAPP ---
function updateState(status, desc, percent = 0) {
    if (waState.status !== status || waState.desc !== desc || waState.percent !== percent) {
        waState.status = status; waState.desc = desc; waState.percent = percent;
        if (status !== 'SYNCING') logServer('WA', \`\${status} - \${desc}\`);
        io.emit('wa_status', waState);
    }
}

let client;
let watchdogTimer;

function stopWhatsapp(cleanSession = false) {
    if (watchdogTimer) clearTimeout(watchdogTimer);
    if (client) { try { client.destroy(); } catch(e) {} client = null; }
    if (cleanSession) deleteSessionFolder();
    isClientReady = false; lastQrCode = null; whatsappGroups = [];
    updateState('IDLE', 'Serviço Parado.');
}

function startWhatsapp() {
    if (client) return; 
    updateState('STARTING', 'Iniciando...');
    client = new Client({ authStrategy: new LocalAuth(), authTimeoutMs: 0, qrMaxRetries: 0, ${puppeteerConfig} });

    client.on('qr', (qr) => {
        if (waState.status !== 'AUTHENTICATED' && waState.status !== 'SYNCING') {
            updateState('QR', 'Aguardando Leitura');
            qrcode.toDataURL(qr, (err, url) => { if (!err) { lastQrCode = url; io.emit('qr', url); } });
        }
    });

    client.on('loading_screen', (pct) => updateState('SYNCING', \`Sincronizando: \${pct}%\`, pct));

    client.on('authenticated', () => {
        updateState('AUTHENTICATED', 'Autenticado');
        lastQrCode = null;
        if (watchdogTimer) clearTimeout(watchdogTimer);
        watchdogTimer = setTimeout(() => {
            if (!isClientReady) { stopWhatsapp(false); updateState('FAILED', 'Tempo limite excedido.'); }
        }, 180000);
    });

    client.on('ready', async () => {
        if (watchdogTimer) clearTimeout(watchdogTimer);
        isClientReady = true; lastQrCode = null;
        updateState('CONNECTED', 'Conectado');
        setTimeout(async () => { await fetchGroups(); }, 1000);
    });

    client.on('message_create', (msg) => {
        if (isClientReady && msg.from.includes('@g.us')) {
            const exists = whatsappGroups.some(g => g.id === msg.from);
            if (!exists) {
                msg.getChat().then(chat => {
                    if (!chat.isReadOnly) { 
                        whatsappGroups.push({ name: chat.name, id: chat.id._serialized });
                        io.emit('groups_refresh', whatsappGroups);
                    }
                }).catch(() => {});
            }
        }
    });

    client.on('disconnected', (r) => { logServer('WA', 'Desconectado: '+r); stopWhatsapp(); });
    client.on('auth_failure', (msg) => { logServer('WA', 'Falha Auth'); stopWhatsapp(true); });
    client.initialize().catch(e => { logServer('ERROR', 'Erro Init: '+e.message); stopWhatsapp(); updateState('FAILED', 'Falha ao iniciar.'); });
}

async function fetchGroups() {
    if (!client) return;
    updateState('FETCHING_GROUPS', 'Buscando permissões...');
    const uniqueGroups = new Map();
    try {
        const contacts = await client.getContacts();
        contacts.forEach(c => {
            if (c.isGroup) {
                uniqueGroups.set(c.id._serialized, { name: c.name || "Grupo Sem Nome", id: c.id._serialized });
            }
        });
    } catch (e) { logServer('ERROR', "Erro na busca: " + e.message); }

    whatsappGroups = Array.from(uniqueGroups.values());
    io.emit('groups_refresh', whatsappGroups);
    updateState('CONNECTED', 'Pronto para envio');
    logServer('WA', \`\${whatsappGroups.length} grupos carregados.\`);
}

io.on('connection', (socket) => {
    socket.emit('wa_status', waState);
    if (whatsappGroups.length > 0) socket.emit('groups_refresh', whatsappGroups);
    if (waState.status === 'QR' && lastQrCode) socket.emit('qr', lastQrCode);
});

// --- AUTH E RECUPERAÇÃO DE SENHA ---
app.post('/api/auth/forgot', loginLimiter, async (req, res) => {
    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.json({ success: false, msg: 'Email não encontrado em nossa base.' });
        
        if (!user.passwordHint || !user.hintAnswer) {
            return res.json({ success: false, msg: 'Sua conta não possui uma Dica e Palavra Secreta configurada. Contate o Administrador.' });
        }

        if (!systemConfig.smtpHost || !systemConfig.smtpUser || !systemConfig.smtpPass) {
            return res.json({ success: false, msg: 'SMTP não configurado no sistema. Recuperação por e-mail indisponível.' });
        }

        const transporter = nodemailer.createTransport({
            host: systemConfig.smtpHost,
            port: parseInt(systemConfig.smtpPort),
            auth: { user: systemConfig.smtpUser, pass: systemConfig.smtpPass }
        });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 90000);

        await prisma.user.update({
            where: { email },
            data: { recoveryCode: code, recoveryExpires: expires }
        });

        await transporter.sendMail({
            from: systemConfig.smtpUser || 'noreply@omnisender.com',
            to: email,
            subject: 'OmniSender - Recuperação de Senha',
            html: \`<h3>Recuperação de Senha</h3>
                   <p>Você solicitou a redefinição de sua senha no OmniSender.</p>
                   <p>Seu código de segurança é: <strong>\${code}</strong></p>
                   <p><em>Atenção: Este código expira em 90 segundos.</em></p>\`
        });

        res.json({ success: true, hint: user.passwordHint });
    } catch (e) {
        logServer('ERROR', 'SMTP Falhou: ' + e.message);
        if(e.message.includes('535-5.7.8')) {
            return res.json({ success: false, msg: 'Falha SMTP: O Gmail bloqueou o envio. Acesse sua Conta Google, gere uma "Senha de App" e atualize o painel Admin.' });
        }
        res.json({ success: false, msg: 'Erro ao enviar o e-mail. Verifique o servidor SMTP.' });
    }
});

app.post('/api/auth/reset', loginLimiter, async (req, res) => {
    const { email, code, hintAnswer, newPassword } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.json({ success: false, msg: 'Usuário não encontrado.' });
        
        if (user.hintAnswer && hintAnswer.toLowerCase().trim() !== user.hintAnswer) {
            return res.json({ success: false, msg: 'A Palavra Secreta está incorreta.' });
        }

        if (user.recoveryCode !== code) return res.json({ success: false, msg: 'Código OTP inválido.' });
        if (new Date() > user.recoveryExpires) return res.json({ success: false, msg: 'Código expirado. Solicite um novo.' });

        const hash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { email },
            data: { password: hash, recoveryCode: null, recoveryExpires: null }
        });

        res.json({ success: true, msg: 'Senha atualizada.' });
    } catch (e) {
        res.json({ success: false, msg: 'Erro interno na redefinição.' });
    }
});

const checkAuth = async (req, res, next) => {
    try {
        const userCount = await prisma.user.count();
        if (userCount === 0 && req.path !== '/setup') return res.redirect('/setup');
        
        // Bloqueia a volta pro setup1 se já tem usuário
        if (userCount > 0 && req.path === '/setup') return res.redirect('/login');
        
        if (req.path === '/login' || req.path === '/setup' || req.path.startsWith('/api/auth')) return next();
        
        const token = req.cookies.token;
        if (!token) return res.redirect('/login');
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) { res.clearCookie('token'); return res.redirect('/login'); }
};
app.use(checkAuth);

async function renderDashboard(req, res, extra = {}) {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isSuper: true, passwordHint: true }});
    const logs = await prisma.log.findMany({ include: { user: true }, orderBy: { sentAt: 'desc' }, take: 20 });
    res.render('dashboard', { user: req.user, users, logs, config: systemConfig, waGroups: whatsappGroups, waState, activeTab: extra.activeTab || 'send', error: extra.error });
}

// --- ROTAS DO SISTEMA ---
app.get('/', async (req, res) => renderDashboard(req, res, { activeTab: req.query.tab }));
app.get('/login', (req, res) => res.render('login'));
app.get('/setup', (req, res) => res.render('setup'));
app.get('/logout', (req, res) => { res.clearCookie('token'); res.redirect('/login'); });

// Nova rota GET SMTP
app.get('/setup/smtp', (req, res) => {
    if (!req.user || !req.user.isSuper) return res.redirect('/');
    res.render('setupSmtp');
});

app.post('/login', loginLimiter, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { email: req.body.email } });
        if (!user || !await bcrypt.compare(req.body.password, user.password)) return res.render('login', { error: 'Credenciais inválidas' });
        const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.cookie('token', token, { httpOnly: true, secure: protocol === 'https' });
        res.redirect('/');
    } catch(e) { res.render('login', { error: 'Erro no servidor' }); }
});

app.post('/setup', async (req, res) => {
    if(await prisma.user.count() > 0) return res.redirect('/login');
    try {
        const cleanName = req.body.name.replace(/[^a-zA-Z0-9 À-ÿ]/g, "");
        const safeAnswer = req.body.hintAnswer ? req.body.hintAnswer.trim().toLowerCase() : "";
        
        const user = await prisma.user.create({ data: { 
            name: cleanName, 
            email: req.body.email, 
            password: await bcrypt.hash(req.body.password, 10), 
            passwordHint: req.body.hint,
            hintAnswer: safeAnswer,
            role: 'admin', 
            isSuper: true 
        }});

        // Loga o usuário automaticamente para permitir acesso ao /setup/smtp
        const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.cookie('token', token, { httpOnly: true, secure: protocol === 'https' });
        
        res.redirect('/setup/smtp');
    } catch(e) { 
        console.error("[ERRO CRÍTICO NO SETUP DO DB]", e);
        res.render('setup', { error: "Falha ao criar Super Admin. Tente rodar o instalador escolhendo [2] Reinstalar para atualizar a tabela." }); 
    }
});

// Nova rota POST SMTP
app.post('/setup/smtp', async (req, res) => {
    if (!req.user || !req.user.isSuper) return res.redirect('/');
    
    if (req.body.action === 'skip') {
        await prisma.systemConfig.upsert({ where: { key: 'smtpSkipped' }, update: { value: 'true' }, create: { key: 'smtpSkipped', value: 'true' } });
        return res.redirect('/');
    }

    try {
        const smtpHost = req.body.smtpHost ? req.body.smtpHost.trim() : '';
        const smtpPort = parseInt(req.body.smtpPort, 10);
        const smtpUser = req.body.smtpUser ? req.body.smtpUser.trim() : '';
        const smtpPass = req.body.smtpPass ? req.body.smtpPass.substring(0, 24) : '';

        const hostRegex = /^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;

        if (!hostRegex.test(smtpHost)) throw new Error("Servidor SMTP com formato inválido.");
        if (isNaN(smtpPort) || smtpPort < 1 || smtpPort > 65535) throw new Error("Porta SMTP inválida.");
        if (!emailRegex.test(smtpUser)) throw new Error("E-mail SMTP inválido.");
        if (!smtpPass) throw new Error("Senha de App é obrigatória.");

        await prisma.systemConfig.upsert({ where: { key: 'smtpHost' }, update: { value: smtpHost }, create: { key: 'smtpHost', value: smtpHost } });
        await prisma.systemConfig.upsert({ where: { key: 'smtpPort' }, update: { value: smtpPort.toString() }, create: { key: 'smtpPort', value: smtpPort.toString() } });
        await prisma.systemConfig.upsert({ where: { key: 'smtpUser' }, update: { value: smtpUser }, create: { key: 'smtpUser', value: smtpUser } });
        await prisma.systemConfig.upsert({ where: { key: 'smtpPass' }, update: { value: smtpPass }, create: { key: 'smtpPass', value: smtpPass } });
        
        await loadConfig();
        res.redirect('/');
    } catch(e) { res.render('setupSmtp', { error: "Erro de Validação: " + e.message }); }
});

app.post('/api/whatsapp/action', async (req, res) => {
    if(req.user.role !== 'admin') return res.status(403).json({error: 'Negado'});
    const { action } = req.body;
    if (action === 'start') { startWhatsapp(); return res.json({ success: true, msg: 'Iniciando...' }); }
    if (action === 'stop') { stopWhatsapp(false); return res.json({ success: true, msg: 'Parado.' }); }
    if (action === 'logout') { stopWhatsapp(true); return res.json({ success: true, msg: 'Desconectado.' }); }
    if (action === 'restart') { stopWhatsapp(false); setTimeout(startWhatsapp, 2000); return res.json({ success: true, msg: 'Reiniciando...' }); }
    if (action === 'refresh') { 
        if(isClientReady) { await fetchGroups(); return res.json({ success: true, msg: 'Atualizando...' }); }
        else return res.json({ success: false, msg: 'Offline.' }); 
    }
    res.json({ success: false });
});

app.post('/api/send', (req, res) => {
    upload.single('image')(req, res, async function (err) {
        if (err) return renderDashboard(req, res, { error: 'Erro upload: ' + err.message, activeTab: 'send' });
        
        if (!systemConfig.waGroupId && !systemConfig.dcWebhook) {
            return renderDashboard(req, res, { error: 'Ação Bloqueada: Nenhuma plataforma foi configurada.', activeTab: 'send' });
        }

        const { title, message, platform } = req.body;
        const hasImage = !!req.file;
        const cleanTitle = title ? title.trim() : "Aviso";
        const caption = \`*\${cleanTitle.toUpperCase()}*\n\n\${message}\`;

        if ((platform === 'both' || platform === 'whatsapp') && systemConfig.waGroupId && isClientReady) {
            try {
                const media = hasImage ? MessageMedia.fromFilePath(req.file.path) : null;
                await client.sendMessage(systemConfig.waGroupId, media || caption, media ? { caption } : {});
            } catch(e) { logServer('ERROR', 'Erro WA: '+e.message); }
        }
        
        if ((platform === 'both' || platform === 'discord') && systemConfig.dcWebhook) {
            try {
                const discordMsg = formatMessageForPlatform(message, 'discord');
                const discordTitle = \`**\${cleanTitle.toUpperCase()}**\n\n\`;
                const finalDesc = discordTitle + discordMsg;
                const payload = { username: systemConfig.dcBotName || 'OmniBot', embeds: [{ description: finalDesc, color: 3447003, image: hasImage ? { url: 'attachment://image.png' } : undefined }] };
                const form = new FormData();
                form.append('payload_json', JSON.stringify(payload));
                if(hasImage) form.append('file', fs.createReadStream(req.file.path), 'image.png');
                await axios.post(systemConfig.dcWebhook, hasImage ? form : payload, hasImage ? { headers: form.getHeaders() } : {});
            } catch(e) { logServer('DISCORD', 'Erro webhook: ' + e.message); }
        }
        await prisma.log.create({ data: { title: cleanTitle, message, platform, hasAttachment: hasImage, userId: req.user.id } });
        res.redirect('/?tab=send');
    });
});

app.post('/api/config/set-group', async (req, res) => {
    if(!req.body.waGroupId) return renderDashboard(req, res, { error: 'Selecione um grupo.' });
    await prisma.systemConfig.upsert({ where: { key: 'waGroupId' }, update: { value: req.body.waGroupId }, create: { key: 'waGroupId', value: req.body.waGroupId } });
    systemConfig['waGroupId'] = req.body.waGroupId;
    renderDashboard(req, res, { success: 'Salvo.' });
});

app.post('/api/config/discord', async (req, res) => {
    if(req.user.role !== 'admin' && !req.user.isSuper) return res.redirect('/');
    
    const webhook = req.body.dcWebhook ? req.body.dcWebhook.trim() : '';
    
    // Validação Rigorosa de Back-end
    if(webhook && !webhook.startsWith('https://discord.com/api/webhooks/')) {
        return renderDashboard(req, res, { error: 'Formato de Webhook Inválido. A URL deve obrigatóriamente iniciar com: https://discord.com/api/webhooks/', activeTab: 'send' });
    }

    if(webhook) {
        await prisma.systemConfig.upsert({ where: { key: 'dcWebhook' }, update: { value: webhook }, create: { key: 'dcWebhook', value: webhook } });
        systemConfig['dcWebhook'] = webhook;
    }
    const bn = req.body.dcBotName ? req.body.dcBotName.trim().replace(/\\s+/g, '_') : 'OmniBot';
    await prisma.systemConfig.upsert({ where: { key: 'dcBotName' }, update: { value: bn }, create: { key: 'dcBotName', value: bn } });
    systemConfig['dcBotName'] = bn;
    if (req.body.dcServerName) {
        await prisma.systemConfig.upsert({ where: { key: 'dcServerName' }, update: { value: req.body.dcServerName }, create: { key: 'dcServerName', value: req.body.dcServerName } });
        systemConfig['dcServerName'] = req.body.dcServerName;
    }
    if (req.body.dcChannelName) {
        await prisma.systemConfig.upsert({ where: { key: 'dcChannelName' }, update: { value: req.body.dcChannelName }, create: { key: 'dcChannelName', value: req.body.dcChannelName } });
        systemConfig['dcChannelName'] = req.body.dcChannelName;
    }
    res.redirect('/');
});

app.post('/api/config/general', upload.single('logo'), async (req, res) => {
    if(req.body.serverName) {
        const sName = req.body.serverName.trim();
        await prisma.systemConfig.upsert({ where: { key: 'serverName' }, update: { value: sName }, create: { key: 'serverName', value: sName } });
        systemConfig['serverName'] = sName;
    }
    if (req.file) await prisma.systemConfig.upsert({ where: { key: 'logoUrl' }, update: { value: '/uploads/'+req.file.filename }, create: { key: 'logoUrl', value: '/uploads/'+req.file.filename } });
    res.redirect('/');
});

app.post('/api/users/add', async (req, res) => {
    if(req.user.role !== 'admin') return res.status(403).send('Negado');
    if (!req.user.isSuper && req.body.role === 'admin') return renderDashboard(req, res, { error: 'Permissão insuficiente.', activeTab: 'users' });
    
    try { 
        const existing = await prisma.user.findUnique({ where: { email: req.body.email } });
        if (existing) {
            return renderDashboard(req, res, { error: 'Este e-mail já está cadastrado no sistema.', activeTab: 'users' });
        }

        await prisma.user.create({ data: { 
            name: req.body.name, 
            email: req.body.email, 
            password: await bcrypt.hash(req.body.password, 10), 
            passwordHint: req.body.hint,
            hintAnswer: req.body.hintAnswer.trim().toLowerCase(),
            role: req.body.role || 'sender', 
            isSuper: false 
        }}); 
        res.redirect('/?tab=users'); 
    } catch(e) { renderDashboard(req, res, { error: 'Erro ao criar usuário.', activeTab: 'users' }); }
});

app.post('/api/users/delete', async (req, res) => {
    try { 
        const target = await prisma.user.findUnique({where:{id:parseInt(req.body.id)}});
        if(!target) return res.redirect('/?tab=users');
        if(target.isSuper) return renderDashboard(req, res, { error: "Dono protegido.", activeTab: 'users' });
        if(target.role === 'admin' && !req.user.isSuper) return renderDashboard(req, res, { error: "Apenas Dono remove Admins.", activeTab: 'users' });
        if(req.user.role !== 'admin') return res.status(403).send("Negado.");
        await prisma.user.delete({where:{id:target.id}}); 
        res.redirect('/?tab=users'); 
    } catch(e){ res.redirect('/?tab=users'); }
});

server.listen(process.env.PORT || 3000, () => {
    console.log("-----------------------------------");
    console.log(\`Servidor Online: \${protocol}://\${getIp()}:\${process.env.PORT || 3000}\`);
    console.log("-----------------------------------");
});

function getIp() { const i = os.networkInterfaces(); for(let n in i) for(let d of i[n]) if(d.family==='IPv4' && !d.internal) return d.address; return 'localhost'; }
`;
    },
    
    getResetScript: () => `const {PrismaClient}=require('@prisma/client');const prisma=new PrismaClient();const bcrypt=require('bcryptjs');const readline=require('readline');const rl=readline.createInterface({input:process.stdin,output:process.stdout});const ask=q=>new Promise(r=>rl.question(q,r));async function main(){console.clear();console.log("=== RESET SENHA ===");const email=await ask("Email: ");const u=await prisma.user.findUnique({where:{email}});if(!u)process.exit(1);const p1=await ask("Senha: ");const p2=await ask("Confirma: ");if(p1!==p2)process.exit(1);if((await ask("CONFIRMAR? "))!=='CONFIRMAR')process.exit(0);await prisma.user.update({where:{email},data:{password:await bcrypt.hash(p1,10)}});console.log("OK");process.exit(0);}main();`
};