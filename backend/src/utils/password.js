const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

const hashPassword = async (plain) => {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
};

const comparePassword = async (plain, hashed) => {
  return bcrypt.compare(plain, hashed);
};

module.exports = {
  hashPassword,
  comparePassword
};
