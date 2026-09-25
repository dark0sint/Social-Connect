# Social Connect API
**Media Sosial Khusus Pendidikan** — by Shadow Security Indonesia

REST API untuk platform pembelajaran & interaksi aman antara **guru, siswa, dan orang tua**.

## Fitur
- **Manajemen Kelas (LMS)** — buat kelas, kode gabung, materi, tugas.
- **Forum Diskusi Terfokus** — per kelas, tanpa gangguan konten umum.
- **Kuis & Penilaian Interaktif** — kuis pilihan ganda dengan penilaian otomatis.
- **Jurnal Refleksi & Pantauan Orang Tua** — siswa menulis jurnal harian, dapat dipantau guru & orang tua yang tertaut.
- **Keamanan** — JWT auth, hashing bcrypt, rate limiting, helmet, role-based access control (admin/guru/siswa/orangtua).

> Catatan: kolom `SSO_GOOGLE_CLIENT_ID`/`SECRET` di `.env` adalah *placeholder* jika nanti ingin menambahkan login SSO (Google Workspace/OAuth2 sekolah). Saat ini autentikasi menggunakan email+password dengan JWT.

---

## 1. Menjalankan secara Lokal

```bash
cd social-connect
cp .env.example .env
# edit .env: WAJIB ganti JWT_SECRET dengan string acak & panjang

npm install
npm run seed     # membuat akun admin awal (lihat output di terminal untuk kredensialnya)
npm start        # atau: npm run dev (dengan nodemon)
```

Server berjalan di `http://localhost:4000`. Cek kesehatan: `GET /health`.

---

## 2. Deploy ke Server (Ubuntu/Debian VPS) — tanpa Docker

```bash
# di server
sudo apt update && sudo apt install -y nodejs npm build-essential
sudo npm install -g pm2

# upload/clone folder social-connect ke server, lalu:
cd social-connect
cp .env.example .env
nano .env               # set JWT_SECRET, PORT, dsb.
npm install --omit=dev
npm run seed

pm2 start server.js --name social-connect-api
pm2 save
pm2 startup            # ikuti instruksi agar auto-start saat reboot
```

### Reverse proxy dengan Nginx + HTTPS (agar bisa diakses via domain, mis. api.socialconnect.id)

```nginx
server {
    listen 80;
    server_name api.socialconnect.id;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Lalu aktifkan HTTPS gratis dengan Let's Encrypt:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.socialconnect.id
```

---

## 3. Deploy dengan Docker (direkomendasikan)

```bash
cd social-connect
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
echo "CORS_ORIGIN=*" >> .env

docker compose up -d --build
docker compose exec social-connect-api npm run seed
```

API akan berjalan di `http://<ip-server>:4000`. Tinggal arahkan Nginx/reverse proxy seperti langkah di atas ke port 4000.

---

## 4. Ringkasan Endpoint API

### Auth (`/api/auth`)
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/register` | Daftar akun (`role`: admin/guru/siswa/orangtua) |
| POST | `/login` | Login, dapatkan JWT |
| GET | `/me` | Profil sendiri (perlu token) |
| POST | `/link-parent` | Orang tua menautkan diri ke siswa via `student_email` |
| GET | `/my-children` | Daftar anak yang tertaut (orang tua) |

### Kelas (`/api/classes`)
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/` | Guru membuat kelas |
| GET | `/` | Daftar kelas (sesuai role) |
| POST | `/join` | Siswa gabung kelas via `join_code` |
| GET | `/:id` | Detail kelas + anggota |
| POST/GET | `/:classId/materials` | Materi kelas |
| POST/GET | `/:classId/assignments` | Tugas kelas |
| POST/GET | `/:classId/forum/threads` | Diskusi kelas |
| POST/GET | `/:classId/quizzes` | Kuis kelas |

### Tugas (`/api/assignments`)
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/:assignmentId/submit` | Siswa mengumpulkan tugas |
| GET | `/:assignmentId/submissions` | Guru melihat semua pengumpulan |
| PUT | `/submissions/:submissionId/grade` | Guru memberi nilai |
| GET | `/grades/me` | Nilai milik sendiri |
| GET | `/grades/student/:studentId` | Guru/orang tua melihat nilai siswa |

### Forum (`/api/forum`)
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST/GET | `/threads/:threadId/posts` | Balasan dalam diskusi |

### Kuis (`/api/quizzes`)
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/:quizId` | Ambil soal (tanpa jawaban benar) |
| POST | `/:quizId/attempt` | Siswa submit jawaban → nilai otomatis |
| GET | `/:quizId/results` | Guru melihat hasil semua siswa |

### Jurnal Refleksi (`/api/journal`)
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/` | Siswa membuat jurnal harian |
| GET | `/me` | Jurnal milik sendiri |
| GET | `/student/:studentId` | Guru/orang tua terkait memantau jurnal siswa |
| PUT | `/:journalId/comment` | Guru memberi komentar |

### Pengguna (`/api/users`) — khusus admin
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/` | Daftar semua pengguna |
| PUT | `/:id/status` | Aktifkan/nonaktifkan akun |

Semua endpoint (kecuali `register`/`login`) memerlukan header:
```
Authorization: Bearer <token>
```

---

## 5. Contoh Alur Cepat (curl)

```bash
# Daftar guru
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Bu Sinta","email":"sinta@sekolah.id","password":"passwordkuat1","role":"guru"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sinta@sekolah.id","password":"passwordkuat1"}'
# -> simpan token dari respons

# Buat kelas
curl -X POST http://localhost:4000/api/classes \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"name":"Matematika 7A","subject":"Matematika"}'
```

---

## 6. Catatan Keamanan & Privasi Anak
- Ganti `JWT_SECRET` sebelum produksi; jangan gunakan nilai contoh.
- Selalu jalankan di belakang HTTPS (Let's Encrypt/Nginx) — jangan ekspos port 4000 langsung ke publik.
- Data anak (jurnal, nilai) hanya dapat diakses oleh guru kelas terkait, orang tua yang **tertaut resmi** ke akun siswa, dan siswa itu sendiri — bukan pengguna lain.
- Disarankan menambah: verifikasi email saat registrasi, audit log admin, backup rutin file SQLite (`db/data/`), dan kebijakan retensi data sesuai UU PDP (Perlindungan Data Pribadi) Indonesia.
- Untuk skala besar/produksi tinggi, pertimbangkan migrasi dari SQLite ke PostgreSQL — struktur tabel di `db/schema.sql` mudah diadaptasi.
