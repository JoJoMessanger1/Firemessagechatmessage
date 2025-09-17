// **ERSETZE DIESE WERTE MIT DENEN AUS DEINEM SUPABASE-PROJEKT**
const SUPABASE_URL = 'https://shmhcxnkctdmkhwiggni.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNobWhjeG5rY3RkbWtod2lnZ25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTc4NjAsImV4cCI6MjA3MzY5Mzg2MH0.govvEukNmZX7E8JSLc0-gnT2JGw41qiq0iysw5W5x80';

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const myIdSpan = document.getElementById('my-id');
const groupNameInput = document.getElementById('group-name-input');
const createGroupBtn = document.getElementById('create-group-btn');
const groupsList = document.getElementById('groups-list');
const chatWindow = document.getElementById('chat-window');
const currentGroupName = document.getElementById('current-group-name');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

let myId;
let currentGroupId;
let supabaseChannel;

// Hilfsfunktionen für localStorage
function getMyId() {
    let id = localStorage.getItem('messengerId');
    if (!id) {
        id = 'user-' + Math.random().toString(36).substr(2, 8);
        localStorage.setItem('messengerId', id);
    }
    myId = id;
    myIdSpan.textContent = myId;
}

function loadGroups() {
    const loadedGroups = JSON.parse(localStorage.getItem('groups')) || {};
    renderGroups(loadedGroups);
}

function saveGroups(groups) {
    localStorage.setItem('groups', JSON.stringify(groups));
}

// UI-Funktionen
function renderGroups(groups) {
    groupsList.innerHTML = '<h2>Deine Gruppen</h2>';
    for (const id in groups) {
        const group = groups[id];
        const groupItem = document.createElement('div');
        groupItem.classList.add('group-item');
        groupItem.textContent = group.name;
        groupItem.onclick = () => openChat(id, group.name);
        groupsList.appendChild(groupItem);
    }
}

async function openChat(groupId, groupName) {
    if (supabaseChannel) {
        await supabase.removeChannel(supabaseChannel);
    }
    
    currentGroupId = groupId;
    currentGroupName.textContent = `Gruppe: ${groupName}`;
    chatWindow.style.display = 'block';
    messagesDiv.innerHTML = '';
    
    // Alte Nachrichten aus der Datenbank laden
    let { data: oldMessages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

    if (oldMessages) {
        oldMessages.forEach(msg => renderMessage(msg.sender_id, msg.message_text));
    }
    
    // Echtzeit-Updates für neue Nachrichten
    supabaseChannel = supabase
        .channel(`chat-group-${groupId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` }, payload => {
            const newMsg = payload.new;
            renderMessage(newMsg.sender_id, newMsg.message_text);
        })
        .subscribe();
}

function renderMessage(senderId, text) {
    const p = document.createElement('p');
    const sender = senderId === myId ? 'Du' : senderId;
    p.textContent = `${sender}: ${text}`;
    messagesDiv.appendChild(p);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Gruppen-Funktionalität
createGroupBtn.onclick = async () => {
    const groupName = groupNameInput.value.trim();
    if (!groupName) {
        alert('Bitte gib einen Gruppennamen ein.');
        return;
    }

    const newGroupId = 'group-' + Math.random().toString(36).substr(2, 8);
    const groups = JSON.parse(localStorage.getItem('groups')) || {};
    groups[newGroupId] = { name: groupName };
    saveGroups(groups);
    renderGroups(groups);
    
    groupNameInput.value = '';
    alert('Gruppe erstellt! Gib die ID ' + newGroupId + ' an andere weiter, damit sie beitreten können.');
};

// Nachricht senden
sendBtn.onclick = async () => {
    const messageText = messageInput.value;
    if (!messageText.trim() || !currentGroupId) return;

    const { error } = await supabase
        .from('messages')
        .insert({
            group_id: currentGroupId,
            sender_id: myId,
            message_text: messageText
        });

    if (error) {
        console.error('Fehler beim Senden der Nachricht:', error);
    } else {
        messageInput.value = '';
    }
};

// Anwendung starten
getMyId();
loadGroups();
