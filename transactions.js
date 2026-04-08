const { sequelize, Account, Item, Sequelize } = require('./db');

async function demonstrateLostUpdate() {
  console.log('\n ЗАДАНИЕ 1: Lost Update');
  console.log('='.repeat(60));
  
  const levels = [
    { level: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED, name: 'READ COMMITTED' },
    { level: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ, name: 'REPEATABLE READ' },
    { level: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE, name: 'SERIALIZABLE' }
  ];
  
  for (const { level, name } of levels) {
    console.log(`\n Тест уровня: ${name}`);
    console.log('-'.repeat(40));
    
    await Account.destroy({ where: {}, truncate: true });
    await Account.create({ id: 1, balance: 1000 });
    
    const t1 = await sequelize.transaction({ isolationLevel: level });
    const t2 = await sequelize.transaction({ isolationLevel: level });
    
    let t1Success = false, t2Success = false;
    
  
    try {
      const acc1 = await Account.findByPk(1, { transaction: t1, lock: t1.LOCK.UPDATE });
      console.log(' T1: баланс до =', acc1.balance);
      await new Promise(res => setTimeout(res, 500));
      acc1.balance += 100;
      await acc1.save({ transaction: t1 });
      await t1.commit();
      t1Success = true;
      console.log('    T1: +100 (успешно)');
    } catch (err) {
      await t1.rollback();
      console.log('    T1:', err.message);
    }
    
    
    try {
      const acc2 = await Account.findByPk(1, { transaction: t2, lock: t2.LOCK.UPDATE });
      console.log('T2: баланс до =', acc2.balance);
      acc2.balance += 50;
      await acc2.save({ transaction: t2 });
      await t2.commit();
      t2Success = true;
      console.log('    T2: +50 (успешно)');
    } catch (err) {
      await t2.rollback();
      console.log('    T2:', err.message);
    }
    
    const final = await Account.findByPk(1);
    console.log(` Финальный баланс: ${final.balance} (ожидалось: ${t1Success && t2Success ? 1150 : '?и?'})`);
    if (t1Success && t2Success && final.balance !== 1150) {
      console.log('    ОБНАРУЖЕН LOST UPDATE!');
    }
  }
}

async function demonstrateDirtyRead() {
  console.log('\n ЗАДАНИЕ 2: Dirty Read (проверка)');
  console.log('='.repeat(60));
  
  const levels = [
    { level: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED, name: 'READ COMMITTED' }
  ];
  
  for (const { level, name } of levels) {
    console.log(`\n Тест уровня: ${name}`);
    console.log('-'.repeat(40));
    
    await Account.destroy({ where: {}, truncate: true });
    await Account.create({ id: 1, balance: 1000 });
    
    const t1 = await sequelize.transaction({ isolationLevel: level });
    
 
    const acc1 = await Account.findByPk(1, { transaction: t1 });
    await acc1.update({ balance: 500 }, { transaction: t1 });
    console.log(' T1: изменил баланс на 500 (НЕ закоммичено)');

    const t2 = await sequelize.transaction({ isolationLevel: level });
    const acc2 = await Account.findByPk(1, { transaction: t2 });
    console.log(` T2: прочитал = ${acc2.balance}`);
    console.log(`   ${acc2.balance === 1000 ? ' Dirty read НЕ произошел' : ' Dirty read ПРОИЗОШЕЛ!'}`);
    
    await t2.commit();
    await t1.commit();
    
    const final = await Account.findByPk(1);
    console.log(` Финальный баланс: ${final.balance}`);
  }
  
  console.log('\n ВЫВОД: PostgreSQL НЕ поддерживает Dirty Read');
}


async function demonstrateNonRepeatableRead() {
  console.log('\n ЗАДАНИЕ 3: Non-repeatable Read');
  console.log('='.repeat(60));
  
  const levels = [
    { level: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED, name: 'READ COMMITTED' },
    { level: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ, name: 'REPEATABLE READ' }
  ];
  
  for (const { level, name } of levels) {
    console.log(`\n Тест уровня: ${name}`);
    console.log('-'.repeat(40));
    
    await Account.destroy({ where: {}, truncate: true });
    await Account.create({ id: 1, balance: 1000 });
    
    const tA = await sequelize.transaction({ isolationLevel: level });
    
   
    const accA1 = await Account.findByPk(1, { transaction: tA });
    console.log(`🟦 T1: первое чтение = ${accA1.balance}`);
   
    const tB = await sequelize.transaction({ isolationLevel: level });
    const accB = await Account.findByPk(1, { transaction: tB });
    await accB.update({ balance: 500 }, { transaction: tB });
    await tB.commit();
    console.log(` T2: изменил на 500 и закоммитил`);
   
    const accA2 = await Account.findByPk(1, { transaction: tA });
    console.log(` T1: второе чтение = ${accA2.balance}`);
    
    if (accA1.balance !== accA2.balance) {
      console.log(`    Non-repeatable read: ${accA1.balance} → ${accA2.balance}`);
    } else {
      console.log(`    Non-repeatable read не произошел`);
    }
    
    await tA.commit();
  }
}

async function demonstratePhantomRead() {
  console.log('\n ЗАДАНИЕ 4: Phantom Read');
  console.log('='.repeat(60));
  
  const configs = [
    { t1: 'READ_COMMITTED', t2: 'READ_COMMITTED', name: 'T1: READ COMMITTED, T2: READ COMMITTED' },
    { t1: 'REPEATABLE_READ', t2: 'READ_COMMITTED', name: 'T1: REPEATABLE READ, T2: READ COMMITTED' }
  ];
  
  for (const cfg of configs) {
    console.log(`\n Тест: ${cfg.name}`);
    console.log('-'.repeat(40));
    
    await Item.destroy({ where: {}, truncate: true });
    await Item.bulkCreate([{ name: 'Item1' }, { name: 'Item2' }]);
    
    const t1Level = Sequelize.Transaction.ISOLATION_LEVELS[cfg.t1];
    const t2Level = Sequelize.Transaction.ISOLATION_LEVELS[cfg.t2];
    
    const t1 = await sequelize.transaction({ isolationLevel: t1Level });
    
    // Первый подсчет
    const count1 = await Item.count({ transaction: t1 });
    console.log(` T1: первый подсчет = ${count1}`);
    
    // T2 добавляет запись
    const t2 = await sequelize.transaction({ isolationLevel: t2Level });
    await Item.create({ name: 'Item3' }, { transaction: t2 });
    await t2.commit();
    console.log(`T2: добавила Item3`);
    
    // Второй подсчет
    const count2 = await Item.count({ transaction: t1 });
    console.log(`T1: второй подсчет = ${count2}`);
    
    if (count1 !== count2) {
      console.log(`    Phantom read: ${count1} → ${count2}`);
    } else {
      console.log(`    Phantom read не произошел`);
    }
    
    await t1.commit();
  }
}


async function demonstrateLocks() {
  console.log('\n ЗАДАНИЕ 5: Блокировки');
  console.log('='.repeat(60));
  
  await Account.destroy({ where: {}, truncate: true });
  await Account.create({ id: 1, balance: 100 });
  
  console.log(' Начальный баланс: 100');
  console.log('-'.repeat(40));
  
  const t1 = await sequelize.transaction();
  const t2 = await sequelize.transaction();
  
  try {
    
    console.log(' T1: блокируем аккаунт...');
    const acc1 = await Account.findByPk(1, { lock: t1.LOCK.UPDATE, transaction: t1 });
    console.log('   T1: блокировка получена');

    setTimeout(async () => {
      try {
        console.log('\n T2: пытаемся заблокировать...');
        console.log('    T2: ожидает...');
        
        const acc2 = await Account.findByPk(1, { lock: t2.LOCK.UPDATE, transaction: t2 });
        console.log('    T2: блокировка получена!');
        
        await acc2.update({ balance: acc2.balance + 25 }, { transaction: t2 });
        await t2.commit();
        console.log('    T2: +25, коммит');
      } catch (err) {
        console.log('    T2 ошибка:', err.message);
      }
    }, 1000);
    

    console.log('    T1: работа (3 сек)...');
    await new Promise(res => setTimeout(res, 3000));
    
    await acc1.update({ balance: acc1.balance + 50 }, { transaction: t1 });
    await t1.commit();
    console.log('    T1: +50, коммит');
    
  
    await new Promise(res => setTimeout(res, 2000));
    
  } catch (err) {
    console.log(' Ошибка:', err);
  }
  
  const final = await Account.findByPk(1);
  console.log(`\n Итоговый баланс: ${final.balance} (ожидается 175)`);
}

module.exports = {
  demonstrateLostUpdate,
  demonstrateDirtyRead,
  demonstrateNonRepeatableRead,
  demonstratePhantomRead,
  demonstrateLocks
};