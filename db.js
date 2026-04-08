const { Sequelize, DataTypes } = require('sequelize');

// Подключение к PostgreSQL
const sequelize = new Sequelize('postgres://postgres:password@localhost:5432/lab_db', {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 20,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
});

// ==================== МОДЕЛИ ДЛЯ ЛАБОРАТОРНОЙ 2.4 (БЛОКИРОВКИ) ====================

// Account - банковские счета
const Account = sequelize.define('Account', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  holder_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  balance: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
  },
  account_type: {
    type: DataTypes.ENUM('checking', 'savings', 'business'),
    defaultValue: 'checking',
  },
}, {
  tableName: 'accounts',
  timestamps: true,
});

// ==================== МОДЕЛИ ДЛЯ ЛАБОРАТОРНОЙ 2.5 (ИНДЕКСЫ) ====================

// User - пользователи для тестирования индексов
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING(20),
  },
  age: {
    type: DataTypes.INTEGER,
  },
  city: {
    type: DataTypes.STRING(100),
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'banned'),
    defaultValue: 'active',
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'users',
  timestamps: false,
});

// Order - заказы онлайн-магазина
const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  customer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  order_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
    defaultValue: 'pending',
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  shipping_address: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'orders',
  timestamps: false,
});

// Document - документы для полнотекстового поиска
const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  author_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(50),
  },
  creation_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  search_vector: {
    type: DataTypes.TSVECTOR,
  },
}, {
  tableName: 'documents',
  timestamps: false,
});

// Task - задачи системы управления проектами
const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  assigned_to: {
    type: DataTypes.INTEGER,
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
  },
  status: {
    type: DataTypes.ENUM('todo', 'in_progress', 'review', 'done'),
    defaultValue: 'todo',
  },
  due_date: {
    type: DataTypes.DATE,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'tasks',
  timestamps: false,
});

// Friendship - дружеские связи социальной сети
const Friendship = sequelize.define('Friendship', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  friend_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'blocked'),
    defaultValue: 'pending',
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'friendships',
  timestamps: false,
});

// Location - географические объекты (для BRIN и пространственных данных)
const Location = sequelize.define('Location', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  latitude: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  longitude: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  location_type: {
    type: DataTypes.ENUM('city', 'park', 'restaurant', 'shop', 'station'),
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'locations',
  timestamps: false,
});

// Product - товары (для примеров с индексами)
const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(100),
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    defaultValue: 0,
  },
  in_stock: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  attributes: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'products',
  timestamps: false,
});

// Экспорт всех моделей и соединения
module.exports = {
  sequelize,
  Sequelize,
  DataTypes,
  // Лабораторная 2.4
  Account,
  // Лабораторная 2.5
  User,
  Order,
  Document,
  Task,
  Friendship,
  Location,
  Product,
};
