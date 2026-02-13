const API_URL = 'http://localhost:3000/admin';
let todosUsuarios = []; 
let todosTags = [];      
let todosChats = [];     

// ==========================================
// 🔐 HELPER DE AUTENTICAÇÃO
// ==========================================
function getToken() {
    return localStorage.getItem('admin_token');
}

// Substitui o fetch normal para injetar o token automaticamente
async function authFetch(url, options = {}) {
    const token = getToken();
    
    // Se não houver token, redirecionar para login (ajusta o URL conforme necessário)
    if (!token) {
        window.location.href = '/login.html'; 
        return;
    }

    // Adicionar headers
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, options);

    // Se o token expirou ou é inválido (401/403)
    if (res.status === 401 || res.status === 403) {
        alert("Sessão expirada. Faça login novamente.");
        localStorage.removeItem('admin_token');
        window.location.href = '/login.html';
        return;
    }

    return res;
}

// ==========================================
// 1. CHATS
// ==========================================
async function carregarChats() {
    try {
        // Usamos authFetch em vez de fetch
        const res = await authFetch(`${API_URL}/chats`);
        if(!res) return;
        const chats = await res.json();
        
        const resUsers = await authFetch(`${API_URL}/users`);
        if(!resUsers) return;
        todosUsuarios = await resUsers.json(); 

        todosChats = chats;

        const tbody = document.querySelector('#tabelaChats tbody');
        tbody.innerHTML = '';

        chats.forEach(chat => {
            const membrosHtml = chat.allowedUsers.map(u => 
                `<span class="badge badge-user">${u.username}</span>`
            ).join('');

            const userIdsNoChat = chat.allowedUsers.map(u => u._id);

            tbody.innerHTML += `
                <tr>
                    <td class="ps-4 align-middle"><strong class="text-white">${chat.name}</strong></td>
                    <td class="align-middle">${membrosHtml}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-outline-info btn-sm me-1" 
                            onclick='abrirModalEditar("${chat._id}", "${chat.name}", ${JSON.stringify(userIdsNoChat)})'>
                            ✏️
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="apagarChat('${chat._id}')">🗑️</button>
                    </td>
                </tr>
            `;
        });
    } catch (e) { console.error("Erro ao carregar chats:", e); }
}

function abrirModalCriar() {
    document.getElementById('editChatId').value = ''; 
    document.getElementById('chatNameInput').value = '';
    document.getElementById('modalTitle').innerText = 'Criar Novo Chat';
    renderizarCheckboxesUsers([]);
    new bootstrap.Modal(document.getElementById('chatModal')).show();
}

function abrirModalEditar(id, nome, userIdsAtuais) {
    document.getElementById('editChatId').value = id;
    document.getElementById('chatNameInput').value = nome;
    document.getElementById('modalTitle').innerText = 'Editar Chat';
    renderizarCheckboxesUsers(userIdsAtuais);
    new bootstrap.Modal(document.getElementById('chatModal')).show();
}

function renderizarCheckboxesUsers(selecionadosIds) {
    const container = document.getElementById('usersChecklist');
    container.innerHTML = '';
    todosUsuarios.forEach(user => {
        const isChecked = selecionadosIds.includes(user._id) ? 'checked' : '';
        container.innerHTML += `
            <div class="form-check mb-2">
                <input class="form-check-input bg-dark border-secondary" type="checkbox" value="${user._id}" id="chk_${user._id}" ${isChecked}>
                <label class="form-check-label text-white" for="chk_${user._id}">
                    ${user.username} <span class="text-white-50" style="font-size: 0.8em">(${user.email})</span>
                </label>
            </div>
        `;
    });
}

async function salvarChat() {
    const id = document.getElementById('editChatId').value;
    const name = document.getElementById('chatNameInput').value;
    const checkboxes = document.querySelectorAll('#usersChecklist input[type="checkbox"]:checked');
    const allowedUsers = Array.from(checkboxes).map(cb => cb.value);

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/chats/${id}` : `${API_URL}/chats`;

    await authFetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, allowedUsers })
    });

    const modalEl = document.getElementById('chatModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    modalInstance.hide();
    
    carregarChats();
}

async function apagarChat(id) {
    if(confirm('Tem a certeza que quer apagar este chat e todas as mensagens?')) {
        await authFetch(`${API_URL}/chats/${id}`, { method: 'DELETE' });
        carregarChats();
    }
}


// ==========================================
// 2. USERS
// ==========================================
async function carregarUsers() {
    try {
        const res = await authFetch(`${API_URL}/users`);
        if(!res) return;
        const users = await res.json();
        
        const resTags = await authFetch(`${API_URL}/tags`);
        if(!resTags) return;
        todosTags = await resTags.json();

        const tbody = document.querySelector('#tabelaUsers tbody');
        tbody.innerHTML = '';

        users.forEach(user => {
            const tagsHtml = user.tags.map(t => 
                `<span class="badge bg-primary badge-user">${t.name}</span>`
            ).join('');

            const tagsIdsDoUser = user.tags.map(t => t._id);
            
            const userContentId = `user-name-edit-${user._id}`; 

            tbody.innerHTML += `
                <tr>
                    <td class="ps-4 align-middle text-white">
                        <div contenteditable="true" id="${userContentId}" style="outline: none; border-bottom: 1px dashed #555;">
                            ${user.username}
                        </div>
                        <div class="mt-1">${tagsHtml}</div>
                    </td>
                    <td class="align-middle text-white-50">${user.email}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-outline-warning btn-sm me-1" onclick="salvarUserNome('${user._id}')">💾</button>
                        <button class="btn btn-outline-primary btn-sm me-1" 
                            onclick='abrirModalEditarUserTags("${user._id}", "${user.username}", ${JSON.stringify(tagsIdsDoUser)})'>
                            🏷️
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="apagarUser('${user._id}')">🗑️</button>
                    </td>
                </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

async function salvarUserNome(id) {
    const novoNomeElement = document.getElementById(`user-name-edit-${id}`);
    if (!novoNomeElement) return;
    
    const novoNome = novoNomeElement.innerText;
    const nomeLimpo = novoNome.trim(); 
    
    await authFetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username: nomeLimpo }) 
    });
    carregarUsers(); 
}

async function apagarUser(id) {
    if(confirm('Apagar utilizador?')) {
        await authFetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
        carregarUsers();
    }
}

function abrirModalEditarUserTags(id, username, tagIdsAtuais) {
    document.getElementById('userEditModalId').value = id;
    document.getElementById('userEditModalTitle').innerText = `Gerir Tags de ${username}`;
    
    const container = document.getElementById('userTagsChecklist');
    container.innerHTML = '';

    todosTags.forEach(tag => {
        const isChecked = tagIdsAtuais.includes(tag._id) ? 'checked' : '';
        container.innerHTML += `
            <div class="form-check mb-2">
                <input class="form-check-input bg-dark border-secondary" type="checkbox" value="${tag._id}" id="chk_user_tag_${tag._id}" ${isChecked}>
                <label class="form-check-label text-white" for="chk_user_tag_${tag._id}">
                    ${tag.name}
                </label>
            </div>
        `;
    });
    new bootstrap.Modal(document.getElementById('userTagsModal')).show();
}

async function salvarUserTags() {
    const id = document.getElementById('userEditModalId').value;
    
    const checkboxes = document.querySelectorAll('#userTagsChecklist input[type="checkbox"]:checked');
    const tags = Array.from(checkboxes).map(cb => cb.value); 

    const novoNomeElement = document.getElementById(`user-name-edit-${id}`);
    const novoNome = novoNomeElement ? novoNomeElement.innerText.trim() : '';
    
    try {
        await authFetch(`${API_URL}/users/${id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                tags: tags,
                username: novoNome 
            })
        });

        bootstrap.Modal.getInstance(document.getElementById('userTagsModal')).hide();
        carregarUsers(); 
    } catch (e) {
        console.error("Erro ao salvar tags do utilizador:", e);
        alert("Erro ao salvar: " + e.message);
    }
}


// ==========================================
// 3. POSTS
// ==========================================
async function carregarPosts() {
    try {
        const res = await authFetch(`${API_URL}/posts`);
        if(!res) return;
        const posts = await res.json();
        const tbody = document.querySelector('#tabelaPosts tbody');
        tbody.innerHTML = '';

        posts.forEach(post => {
            const imgName = post.imagePath ? post.imagePath.split(/[\\/]/).pop() : '';
            
            tbody.innerHTML += `
                <tr>
                    <td class="ps-4 align-middle text-white">${post.author ? post.author.username : 'Desconhecido'}</td>
                    <td class="align-middle"><span class="badge bg-danger">❤️ ${post.likes}</span></td>
                    <td class="text-end pe-4">
                        <a href="http://localhost:3000/uploads/${imgName}" target="_blank" class="btn btn-outline-light btn-sm me-1">👁️</a>
                        <button class="btn btn-outline-danger btn-sm" onclick="apagarPost('${post._id}')">🗑️</button>
                    </td>
                </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

async function apagarPost(id) {
    if(confirm('Apagar post permanentemente?')) {
        await authFetch(`${API_URL}/posts/${id}`, { method: 'DELETE' });
        carregarPosts();
    }
}


// ==========================================
// 4. LÓGICA DE TAGS
// ==========================================
async function carregarTags() {
    try {
        const res = await authFetch(`${API_URL}/tags`);
        if(!res) return;
        const tags = await res.json();
        
        todosTags = tags;

        if (todosChats.length === 0) {
            const resChats = await authFetch(`${API_URL}/chats`);
            if(resChats) todosChats = await resChats.json();
        }

        const tbody = document.querySelector('#tabelaTags tbody');
        tbody.innerHTML = '';

        tags.forEach(tag => {
            const chatsHtml = tag.allowedChats.map(c => 
                `<span class="badge badge-user" style="background-color: #6d28d9 !important; color: #d8b4fe !important;">${c.name}</span>`
            ).join('');

            const chatIdsPermitidos = tag.allowedChats.map(c => c._id);
            
            tbody.innerHTML += `
                <tr>
                    <td class="ps-4 align-middle">
                        <strong class="text-white">${tag.name}</strong>
                        <div class="mt-1">${chatsHtml}</div>
                    </td>
                    <td class="text-end pe-4">
                        <button class="btn btn-outline-info btn-sm me-1" 
                            onclick='abrirModalEditarTag("${tag._id}", "${tag.name}", ${JSON.stringify(chatIdsPermitidos)})'>
                            ✏️
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="apagarTag('${tag._id}')">🗑️</button>
                    </td>
                </tr>
            `;
        });
    } catch (e) { console.error("Erro ao carregar tags:", e); }
}

function abrirModalCriarTag() {
    document.getElementById('editTagId').value = ''; 
    document.getElementById('tagNameInput').value = '';
    document.getElementById('tagModalTitle').innerText = 'Criar Nova Tag';
    renderizarCheckboxesChats([]); 
    new bootstrap.Modal(document.getElementById('tagModal')).show();
}

function abrirModalEditarTag(id, nome, chatIdsAtuais) {
    document.getElementById('editTagId').value = id;
    document.getElementById('tagNameInput').value = nome;
    document.getElementById('tagModalTitle').innerText = 'Editar Tag';
    renderizarCheckboxesChats(chatIdsAtuais);
    new bootstrap.Modal(document.getElementById('tagModal')).show();
}

function renderizarCheckboxesChats(selecionadosIds) {
    const container = document.getElementById('chatsChecklist');
    container.innerHTML = '';
    todosChats.forEach(chat => {
        const isChecked = selecionadosIds.includes(chat._id) ? 'checked' : '';
        container.innerHTML += `
            <div class="form-check mb-2">
                <input class="form-check-input bg-dark border-secondary" type="checkbox" value="${chat._id}" id="chk_chat_${chat._id}" ${isChecked}>
                <label class="form-check-label text-white" for="chk_chat_${chat._id}">
                    ${chat.name}
                </label>
            </div>
        `;
    });
}

async function salvarTag() {
    const id = document.getElementById('editTagId').value;
    const name = document.getElementById('tagNameInput').value;
    
    const checkboxes = document.querySelectorAll('#chatsChecklist input[type="checkbox"]:checked');
    const allowedChats = Array.from(checkboxes).map(cb => cb.value);

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/tags/${id}` : `${API_URL}/tags`;

    await authFetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, allowedChats })
    });

    const modalEl = document.getElementById('tagModal');
    bootstrap.Modal.getInstance(modalEl).hide();
    carregarTags();
}

async function apagarTag(id) {
    if(confirm('Apagar esta Tag? Os utilizadores com esta tag podem perder acesso a chats.')) {
        await authFetch(`${API_URL}/tags/${id}`, { method: 'DELETE' });
        carregarTags();
    }
}

function logout() {
    localStorage.removeItem('admin_token'); // Apaga a "chave" de acesso
    window.location.href = 'login.html';    // Manda de volta para a entrada
}


// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se tem token antes de tentar carregar
    if (!getToken()) {
        window.location.href = '/login.html'; // Manda para login
    } else {
        Promise.all([
            carregarUsers(),
            carregarPosts(),
            carregarChats(),
            carregarTags(), 
        ]).catch(err => console.error("Erro ao iniciar dashboard:", err));
    }
});