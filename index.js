const { sequelize, testConnection } = require('./db');
const {
  demonstrateLostUpdate,
  demonstrateDirtyRead,
  demonstrateNonRepeatableRead,
  demonstratePhantomRead,
  demonstrateLocks
} = require('./transactions');
const { runLockTests } = require('./locks');

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function showMenu() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 ЛАБОРАТОРНАЯ РАБОТА: Уровни изоляции и блокировки');
  console.log('='.repeat(60));
  console.log(`📦 PostgreSQL: ${process.env.DOCKER_HOST || 'localhost:5432 (Docker)'}`);
  
  const menu = `
Выберите демонстрацию:

1️⃣ Lost Update (Потерянное обновление)
2️⃣ Dirty Read (Грязное чтение)
3️⃣ Non-repeatable Read (Неповторяющееся чтение)
4️⃣ Phantom Read (Фантомное чтение)
5️⃣ Блокировки (Locks) - из transactions.js
6️⃣ 🔒 Тесты блокировок (FOR UPDATE, FOR SHARE и др.) - ИЗ ЛАБОРАТОРНОЙ 2.4
0️⃣ Выход

Ваш выбор: `;
  
  const ask = () => {
    rl.question(menu, async (choice) => {
      await sequelize.sync({ force: true });
      
      switch(choice.trim()) {
        case '1':
          await demonstrateLostUpdate();
          break;
        case '2':
          await demonstrateDirtyRead();
          break;
        case '3':
          await demonstrateNonRepeatableRead();
          break;
        case '4':
          await demonstratePhantomRead();
          break;
        case '5':
          await demonstrateLocks();
          break;
        case '6':
          console.log('\n🔒 ЗАПУСК ТЕСТОВ БЛОКИРОВОК (Лабораторная 2.4)');
          console.log('='.repeat(60));
          await runLockTests();
          break;
        case '0':
          console.log('\n👋 До свидания!');
          await sequelize.close();
          rl.close();
          return;
        default:
          console.log('❌ Неверный выбор');
      }
     
      ask();
    });
  };
  
  ask();
}

async function setupDatabase() {
  console.log('🐳 Используется PostgreSQL в Docker');
  console.log('   Если контейнер не запущен, выполните: npm run docker:up\n');
}

(async () => {
  await setupDatabase();
  await testConnection();
  await showMenu();
})();