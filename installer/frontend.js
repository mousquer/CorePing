const login = `<!DOCTYPE html><html><head><title>Login - CorePing</title><meta name="viewport" content="width=device-width, initial-scale=1"><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"><style>body{background:#f0f2f5;color:#333;display:flex;align-items:center;justify-content:center;height:100vh}.card{background:#fff;border:none;box-shadow:0 10px 25px rgba(0,0,0,0.1);width:100%;max-width:400px}.form-control{background:#fff;border:1px solid #ced4da;color:#333}.form-control:focus{background:#fff;color:#333;border-color:#0d6efd;box-shadow:0 0 0 .25rem rgba(13,110,253,.25)}a{color:#0d6efd;text-decoration:none}a:hover{color:#0a58ca;text-decoration:underline}</style></head><body>
<div class="card p-4">
    <div class="text-center mb-4"><h3 class="fw-bold text-primary">CorePing</h3><p class="text-muted small">Faça login para continuar</p></div>
    <% if(locals.error){ %><div class="alert alert-danger py-2"><small><%= error %></small></div><% } %>
    
    <form id="formLogin" action="/login" method="POST">
        <div class="mb-3"><label class="form-label fw-bold small">Email</label><input name="email" class="form-control" required></div>
        <div class="mb-3"><label class="form-label fw-bold small">Senha</label><input type="password" name="password" class="form-control" required></div>
        <div class="mb-4 text-end"><a href="#" onclick="toggleMode('recover')"><small>Esqueci minha senha</small></a></div>
        <button class="btn btn-primary w-100 py-2 fw-bold">Entrar</button>
    </form>

    <form id="formRecover" style="display:none;" onsubmit="requestCode(event)">
        <p class="small text-muted mb-3">Informe seu e-mail. Se validado, você receberá um código de 6 dígitos (válido por 90s).</p>
        <div id="recAlert" class="alert alert-danger py-2" style="display:none;"><small id="recAlertText"></small></div>
        <div class="mb-4"><label class="form-label fw-bold small">Email</label><input id="recEmail" type="email" class="form-control" required></div>
        <button type="submit" id="btnReqCode" class="btn btn-warning w-100 py-2 mb-3 fw-bold">Enviar Código</button>
        <div class="text-center"><a href="#" onclick="toggleMode('login')"><small>Voltar ao Login</small></a></div>
    </form>

    <form id="formReset" style="display:none;" onsubmit="resetPassword(event)">
        <div class="alert alert-info py-2 mb-3"><small>Sua pergunta de segurança: <br><strong id="hintDisplay"></strong></small></div>
        <div id="resetAlert" class="alert alert-danger py-2" style="display:none;"><small id="resetAlertText"></small></div>
        
        <div class="mb-3"><label class="form-label fw-bold small text-primary">Sua Resposta (Palavra Secreta)</label><input id="resHintAns" type="text" class="form-control" required autocomplete="off"></div>
        <div class="mb-3"><label class="form-label fw-bold small">Código recebido no E-mail</label><input id="resCode" type="text" class="form-control" required autocomplete="off" placeholder="Ex: 123456"></div>
        <div class="mb-4"><label class="form-label fw-bold small">Nova Senha</label><input id="resPass" type="password" class="form-control" required></div>
        
        <button type="submit" id="btnReset" class="btn btn-success w-100 py-2 mb-3 fw-bold">Atualizar Senha</button>
        <div class="text-center"><a href="#" onclick="toggleMode('login')"><small>Cancelar</small></a></div>
    </form>
</div>
<script>
    function toggleMode(mode) {
        document.getElementById('formLogin').style.display = mode === 'login' ? 'block' : 'none';
        document.getElementById('formRecover').style.display = mode === 'recover' ? 'block' : 'none';
        document.getElementById('formReset').style.display = mode === 'reset' ? 'block' : 'none';
        document.getElementById('recAlert').style.display = 'none';
        document.getElementById('resetAlert').style.display = 'none';
    }

    async function requestCode(e) {
        e.preventDefault();
        const email = document.getElementById('recEmail').value;
        const btn = document.getElementById('btnReqCode');
        const alertBox = document.getElementById('recAlert');
        const alertTxt = document.getElementById('recAlertText');
        
        btn.disabled = true; btn.innerText = "Verificando..."; alertBox.style.display = 'none';
        
        try {
            const res = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
            const data = await res.json();
            
            if (data.success) {
                document.getElementById('hintDisplay').innerText = data.hint;
                toggleMode('reset');
            } else {
                alertTxt.innerText = data.msg; alertBox.style.display = 'block';
            }
        } catch (err) { alertTxt.innerText = "Erro no servidor."; alertBox.style.display = 'block'; }
        
        btn.disabled = false; btn.innerText = "Enviar Código";
    }

    async function resetPassword(e) {
        e.preventDefault();
        const email = document.getElementById('recEmail').value;
        const code = document.getElementById('resCode').value;
        const hintAnswer = document.getElementById('resHintAns').value;
        const newPassword = document.getElementById('resPass').value;
        const btn = document.getElementById('btnReset');
        const alertBox = document.getElementById('resetAlert');
        const alertTxt = document.getElementById('resetAlertText');

        btn.disabled = true; btn.innerText = "Validando..."; alertBox.style.display = 'none';

        try {
            const res = await fetch('/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code, hintAnswer, newPassword }) });
            const data = await res.json();
            
            if (data.success) {
                alert("Senha alterada com sucesso! Faça login com a nova senha.");
                window.location.href = '/login';
            } else {
                alertTxt.innerText = data.msg; alertBox.style.display = 'block';
            }
        } catch (err) { alertTxt.innerText = "Erro no servidor."; alertBox.style.display = 'block'; }

        btn.disabled = false; btn.innerText = "Atualizar Senha";
    }
</script>
</body></html>`;

const setup = `<!DOCTYPE html><html><head><title>Setup</title><meta name="viewport" content="width=device-width, initial-scale=1"><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"><style>body{background:#f0f2f5;display:flex;align-items:center;justify-content:center;height:100vh;padding:20px;}.card{border:none;box-shadow:0 10px 25px rgba(0,0,0,0.1);max-width:550px;width:100%}</style></head><body>
<div class="card p-5">
    <h2 class="mb-3 text-primary fw-bold">Instalação (1/2)</h2>
    <p class="text-muted mb-4">Crie o usuário Super Admin.</p>
    <% if(locals.error){ %><div class="alert alert-danger py-2"><small><%= error %></small></div><% } %>
    <form action="/setup" method="POST">
        <div class="mb-3"><label class="form-label fw-bold small">Nome</label><input name="name" class="form-control" required></div>
        <div class="mb-3"><label class="form-label fw-bold small">Email</label><input name="email" type="email" class="form-control" required></div>
        <div class="mb-3"><label class="form-label fw-bold small">Senha</label><input type="password" name="password" class="form-control" required></div>
        <div class="mb-3"><label class="form-label fw-bold small text-primary">Pergunta de Segurança (Dica)</label><input name="hint" class="form-control" placeholder="Ex: Qual o nome da minha gata?" required></div>
        <div class="mb-4"><label class="form-label fw-bold small text-primary">Resposta (Palavra Secreta)</label><input name="hintAnswer" class="form-control" placeholder="Ex: Malvina" required></div>
        <button class="btn btn-primary w-100 py-2 fw-bold">Continuar para o Passo 2</button>
    </form>
</div>
</body></html>`;

const setupSmtp = `<!DOCTYPE html><html><head><title>Configurar SMTP</title><meta name="viewport" content="width=device-width, initial-scale=1"><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"><style>body{background:#f0f2f5;display:flex;align-items:center;justify-content:center;height:100vh;padding:20px;}.card{border:none;box-shadow:0 10px 25px rgba(0,0,0,0.1);max-width:550px;width:100%}</style></head><body>
<div class="card p-5">
    <h2 class="mb-3 text-primary fw-bold">Configuração de E-mail (2/2)</h2>
    <p class="text-muted mb-4">Para utilizar a recuperação de senha via OTP, preencha os dados do servidor. Caso não deseje, basta pular esta etapa.</p>
    <% if(locals.error){ %><div class="alert alert-danger py-2"><small><%= error %></small></div><% } %>
    <form action="/setup/smtp" method="POST">
        <div class="row g-2 mb-3">
            <div class="col-md-8"><label class="form-label small fw-bold">Servidor SMTP</label><input type="text" name="smtpHost" class="form-control" placeholder="smtp.gmail.com" pattern="^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" title="Insira um endereço de servidor válido (ex: smtp.google.com)" required></div>
            <div class="col-md-4"><label class="form-label small fw-bold">Porta</label><input type="text" inputmode="numeric" name="smtpPort" class="form-control" placeholder="587" oninput="this.value = this.value.replace(/[^0-9]/g, '')" title="Apenas números" required></div>
        </div>
        <div class="mb-3"><label class="form-label small fw-bold">E-mail (Usuário)</label><input type="email" name="smtpUser" class="form-control" placeholder="seuemail@gmail.com" pattern="^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$" title="O email deve conter o formato completo" required></div>
        <div class="mb-4"><label class="form-label small fw-bold">Senha de App</label><input type="password" name="smtpPass" class="form-control" placeholder="Até 24 dígitos" maxlength="24" required></div>
        
        <button type="submit" name="action" value="save" class="btn btn-primary w-100 py-2 fw-bold mb-2">Salvar Configuração e Finalizar</button>
        <button type="submit" name="action" value="skip" class="btn btn-outline-danger w-100 py-2 fw-bold" formnovalidate>PULAR (Desativar recuperação por E-mail)</button>
    </form>
</div>
</body></html>`;

const dashboard = `
<!DOCTYPE html>
<html>
<head>
    <title>CorePing v1.0.5</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="/socket.io/socket.io.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root { --bg-color: #f4f6f9; --card-bg: #fff; --text-color: #333; }
        
        body.dark-mode { --bg-color: #1a1b1e; --card-bg: #25262b; --text-color: #e4e6eb; }
        body.dark-mode .card { border-color: #373a40; }
        body.dark-mode .form-control, body.dark-mode .form-select, body.dark-mode .btn-toolbar-custom, body.dark-mode .bg-readonly { background-color: #1a1b1e; border-color: #373a40; color: #fff; }
        body.dark-mode .btn-toolbar-custom button { color: #e4e6eb; }
        body.dark-mode .btn-toolbar-custom button:hover { background-color: #373a40; }
        body.dark-mode h1, body.dark-mode h2, body.dark-mode h3, body.dark-mode h4, body.dark-mode h5, body.dark-mode h6, body.dark-mode label, body.dark-mode p, body.dark-mode li, body.dark-mode td, body.dark-mode th { color: #e4e6eb; }
        body.dark-mode .text-muted { color: #909296 !important; }
        body.dark-mode .table { color: #e4e6eb; }
        body.dark-mode .table-hover tbody tr:hover { color: #fff; background-color: #373a40; }
        
        body.dark-mode .modal-content { background-color: #25262b; color: #e4e6eb; border: 1px solid #373a40; }
        body.dark-mode .modal-header { border-bottom: 1px solid #373a40; }
        body.dark-mode .modal-footer { border-top: 1px solid #373a40; }
        body.dark-mode .btn-close { filter: invert(1) grayscale(100%) brightness(200%); }
        body.dark-mode input::placeholder, body.dark-mode textarea::placeholder { color: #6c757d !important; opacity: 1; }

        body { background-color: var(--bg-color); color: var(--text-color); font-family: 'Segoe UI', sans-serif; transition: 0.2s; }
        .card { background-color: var(--card-bg); border:none; box-shadow:0 2px 4px rgba(0,0,0,0.05); border-radius: 8px; }
        .navbar-brand img { height: 40px; }
        .navbar-brand strong { font-size: 1.3rem; margin-left: 10px; }
        .alert-floating { position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }

        .btn-toolbar-custom { background-color: #f8f9fa; border: 1px solid #ced4da; border-bottom: none; border-radius: 5px 5px 0 0; padding: 5px; }
        .btn-toolbar-custom button { border: none; background: transparent; color: #555; padding: 4px 8px; margin-right: 5px; border-radius: 4px; transition: background 0.2s; }
        .btn-toolbar-custom button:hover { background-color: #e2e6ea; }
        .textarea-editor { border-top-left-radius: 0; border-top-right-radius: 0; }
        .bg-readonly { background-color: #e9ecef; }

        .stepper { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .step { flex: 1; text-align: center; font-size: 0.8rem; position: relative; color: #999; }
        .step.active { color: #198754; font-weight: bold; }
        .step-icon { width: 30px; height: 30px; background: #e9ecef; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 5px; color: #666; transition: 0.3s; }
        .step.active .step-icon { background: #198754; color: #fff; }
        .step-line { height: 2px; background: #e9ecef; position: absolute; top: 15px; left: 50%; right: -50%; z-index: -1; }
        .step:last-child .step-line { display: none; }
        .step.active .step-line { background: #198754; }
    </style>
</head>
<body>
    <% if(locals.error) { %>
        <div class="alert alert-danger alert-dismissible fade show alert-floating"><%= error %><button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>
    <% } %>
    <% if(locals.success) { %>
        <div class="alert alert-success alert-dismissible fade show alert-floating"><%= success %><button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>
    <% } %>

    <nav class="navbar navbar-dark bg-dark px-4 mb-4 shadow-sm">
        <a class="navbar-brand d-flex align-items-center">
            <% if(config.logoUrl) { %> <img src="<%= config.logoUrl %>" class="rounded"> <% } %>
            <strong><%= config.serverName || 'CorePing' %></strong>
        </a>
        <div class="d-flex gap-2">
            <% if(user.role === 'admin') { %>
            <button class="btn btn-outline-light btn-sm" data-bs-toggle="modal" data-bs-target="#modalGeneral" title="Configurações"><i class="fas fa-cog"></i></button>
            <% } %>
            <button class="btn btn-outline-light btn-sm" onclick="toggleTheme()" title="Tema"><i class="fas fa-adjust"></i></button>
            <a href="/logout" class="btn btn-sm btn-outline-danger"><i class="fas fa-power-off"></i></a>
        </div>
    </nav>

    <div class="container">
        <div class="row mb-4 g-4">
            <div class="col-md-4">
                <div class="card p-4 h-100">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="m-0"><i class="fab fa-whatsapp text-success me-2"></i> WhatsApp</h5>
                        <div>
                            <span id="wa-badge" class="badge bg-danger me-2">OFF</span>
                            <% if(user.role === 'admin') { %>
                                <button class="btn btn-sm btn-light border" onclick="openWaConfig()"><i class="fas fa-sliders-h"></i></button>
                            <% } %>
                        </div>
                    </div>
                    <p id="wa-desc" class="small text-muted">Serviço parado.</p>
                    <div class="mt-auto">
                        <label class="small fw-bold text-muted">Destino Configurado:</label>
                        <div class="bg-readonly p-2 rounded small text-truncate">
                            <i class="fas fa-users me-1"></i> <%= waGroups.find(g => g.id === config.waGroupId)?.name || 'Nenhum' %>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-4">
                <div class="card p-4 h-100">
                    <div class="d-flex justify-content-between align-items-center mb-3"><h5 class="m-0"><i class="fab fa-discord" style="color:#5865F2; me-2"></i> Discord</h5><div><span class="badge <%= config.dcWebhook ? 'bg-success' : 'bg-danger' %> me-2"><%= config.dcWebhook ? 'ON' : 'OFF' %></span><button class="btn btn-sm btn-light border" data-bs-toggle="modal" data-bs-target="#modalDiscordConfig"><i class="fas fa-edit"></i></button></div></div>
                    <div class="mb-2">
                        <small class="text-muted d-block">Servidor:</small>
                        <span class="fw-bold"><%= config.dcServerName || 'Não Definido' %></span>
                    </div>
                    <div class="mt-auto">
                        <label class="small fw-bold text-muted">Canal Configurado:</label>
                        <div class="bg-readonly p-2 rounded small text-truncate">
                            <i class="fas fa-hashtag me-1"></i> <%= config.dcChannelName || 'Não definido' %>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-4">
                <div class="card p-4 h-100" style="opacity: 0.7;"><div class="d-flex justify-content-between align-items-center mb-3"><h5 class="m-0"><i class="fab fa-telegram text-info me-2"></i> Telegram</h5><span class="badge bg-warning text-dark">Em Breve</span></div><p class="small text-muted">Integração futura.</p><div class="mt-auto"><button class="btn btn-sm btn-light border w-100" disabled>Configurar</button></div></div>
            </div>
        </div>

        <ul class="nav nav-tabs mb-3" id="mainTab" role="tablist">
            <li class="nav-item"><a class="nav-link active" id="send-tab" data-bs-toggle="tab" href="#send">Enviar</a></li>
            <li class="nav-item"><a class="nav-link" id="history-tab" data-bs-toggle="tab" href="#history">Histórico</a></li>
            <% if(user.role === 'admin' || user.isSuper) { %><li class="nav-item"><a class="nav-link" id="users-tab" data-bs-toggle="tab" href="#users">Usuários</a></li><% } %>
        </ul>

        <% 
            const hasWa = !!config.waGroupId;
            const hasDc = !!config.dcWebhook;
            const canSend = hasWa || hasDc;
        %>

        <div class="tab-content">
            <div class="tab-pane fade show active" id="send">
                <div class="card p-4">
                    <% if(!canSend) { %>
                        <div class="alert alert-danger fw-bold mb-4">
                            <i class="fas fa-exclamation-triangle"></i> Nenhuma plataforma foi configurada! Configure o WhatsApp ou o Discord para habilitar os envios.
                        </div>
                    <% } %>

                    <form id="formSend" action="/api/send" method="POST" enctype="multipart/form-data">
                        <div class="row">
                            <div class="col-md-9 mb-3"><label class="form-label fw-bold">Título</label><input type="text" name="title" class="form-control" required <%= !canSend ? 'disabled' : '' %>></div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label fw-bold">Plataforma</label>
                                <select name="platform" id="platformSelect" class="form-select" onchange="updateDestinations()" <%= !canSend ? 'disabled' : '' %>>
                                    <% if(hasWa && hasDc) { %><option value="both">Todos</option><% } %>
                                    <% if(hasWa) { %><option value="whatsapp">WhatsApp</option><% } %>
                                    <% if(hasDc) { %><option value="discord">Discord</option><% } %>
                                    <% if(!canSend) { %><option value="">Bloqueado</option><% } %>
                                </select>
                            </div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-12">
                                <div class="alert alert-light border d-flex align-items-center gap-3 py-2">
                                    <small class="fw-bold text-muted">Enviando para:</small>
                                    <% if(hasWa) { %>
                                        <span id="dest-wa" class="badge bg-success"><i class="fab fa-whatsapp"></i> <%= waGroups.find(g => g.id === config.waGroupId)?.name || 'Sem Grupo' %></span>
                                    <% } else { %>
                                        <span id="dest-wa" class="badge bg-secondary"><i class="fab fa-whatsapp"></i> Não configurado</span>
                                    <% } %>
                                    
                                    <% if(hasDc) { %>
                                        <span id="dest-dc" class="badge" style="background:#5865F2"><i class="fab fa-discord"></i> <%= config.dcServerName || 'Discord' %></span>
                                    <% } else { %>
                                        <span id="dest-dc" class="badge bg-secondary"><i class="fab fa-discord"></i> Não configurado</span>
                                    <% } %>
                                </div>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-bold">Mensagem</label>
                            <div class="btn-toolbar-custom">
                                <button type="button" onclick="formatText('bold')" title="Negrito"><i class="fas fa-bold"></i></button>
                                <button type="button" onclick="formatText('italic')" title="Itálico"><i class="fas fa-italic"></i></button>
                                <button type="button" onclick="formatText('underline')" title="Sublinhado (Ctrl+S)"><i class="fas fa-underline"></i></button>
                                <button type="button" onclick="formatText('strike')" title="Riscado"><i class="fas fa-strikethrough"></i></button>
                                <span class="border-end mx-2" style="border-color: #ccc;"></span>
                                <button type="button" onclick="insertEmoji('😀')">😀</button>
                                <button type="button" onclick="insertEmoji('🤑')">🤑</button>
                                <button type="button" onclick="insertEmoji('💸')">💸</button>
                                <button type="button" onclick="insertEmoji('💰')">💰</button>
                                <button type="button" onclick="insertEmoji('🚨')">🚨</button>
                                <button type="button" onclick="insertEmoji('⚠️')">⚠️</button>
                                <button type="button" onclick="insertEmoji('🔥')">🔥</button>
                                <button type="button" onclick="insertEmoji('🚀')">🚀</button>
                                <button type="button" onclick="insertEmoji('✅')">✅</button>
                            </div>
                            <textarea id="messageArea" name="message" class="form-control textarea-editor" rows="6" required <%= !canSend ? 'disabled' : '' %>></textarea>
                            <div class="text-end mt-1"><small class="text-muted"><span id="charCount">0</span> caracteres</small></div>
                        </div>

                        <div class="mb-3"><label class="form-label fw-bold">Anexo (JPG/PNG/GIF)</label><input type="file" name="image" class="form-control" accept="image/png, image/jpeg, image/gif, image/jpg" <%= !canSend ? 'disabled' : '' %>></div>
                        <button type="submit" id="btnSubmitSend" class="btn btn-primary w-100 py-2 fw-bold" <%= !canSend ? 'disabled' : '' %>>Enviar Notificação</button>
                    </form>
                </div>
            </div>
            
            <div class="tab-pane fade" id="history">
                 <div class="card p-3"><div class="table-responsive"><table class="table table-hover align-middle"><thead class="table-light"><tr><th>Data</th><th>Autor</th><th>Título</th><th>Mensagem</th><th>Destino</th></tr></thead><tbody><% logs.forEach(l => { %><tr><td><small><%= new Date(l.sentAt).toLocaleString() %></small></td><td><%= l.user.name %></td><td><%= l.title %></td><td class="text-truncate" style="max-width: 300px;"><%= l.message %></td><td><span class="badge bg-secondary"><%= l.platform %></span></td></tr><% }) %></tbody></table></div></div>
            </div>

            <% if(user.role === 'admin' || user.isSuper) { %>
            <div class="tab-pane fade" id="users">
                <div class="card p-4">
                    <h6 class="mb-3 fw-bold">Adicionar Usuário</h6>
                    <form action="/api/users/add" method="POST" class="row g-2 mb-4 align-items-end">
                        <div class="col-md-2"><input type="text" name="name" placeholder="Nome" class="form-control" required></div>
                        <div class="col-md-2"><input type="email" name="email" placeholder="Email" class="form-control" required></div>
                        <div class="col-md-2"><input type="password" name="password" placeholder="Senha" class="form-control" required></div>
                        <div class="col-md-2"><input type="text" name="hint" placeholder="Dica (Pergunta)" class="form-control" required></div>
                        <div class="col-md-2"><input type="text" name="hintAnswer" placeholder="Palavra Secreta" class="form-control" required></div>
                        <div class="col-md-1"><select name="role" class="form-select"><option value="sender">Sender</option><% if(user.isSuper) { %><option value="admin">Admin</option><% } %></select></div>
                        <div class="col-md-1 d-grid"><button class="btn btn-success"><i class="fas fa-plus"></i></button></div>
                    </form>
                    <hr>
                    <div class="table-responsive"><table class="table align-middle"><thead class="table-light"><tr><th>Nome</th><th>Email</th><th>Dica</th><th>Cargo</th><th>Ação</th></tr></thead><tbody><% users.forEach(u => { %><tr><td><%= u.name %> <% if(u.isSuper) { %><span class="badge bg-warning text-dark ms-1">Dono</span><% } %></td><td><%= u.email %></td><td><small class="text-muted"><%= u.passwordHint || '-' %></small></td><td><span class="badge bg-light text-dark border"><%= u.role %></span></td><td><% if((user.isSuper && u.id !== user.id) || (user.role === 'admin' && !u.isSuper && u.role !== 'admin')) { %><form action="/api/users/delete" method="POST" class="d-inline" onsubmit="return confirm('Remover usuário?');"><input type="hidden" name="id" value="<%= u.id %>"><button class="btn btn-outline-danger btn-sm"><i class="fas fa-trash"></i></button></form><% } %></td></tr><% }) %></tbody></table></div>
                </div>
            </div>
            <% } %>

        </div>
    </div>

    <div class="modal fade" id="modalWaConfig" data-bs-backdrop="static"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">
        <div class="modal-header bg-success text-white">
            <h5 class="modal-title">Configurar WhatsApp</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body text-center p-4">
            
            <div class="stepper">
                <div class="step active" id="step1"><div class="step-icon">1</div>Início<div class="step-line"></div></div>
                <div class="step" id="step2"><div class="step-icon"><i class="fas fa-qrcode"></i></div>QR<div class="step-line"></div></div>
                <div class="step" id="step3"><div class="step-icon"><i class="fas fa-search"></i></div>Busca</div>
            </div>

            <div id="wa-start-area" style="display:none">
                <p class="text-muted">Inicie o motor para gerar o QR Code.</p>
                <button onclick="runWaAction('start')" class="btn btn-lg btn-success w-100">Iniciar Conexão</button>
            </div>
            
            <div id="wa-qr-area" style="display:none">
                <h6 class="mb-3">Escaneie o QR Code</h6>
                <img id="qr-img" class="img-fluid border p-2 rounded" style="max-width: 240px;">
                <div class="mt-2 text-muted small"><div class="spinner-border spinner-border-sm me-1"></div> Aguardando leitura...</div>
            </div>
            
            <div id="wa-loading-area" style="display:none">
                <div class="my-4">
                    <div class="spinner-border text-success" style="width: 3rem; height: 3rem;"></div>
                    <h5 class="mt-3">Conectado!</h5>
                    <p class="text-muted" id="wa-loading-text">Buscando canais...</p>
                </div>
            </div>
            
            <div id="wa-controls-area" style="display:none">
                <div class="alert alert-success"><i class="fas fa-check-circle"></i> Configuração Pronta!</div>
                <p class="small text-muted mb-2">Selecione o grupo padrão para envio:</p>
                <form action="/api/config/set-group" method="POST" class="mb-4">
                    <div class="input-group">
                        <select name="waGroupId" id="wa-group-select-modal" class="form-select" required>
                            <option value="" disabled selected>Selecione um grupo...</option>
                        </select>
                        <button class="btn btn-primary">Salvar & Finalizar</button>
                    </div>
                    <small class="text-muted" style="font-size: 0.75rem;">*Exibindo apenas canais onde você pode escrever.</small>
                </form>
                <hr>
                <button onclick="runWaAction('logout')" class="btn btn-outline-danger btn-sm w-100">Desconectar e Trocar Número</button>
            </div>

        </div>
    </div></div></div>

    <div class="modal fade" id="modalDiscordConfig"><div class="modal-dialog"><div class="modal-content"><form action="/api/config/discord" method="POST"><div class="modal-header"><h5 class="modal-title">Discord</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div><div class="modal-body">
        <div class="mb-3"><label class="form-label">Nome do Bot</label><input type="text" name="dcBotName" class="form-control" value="<%= config.dcBotName %>"></div>
        <div class="mb-3"><label class="form-label">Nome do Servidor (Visual)</label><input type="text" name="dcServerName" class="form-control" value="<%= config.dcServerName %>" placeholder="Ex: Comunidade Tech"></div>
        <div class="mb-3"><label class="form-label">Nome do Canal (Visual)</label><input type="text" name="dcChannelName" class="form-control" value="<%= config.dcChannelName %>" placeholder="Ex: #avisos-gerais"></div>
        <% if(user.role === 'admin' || user.isSuper) { %>
        <div class="mb-3">
            <label class="form-label">Webhook URL (Segredo)</label>
            <input type="url" name="dcWebhook" class="form-control" value="<%= config.dcWebhook %>" placeholder="https://discord.com/api/webhooks/..." pattern="^https:\\/\\/discord\\.com\\/api\\/webhooks\\/.*" title="Obrigatório iniciar com: https://discord.com/api/webhooks/">
        </div>
        <% } %>
    </div><div class="modal-footer"><button class="btn btn-primary">Salvar Configuração</button></div></form></div></div></div>
    
    <div class="modal fade" id="modalGeneral"><div class="modal-dialog"><div class="modal-content"><form action="/api/config/general" method="POST" enctype="multipart/form-data"><div class="modal-header"><h5 class="modal-title">Geral</h5></div><div class="modal-body"><div class="mb-3"><label>Nome Servidor</label><input type="text" name="serverName" class="form-control" value="<%= config.serverName %>"></div><div class="mb-3"><label>Logo</label><input type="file" name="logo" class="form-control" accept="image/*"></div></div><div class="modal-footer"><button class="btn btn-primary">Salvar</button></div></form></div></div></div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        const socket = io();
        const waBadge = document.getElementById('wa-badge'); const waDesc = document.getElementById('wa-desc'); const waModal = new bootstrap.Modal(document.getElementById('modalWaConfig'));
        function openWaConfig() { waModal.show(); }
        function hideAll() { ['wa-start-area','wa-qr-area','wa-controls-area','wa-loading-area'].forEach(id => document.getElementById(id).style.display='none'); }
        
        async function runWaAction(action) {
            try { await fetch('/api/whatsapp/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }); } catch(e) { console.error(e); }
        }

        const formSend = document.getElementById('formSend');
        if (formSend) {
            formSend.addEventListener('submit', function(e) {
                const hasWaFront = "<%= !!config.waGroupId %>" === "true";
                const hasDcFront = "<%= !!config.dcWebhook %>" === "true";
                if (!hasWaFront && !hasDcFront) {
                    e.preventDefault();
                    alert("Ação bloqueada: É necessário configurar o WhatsApp ou o Discord para poder enviar mensagens.");
                }
            });
        }

        function updateDestinations() {
            const platformSel = document.getElementById('platformSelect');
            if(!platformSel) return;
            const platform = platformSel.value;
            const wa = document.getElementById('dest-wa');
            const dc = document.getElementById('dest-dc');
            
            if(platform === 'whatsapp') { 
                if(wa) wa.style.display = 'inline-block'; 
                if(dc) dc.style.display = 'none'; 
            } else if(platform === 'discord') { 
                if(wa) wa.style.display = 'none'; 
                if(dc) dc.style.display = 'inline-block'; 
            } else { 
                if(wa) wa.style.display = 'inline-block'; 
                if(dc) dc.style.display = 'inline-block'; 
            }
        }
        updateDestinations();

        function formatText(type) { 
            const area = document.getElementById('messageArea'); 
            if(!area) return;
            const start = area.selectionStart; 
            const end = area.selectionEnd; 
            const text = area.value; 
            const selected = text.substring(start, end); 
            let tag = ''; 
            if(type==='bold') tag='*'; 
            if(type==='italic') tag='_'; 
            if(type==='strike') tag='~'; 
            if(type==='underline') tag='__';
            
            area.value = text.substring(0, start) + tag + selected + tag + text.substring(end); 
            area.focus(); 
            area.selectionStart = end + (tag.length*2); 
            area.selectionEnd = end + (tag.length*2); 
            area.dispatchEvent(new Event('input'));
        }

        function insertEmoji(emoji) { 
            const area = document.getElementById('messageArea'); 
            if(!area) return;
            const start = area.selectionStart; 
            const end = area.selectionEnd; 
            area.value = area.value.substring(0, start) + emoji + area.value.substring(end); 
            area.focus(); 
            area.selectionStart = start + emoji.length; 
            area.selectionEnd = start + emoji.length;
            area.dispatchEvent(new Event('input')); 
        }

        const msgArea = document.getElementById('messageArea');
        if(msgArea){
            msgArea.addEventListener('input', function() {
                document.getElementById('charCount').innerText = this.value.length;
            });
            msgArea.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                    e.preventDefault();
                    formatText('underline');
                }
            });
        }

        function updateStepper(step) {
            document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
            if(step >= 1) document.getElementById('step1').classList.add('active');
            if(step >= 2) document.getElementById('step2').classList.add('active');
            if(step >= 3) document.getElementById('step3').classList.add('active');
        }

        socket.on('wa_status', (state) => {
            waDesc.innerText = state.desc; hideAll();
            switch(state.status) {
                case 'IDLE': document.getElementById('wa-start-area').style.display='block'; updateStepper(1); break;
                case 'STARTING': document.getElementById('wa-loading-area').style.display='block'; document.getElementById('wa-loading-text').innerText="Iniciando motor..."; updateStepper(1); break;
                case 'QR': document.getElementById('wa-qr-area').style.display='block'; updateStepper(2); break;
                case 'AUTHENTICATED': case 'SYNCING': document.getElementById('wa-loading-area').style.display='block'; document.getElementById('wa-loading-text').innerText="Sincronizando..."; updateStepper(3); break;
                case 'FETCHING_GROUPS': document.getElementById('wa-loading-area').style.display='block'; document.getElementById('wa-loading-text').innerText="Aguarde enquanto estamos encontrando os canais que você possuí permissão de escrita..."; updateStepper(3); break;
                case 'CONNECTED': document.getElementById('wa-controls-area').style.display='block'; updateStepper(3); break;
                case 'FAILED': document.getElementById('wa-start-area').style.display='block'; updateStepper(1); break;
            }
            
            if (state.status === 'CONNECTED') {
                waBadge.className = 'badge bg-success me-2';
                waBadge.innerText = 'ON';
            } else {
                waBadge.className = 'badge bg-danger me-2';
                waBadge.innerText = 'OFF';
            }
        });

        socket.on('qr', (url) => document.getElementById('qr-img').src = url);
        socket.on('groups_refresh', (groups) => {
            const selectModal = document.getElementById('wa-group-select-modal');
            const current = "<%= config.waGroupId %>";
            selectModal.innerHTML = '<option value="" disabled>Selecione...</option>';
            groups.forEach(g => {
                const opt = document.createElement('option'); opt.value = g.id; opt.innerText = g.name;
                if(g.id === current) opt.selected = true; selectModal.appendChild(opt);
            });
        });

        function toggleTheme() { 
            document.body.classList.toggle('dark-mode'); 
            localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light'); 
            ajustarEstilosPeloTema();
        }
        
        function ajustarEstilosPeloTema() {
            const el = document.querySelector('.dark-mode-adjust');
            if(el) {
                if(document.body.classList.contains('dark-mode')) {
                    el.classList.remove('bg-light');
                    el.style.backgroundColor = '#1a1b1e';
                } else {
                    el.classList.add('bg-light');
                    el.style.backgroundColor = '';
                }
            }
        }

        if(localStorage.getItem('theme')==='dark') {
            document.body.classList.add('dark-mode');
            ajustarEstilosPeloTema();
        }

        const activeTab = "<%= locals.activeTab || 'send' %>";
        if (activeTab) {
            const tabEl = document.querySelector(\`a[href="#\${activeTab}"]\`);
            if (tabEl) new bootstrap.Tab(tabEl).show();
        }
    </script>
</body>
</html>
`;


module.exports = { getDashboardEjs: () => dashboard, getLoginEjs: () => login, getSetupEjs: () => setup, getSetupSmtpEjs: () => setupSmtp };
