require('dotenv').config();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const email = 'admin@socialconnect.local';
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

if (existing) {
  console.log('Akun admin sudah ada, dilewati.');
} else {
  const id = uuidv4();
  const hash = bcrypt.hashSync('AdminSocialConnect123!', 12);
  db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?,?,?,?,?)')
    .run(id, 'Super Admin', email, hash, 'admin');
  console.log('Akun admin berhasil dibuat:');
  console.log('  Email   :', email);
  console.log('  Password: AdminSocialConnect123!');
  console.log('PENTING: segera login dan ganti password ini di lingkungan produksi.');
}
