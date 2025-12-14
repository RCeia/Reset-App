const API_URL = 'http://localhost:3000/admin';
let todosUsuarios = []; 

// ==========================================
// 1. CHATS
// ==========================================
async function carregarChats() {
    try {
        const res = await fetch(`${API_URL}/chats`);
        const chats = await res.json();
        
        const resUsers = await fetch(`${API_URL}/users`);
        todosUsuarios = await resUsers.json();

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
    renderizarCheckboxes([]); 
    new bootstrap.Modal(document.getElementById('chatModal')).show();
}

function abrirModalEditar(id, nome, userIdsAtuais) {
    document.getElementById('editChatId').value = id;
    document.getElementById('chatNameInput').value = nome;
    document.getElementById('modalTitle').innerText = 'Editar Chat';
    renderizarCheckboxes(userIdsAtuais);
    new bootstrap.Modal(document.getElementById('chatModal')).show();
}

function renderizarCheckboxes(selecionadosIds) {
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

    await fetch(url, {
        method: method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, allowedUsers })
    });

    // Fecha o modal corretamente
    const modalEl = document.getElementById('chatModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    modalInstance.hide();
    
    carregarChats();
}

async function apagarChat(id) {
    if(confirm('Tem a certeza que quer apagar este chat e todas as mensagens?')) {
        await fetch(`${API_URL}/chats/${id}`, { method: 'DELETE' });
        carregarChats();
    }
}


// ==========================================
// 2. USERS
// ==========================================
async function carregarUsers() {
    try {
        const res = await fetch(`${API_URL}/users`);
        const users = await res.json();
        const tbody = document.querySelector('#tabelaUsers tbody');
        tbody.innerHTML = '';

        users.forEach(user => {
            tbody.innerHTML += `
                <tr>
                    <td class="ps-4 align-middle text-white" contenteditable="true" id="user-${user._id}" style="outline: none; border-bottom: 1px dashed #555;">${user.username}</td>
                    <td class="align-middle text-white-50">${user.email}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-outline-warning btn-sm me-1" onclick="salvarUser('${user._id}')">💾</button>
                        <button class="btn btn-outline-danger btn-sm" onclick="apagarUser('${user._id}')">🗑️</button>
                    </td>
                </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

async function salvarUser(id) {
    const novoNome = document.getElementById(`user-${id}`).innerText;
    await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username: novoNome })
    });
    carregarUsers(); 
}

async function apagarUser(id) {
    if(confirm('Apagar utilizador?')) {
        await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
        carregarUsers();
    }
}

// ==========================================
// 3. POSTS
// ==========================================
async function carregarPosts() {
    try {
        const res = await fetch(`${API_URL}/posts`);
        const posts = await res.json();
        const tbody = document.querySelector('#tabelaPosts tbody');
        tbody.innerHTML = '';

        posts.forEach(post => {
            // Pequena limpeza no nome da imagem
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
        await fetch(`${API_URL}/posts/${id}`, { method: 'DELETE' });
        carregarPosts();
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarUsers();
    carregarPosts();
    carregarChats();
});