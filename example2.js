const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('postgres://user:password@localhost:5432/mydb');

const Account = sequelize.define('Account', {
  balance: {
    type: DataTypes.DECIMAL,
    allowNull: false,
  },
});

async function concurrencyTest(lockType1, lockType2, label1, label2) {
  await sequelize.sync({ force: true });
  await Account.create({ balance: 1000 });

  const transaction1 = async () => {
    const t = await sequelize.transaction();
    try {
      console.log(`${label1}: начало`);
     const acc = await Account.findOne({
       where: { id: 1 },
        lock: lockType1,
         transaction: t,
      });
      console.log(`${label1}: заблокировал строку`);
      console.log(`${label1}: balance =`, acc.balance);
      await new Promise(r => setTimeout(r, 4000));
      acc.balance = Number(acc.balance) + 10;
      await acc.save({ transaction: t });
      await t.commit();
      console.log(`${label1}: зафиксировал`);
    } catch (e) {
      await t.rollback();
      console.error(`${label1}: откатил`, e);
    }
  };

  const transaction2 = async () => {
    await new Promise(r => setTimeout(r, 1000));
    const t = await sequelize.transaction();
    try {
      console.log(`${label2}: начало`);
      const acc = await Account.findOne({
        where: { id: 1 },
        lock: lockType2,
        transaction: t,
      });
      console.log(`${label2}: заблокировал строку`);
      console.log(`${label2}: balance =`, acc.balance);
      acc.balance = Number(acc.balance) + 20;
      await acc.save({ transaction: t });
      await t.commit();
      console.log(`${label2}: зафиксировал`);
    } catch (e) {
      await t.rollback();
      console.error(`${label2}: откатил`, e);
    }
  };

  await Promise.all([transaction1(), transaction2()]);
  const finalAcc = await Account.findByPk(1);
  console.log('Конечный баланс:', finalAcc.balance);
}

async function runTests() {
  console.log('--- FOR UPDATE + FOR UPDATE ---');
  await concurrencyTest(
    sequelize.Transaction.LOCK.UPDATE,
    sequelize.Transaction.LOCK.UPDATE,
    'T1 (FOR UPDATE)',
    'T2 (FOR UPDATE)'
  );

  console.log('\n--- FOR UPDATE + FOR NO KEY UPDATE ---');
  await concurrencyTest(
    sequelize.Transaction.LOCK.UPDATE,
    sequelize.Transaction.LOCK.NO_KEY_UPDATE,
    'T1 (FOR UPDATE)',
    'T2 (FOR NO KEY UPDATE)'
  );

  console.log('\n--- FOR SHARE + FOR UPDATE ---');
  await concurrencyTest(
    sequelize.Transaction.LOCK.SHARE,
    sequelize.Transaction.LOCK.UPDATE,
    'T1 (FOR SHARE)',
    'T2 (FOR UPDATE)'
  );

  console.log('\n--- FOR KEY SHARE + FOR SHARE ---');
  await concurrencyTest(
    sequelize.Transaction.LOCK.KEY_SHARE,
    sequelize.Transaction.LOCK.SHARE,
    'T1 (FOR KEY SHARE)',
    'T2 (FOR SHARE)'
  );
}

runTests()
  .then(() => {
    console.log('Тесты блокировок завершены');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });