const mongoose = require('mongoose');
const User = require('./models/User'); // Confirma se o caminho para o modelo está certo

// 👇 AQUI ESTAVA O SEGREDO: O nome correto é 'myappdb'
const MONGO_URI = 'mongodb://127.0.0.1:27017/myappdb'; 

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('🔌 Conectado à base de dados "myappdb"...');

    // 👇 IMPORTANTE: Coloca aqui o email exato com que te registaste na App
    // (Podes ver no MongoDB Compass se não tiveres a certeza)
    const emailAlvo = '11'; 

    // 1. Tenta promover a Admin
    const user = await User.findOneAndUpdate(
      { email: emailAlvo },
      { isAdmin: true },
      { new: true }
    );

    if (user) {
      console.log('------------------------------------------------');
      console.log(`✅ SUCESSO!`);
      console.log(`👤 Utilizador: ${user.username}`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🔑 Admin: ${user.isAdmin}`);
      console.log('------------------------------------------------');
    } else {
      console.log('------------------------------------------------');
      console.log(`❌ ERRO: O email "${emailAlvo}" não foi encontrado em "myappdb".`);
      console.log('------------------------------------------------');
      
      // Lista quem realmente está lá para te ajudar
      console.log('🔍 Utilizadores encontrados nesta base de dados:');
      const todosUsers = await User.find({}, 'email username');
      
      if (todosUsers.length === 0) {
        console.log('   (Nenhum utilizador encontrado. Tens a certeza que registaste alguém na App?)');
      } else {
        todosUsers.forEach(u => console.log(`   👉 ${u.email} (${u.username})`));
      }
    }

    mongoose.disconnect();
  })
  .catch(err => console.error('🔥 Erro:', err));