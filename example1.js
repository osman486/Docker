const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('postgres://user:password@localhost:5432/mydb');

const Account = sequelize.define('Account', {
  balance: {
    type: DataTypes.DECIMAL,
    allowNull: false,
  },
});

async function concurrentTransactions() {
  await sequelize.sync({ force: true });
  await Account.create({ balance: 1000 });

  const t1 = async () => {
    const transaction = await sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    });
    try {
      const account = await Account.findOne({
        where: { id: 1 },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      console.log('Transaction 1 balance before:', account.balance);
      account.balance = Number(account.balance) - 100;
      await new Promise(resolve => setTimeout(resolve, 3000));
      await account.save({ transaction });
      await transaction.commit();
      console.log('Transaction 1 committed');
    } catch (error) {
      await transaction.rollback();
      console.error('Transaction 1 rolled back', error);
    }
  };

  const t2 = async () => {
    const transaction = await sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    });
    try {
      const account = await Account.findOne({
        where: { id: 1 },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      console.log('Transaction 2 balance before:', account.balance);
      account.balance = Number(account.balance) + 50;
      await account.save({ transaction });
      await transaction.commit();
      console.log('Transaction 2 committed');
    } catch (error) {
      await transaction.rollback();
      console.error('Transaction 2 rolled back', error);
    }
  };

  await Promise.all([t1(), t2()]);

  const finalAccount = await Account.findByPk(1);
  console.log('Final balance:', finalAccount.balance);
}

concurrentTransactions()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });