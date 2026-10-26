import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { CashAccount, User, sequelize } from '../models/index.js';
import { conflict, notFound, unauthenticated } from '../utils/errors.js';

const BCRYPT_ROUNDS = 10;

// Compared against when the username doesn't exist, so a miss costs the same time as a hit.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

export function serializeUser(user) {
  return {
    userId: user.userId,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function registerCustomer({ firstName, lastName, username, email, password }) {
  const existing = await User.findOne({
    where: { [Op.or]: [{ username }, { email }] },
    attributes: ['username', 'email'],
  });
  if (existing?.username === username) throw conflict('USERNAME_TAKEN', `Username "${username}" is already taken`);
  if (existing) throw conflict('EMAIL_TAKEN', 'An account with that email already exists');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // User and Cash_Account are created together or not at all.
  const user = await sequelize.transaction(async (transaction) => {
    const created = await User.create(
      { firstName, lastName, username, email, passwordHash, role: 'customer' },
      { transaction },
    );
    await CashAccount.create({ userId: created.userId, balance: '0.00' }, { transaction });
    // Re-read so timestamps match what the database stored (DATETIME has no milliseconds).
    return created.reload({ transaction });
  });

  return serializeUser(user);
}

export async function authenticate(username, password) {
  const user = await User.scope('withPassword').findOne({ where: { username } });
  const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !matches) throw unauthenticated('Invalid username or password');
  return serializeUser(user);
}

export async function getUserById(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw notFound('User no longer exists');
  return serializeUser(user);
}
