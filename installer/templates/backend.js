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

// [MODIFICADO] Função ajustada para suportar sublinhado e conversão correta
function formatMessageForPlatform(text, platform) {
    if (!text) return "";
    if (platform === 'discord') {
        return text
            .replace(/\\*([^\\*]+)\\*/g, '**$1**')   // Bold: *txt* -> **txt**
            .replace(/~([^~]+)~/g, '~~$1~~')     // Strike: ~txt~ -> ~~txt~~
            // [MODIFICADO] Regex de Itálico alterada para ignorar quando for sublinhado duplo (__)
            // Usa Lookbehind negativo (?<!_) e Lookahead negativo (?!_) para garantir que é só um _
            .replace(/(?<!_)_([^_]+)_(?!_)/g, '*$1*'); 
            // Sublinhado: O editor envia __txt__, que o Discord já entende nativamente, então não alteramos.
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
let client;
let watchdogTimer;

function updateState(status, desc, percent = 0) {
    if (waState.status !== status || waState.desc !== desc || waState.percent !== percent) {
        waState.status = status; waState.desc = desc; waState.percent = percent;
        if (status !== 'SYNCING') logServer('WA', \`\${status} - \${desc}\`);
        io.emit('wa_status', waState);
    }
}

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

// --- BUSCA OTIMIZADA VIA CONTATOS ---
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

// --- AUTH ---
const checkAuth = async (req, res, next) => {
    try {
        const userCount = await prisma.user.count();
        if (userCount === 0 && req.path !== '/setup') return res.redirect('/setup');
        if (userCount > 0 && req.path === '/setup') return res.redirect('/login');
        if (req.path === '/login' || req.path === '/setup') return next();
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
    res.render('dashboard', { user: req.user, users, logs, config: systemConfig, waGroups: whatsappGroups, waState, ...extra });
}

app.get('/', async (req, res) => renderDashboard(req, res));
app.get('/login', (req, res) => res.render('login'));
app.get('/setup', (req, res) => res.render('setup'));
app.get('/logout', (req, res) => { res.clearCookie('token'); res.redirect('/login'); });

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
        await prisma.user.create({ data: { 
            name: cleanName, 
            email: req.body.email, 
            password: await bcrypt.hash(req.body.password, 10), 
            passwordHint: req.body.hint || null,
            role: 'admin', 
            isSuper: true 
        }});
        res.redirect('/login');
    } catch(e) { res.render('setup', { error: "Erro: " + e.message }); }
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
        if (err) return renderDashboard(req, res, { error: 'Erro upload: ' + err.message });
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
        res.redirect('/');
    });
});

app.post('/api/history/delete', async (req, res) => {
    if(req.user.role !== 'admin' && !req.user.isSuper) return res.status(403).send('Negado');
    try { await prisma.log.delete({ where: { id: parseInt(req.body.id) } }); res.redirect('/'); } catch(e) { res.redirect('/'); }
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

    renderDashboard(req, res, { success: 'Salvo.' });
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
    if (!req.user.isSuper && req.body.role === 'admin') return renderDashboard(req, res, { error: 'Permissão insuficiente.' });
    try { 
        await prisma.user.create({ data: { name: req.body.name, email: req.body.email, password: await bcrypt.hash(req.body.password, 10), role: req.body.role || 'sender', isSuper: false }}); 
        res.redirect('/'); 
    } catch(e) { res.redirect('/'); }
});

app.post('/api/users/delete', async (req, res) => {
    try { 
        const target = await prisma.user.findUnique({where:{id:parseInt(req.body.id)}});
        if(!target) return res.redirect('/');
        if(target.isSuper) return renderDashboard(req, res, { error: "Dono protegido." });
        if(target.role === 'admin' && !req.user.isSuper) return renderDashboard(req, res, { error: "Apenas Dono remove Admins." });
        if(req.user.role !== 'admin') return res.status(403).send("Negado.");
        await prisma.user.delete({where:{id:target.id}}); 
        res.redirect('/'); 
    } catch(e){ res.redirect('/'); }
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