# AGENTS.md

## Project Overview

Project ini adalah web dashboard untuk merangkum kegiatan coding harian berdasarkan riwayat commit GitHub.

Tujuan utama aplikasi:
- Membantu user mencatat dan merangkum pekerjaan harian selama ngoding.
- Mengambil data commit dari GitHub API berdasarkan tanggal tertentu.
- Mengubah commit message teknis menjadi bahasa manusia yang rapi, profesional, dan mudah dipahami oleh project manager.
- Menyimpan hasil summary ke database agar dapat dilihat kembali melalui dashboard.
- Menampilkan summary dalam format HTML yang rapi di halaman web.

Contoh gaya output summary yang diinginkan:

Senin, 30 Maret 2026

Nursery Oil Palm - Gawai
- Mengembangkan endpoint API untuk menampilkan detail Surat Perintah Kerja (SPK) khusus bagi Mantri Bibitan, serta memperbarui dokumentasi terkait. - done
- Memperbarui fitur penerimaan kecambah dengan menambahkan informasi tahap pertumbuhan (pra-nursery) pada data SPK yang diteruskan, agar dapat diakses oleh Mantri Bibitan. - done
- Mengimplementasikan tampilan SPK yang telah diteruskan kepada Mantri Bibitan pada modul penerimaan kecambah. - done
- Melakukan refaktorisasi dokumentasi spesifikasi penerimaan kecambah ke dalam modul PenerimaanKecambahDocs untuk kerapian dan kemudahan akses. - done

## Tech Stack

Gunakan stack berikut:

- Next.js App Router
- TypeScript
- Prisma ORM
- Supabase PostgreSQL
- Supabase Auth untuk login
- Tailwind CSS untuk styling
- Server Components jika memungkinkan
- Client Components hanya jika membutuhkan interaksi browser seperti modal, form, tab, atau state UI
- LLM provider gratis atau free-tier:
  - Gemini API free-tier
  - OpenRouter model free
  - Provider lain boleh dipakai jika gratis/free-tier dan mudah dikonfigurasi

## Core Features

### 1. Authentication

Aplikasi harus memiliki sistem login terlebih dahulu sebelum user bisa mengakses dashboard.

Gunakan Supabase Auth.

Requirement:
- User harus login sebelum masuk dashboard.
- Jika belum login, redirect ke halaman login.
- Session user harus dicek di server-side jika memungkinkan.
- Jangan expose token rahasia ke client.
- Gunakan environment variable untuk Supabase URL dan anon key.

Environment variable yang disarankan:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=
GITHUB_TOKEN=
GITHUB_USERNAME=
LLM_PROVIDER=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
```

Catatan:
- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `GITHUB_TOKEN`, `GEMINI_API_KEY`, dan `OPENROUTER_API_KEY` hanya boleh digunakan di server.
- Jangan pernah hardcode API key, token, password, atau connection string.

### 2. Dashboard Summary Table

Setelah login, user melihat halaman dashboard berbentuk tabel.

Data yang perlu ditampilkan:
- Tanggal summary
- Total project/repository
- Total commit
- Status summary
- Tanggal dibuat
- Tombol lihat detail
- Tombol hapus jika diperlukan
- Tombol regenerate jika diperlukan

Ketika salah satu row diklik:
- Tampilkan detail summary.
- Detail boleh ditampilkan di halaman detail atau panel/modal.
- Summary ditampilkan dari field HTML yang tersimpan di database.

### 3. Create New Summary

User dapat membuat summary baru dengan menekan tombol:

"Buat Summary"

Setelah tombol diklik:
- Tampilkan popup modal.
- Modal berisi form pilihan tanggal.
- Minimal input:
  - tanggal mulai
  - tanggal selesai
- Untuk versi awal, boleh menggunakan satu tanggal saja, lalu sistem otomatis membuat range dari awal hari sampai akhir hari.
- Setelah submit:
  1. Sistem memanggil GitHub API.
  2. Sistem mengambil data commit.
  3. Sistem membersihkan dan mengelompokkan commit.
  4. Sistem mengirim commit message ke LLM.
  5. LLM menghasilkan summary kegiatan dalam Bahasa Indonesia.
  6. Sistem menyimpan hasil summary ke database dalam format HTML.
  7. Dashboard diperbarui.

### 4. GitHub Commit Fetching

Gunakan GitHub REST API endpoint:

```http
GET /repos/{owner}/{repo}/commits?author={username}&since={since}&until={until}
```

Contoh:

```http
GET /repos/iweka-dev/nursery-oil-palm-be/commits?author=henryjrzai&since=2026-03-30T00:00:00Z&until=2026-03-30T23:59:59Z
```

Data penting yang perlu diambil dari response GitHub:
- `sha`
- `commit.message`
- `commit.author.name`
- `commit.author.email`
- `commit.author.date`
- `author.login`
- `html_url`
- repository name
- owner name

Pastikan sistem hanya mengambil bagian commit yang relevan:
- commit SHA
- commit message
- tanggal commit
- author
- URL commit

Jangan simpan seluruh response GitHub mentah jika tidak diperlukan.

### 5. Repository Source

Untuk versi awal, repository dapat dikonfigurasi secara statis melalui database atau config file.

Contoh daftar repository:

```ts
const repositories = [
  {
    owner: "iweka-dev",
    repo: "nursery-oil-palm-be",
    projectName: "Nursery Oil Palm - Gawai",
  },
  {
    owner: "iweka-dev",
    repo: "nursery-sigma",
    projectName: "Nursery Sigma",
  },
];
```

Untuk versi lanjutan, buat halaman settings agar user dapat:
- Menambah repository
- Mengubah nama project display
- Menghapus repository
- Mengaktifkan/nonaktifkan repository dari proses summary

### 6. Commit Filtering Rules

Saat mengambil commit, lakukan filtering berikut:
- Abaikan commit duplicate berdasarkan `sha`.
- Abaikan merge commit jika hanya berisi penggabungan branch dan tidak menjelaskan pekerjaan langsung.
- Abaikan commit otomatis dari bot jika ditemukan.
- Jika commit message memiliki subject dan body yang sama, gunakan satu saja.
- Jika ada commit yang terlalu teknis, tetap kirim ke LLM agar diubah menjadi bahasa pekerjaan manusia.
- Jangan memasukkan commit yang bukan dari username user yang dikonfigurasi.

Contoh commit message:

```text
feat(nursery): remove pagination from nursery program list
```

Contoh hasil manusiawi:

```text
Menghapus paginasi dari daftar program pembibitan agar seluruh data program dapat ditampilkan sesuai kebutuhan.
```

### 7. LLM Summary Generation

Gunakan LLM untuk mengubah commit message menjadi summary pekerjaan.

Provider yang boleh dipakai:
- Gemini free-tier
- OpenRouter free model
- Provider lain yang gratis/free-tier

LLM harus dipanggil dari server-side route/action saja.

Jangan panggil LLM API langsung dari browser.

Output LLM harus:
- Bahasa Indonesia
- Profesional
- Ringkas
- Mudah dipahami project manager
- Tidak terlalu teknis, tetapi tetap akurat
- Berbentuk HTML yang aman dan rapi
- Dikelompokkan berdasarkan tanggal dan project
- Tiap item memiliki status:
  - `done` untuk commit yang sudah masuk repository
  - `progress` hanya jika user menandai manual atau terdapat data tambahan yang menunjukkan pekerjaan belum selesai

Untuk hasil dari commit GitHub, default status adalah `done`.

### 8. LLM Prompt Template

Gunakan prompt seperti berikut saat mengirim data ke LLM:

```text
Kamu adalah asisten yang membantu developer merangkum aktivitas coding harian untuk laporan ke project manager.

Tugas kamu:
Ubah daftar commit GitHub berikut menjadi summary pekerjaan dalam Bahasa Indonesia yang profesional, ringkas, dan mudah dipahami.

Aturan:
1. Jangan menerjemahkan commit secara kaku.
2. Ubah menjadi kalimat kegiatan manusiawi.
3. Jangan menambahkan pekerjaan yang tidak ada di commit.
4. Kelompokkan berdasarkan nama project.
5. Gunakan status "- done" untuk semua commit yang berasal dari GitHub.
6. Jika ada commit yang duplikat atau maknanya sama, gabungkan menjadi satu poin.
7. Jangan menampilkan SHA commit kecuali diminta.
8. Jangan menyebut "commit" dalam hasil akhir kecuali benar-benar perlu.
9. Hasil akhir harus berupa HTML yang rapi.
10. Gunakan tag HTML sederhana saja: h2, h3, ul, li, p, strong.
11. Jangan gunakan script, style inline berbahaya, iframe, atau event handler HTML.

Tanggal laporan:
{{dateLabel}}

Data commit:
{{commitsJson}}

Format output HTML:
<h2>{{dateLabel}}</h2>
<h3>{{projectName}}</h3>
<ul>
  <li>Mengembangkan ... - done</li>
  <li>Memperbaiki ... - done</li>
</ul>
```

### 9. HTML Safety

Karena hasil LLM disimpan sebagai HTML:
- Sanitasi HTML sebelum disimpan atau sebelum dirender.
- Gunakan library seperti `sanitize-html` atau mekanisme sanitasi aman lainnya.
- Hanya izinkan tag:
  - `h2`
  - `h3`
  - `p`
  - `ul`
  - `ol`
  - `li`
  - `strong`
  - `em`
  - `br`
- Jangan izinkan:
  - `script`
  - `iframe`
  - `style`
  - `onclick`
  - `onerror`
  - event handler apa pun

Jika menggunakan `dangerouslySetInnerHTML`, pastikan HTML sudah disanitasi.

### 10. Database Design

Gunakan Prisma.

Schema awal yang disarankan:

```prisma
model User {
  id        String   @id
  email     String?  @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  summaries    WorkSummary[]
  repositories UserRepository[]
}

model UserRepository {
  id          String   @id @default(cuid())
  userId      String
  owner       String
  repo        String
  projectName String
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, owner, repo])
}

model WorkSummary {
  id             String   @id @default(cuid())
  userId         String
  startDate      DateTime
  endDate        DateTime
  dateLabel      String
  title          String
  summaryHtml    String
  summaryText    String?
  totalCommits   Int      @default(0)
  totalProjects  Int      @default(0)
  status         SummaryStatus @default(COMPLETED)
  llmProvider    String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user    User @relation(fields: [userId], references: [id], onDelete: Cascade)
  commits CommitLog[]

  @@index([userId, startDate, endDate])
}

model CommitLog {
  id            String   @id @default(cuid())
  summaryId     String?
  userId        String
  owner         String
  repo          String
  projectName   String
  sha           String
  message       String
  authorName    String?
  authorEmail   String?
  authorLogin   String?
  committedAt   DateTime
  htmlUrl       String?
  createdAt     DateTime @default(now())

  summary WorkSummary? @relation(fields: [summaryId], references: [id], onDelete: SetNull)

  @@unique([owner, repo, sha])
  @@index([userId, committedAt])
  @@index([owner, repo])
}

enum SummaryStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

Catatan:
- `User.id` harus sinkron dengan Supabase Auth user id.
- Gunakan `summaryHtml` untuk tampilan web.
- Gunakan `summaryText` untuk kebutuhan search/export di masa depan.
- `CommitLog` disimpan agar commit yang sudah diproses dapat dilacak dan tidak duplicate.

### 11. Suggested Folder Structure

Gunakan struktur seperti berikut:

```text
src/
  app/
    (auth)/
      login/
        page.tsx
    (dashboard)/
      dashboard/
        page.tsx
      summaries/
        [id]/
          page.tsx
    api/
      summaries/
        route.ts
      summaries/
        generate/
          route.ts
      github/
        commits/
          route.ts
  components/
    summaries/
      SummaryTable.tsx
      SummaryDetail.tsx
      CreateSummaryModal.tsx
    ui/
  lib/
    github/
      fetch-commits.ts
      normalize-commits.ts
    llm/
      generate-summary.ts
      providers/
        gemini.ts
        openrouter.ts
    prisma.ts
    supabase/
      client.ts
      server.ts
    sanitize-html.ts
    date.ts
  prisma/
    schema.prisma
```

### 12. API Routes

#### POST `/api/summaries/generate`

Fungsi:
- Menerima tanggal/range tanggal.
- Validasi user login.
- Ambil repository aktif milik user.
- Fetch commit dari GitHub untuk semua repository aktif.
- Normalize commit.
- Simpan commit log.
- Generate summary dengan LLM.
- Sanitasi HTML.
- Simpan WorkSummary.
- Return summary baru.

Request body:

```json
{
  "startDate": "2026-03-30",
  "endDate": "2026-03-30"
}
```

Response success:

```json
{
  "success": true,
  "summaryId": "summary_id",
  "totalCommits": 8,
  "totalProjects": 2
}
```

Response jika tidak ada commit:

```json
{
  "success": false,
  "message": "Tidak ada commit pada rentang tanggal yang dipilih."
}
```

#### GET `/api/summaries`

Fungsi:
- Mengambil daftar summary milik user login.
- Support pagination jika diperlukan.

#### GET `/api/github/commits`

Fungsi:
- Untuk debug atau testing.
- Ambil commit berdasarkan owner, repo, username, since, until.
- Jangan digunakan langsung dari client untuk production jika tidak perlu.

### 13. UI/UX Requirements

Dashboard:
- Tampilan bersih, profesional, dan mudah digunakan.
- Ada tombol "Buat Summary".
- Ada tabel summary harian.
- Ada loading state saat generate summary.
- Ada empty state jika belum ada summary.
- Ada error message jika GitHub API/LLM gagal.

Create Summary Modal:
- Input tanggal mulai.
- Input tanggal selesai.
- Tombol generate.
- Loading indicator.
- Validasi tanggal:
  - startDate wajib
  - endDate wajib
  - endDate tidak boleh sebelum startDate
  - range tanggal sebaiknya dibatasi agar tidak terlalu panjang, misalnya maksimal 31 hari

Detail Summary:
- Tampilkan title/tanggal.
- Tampilkan summary HTML.
- Tampilkan total commit.
- Tampilkan total project.
- Tambahkan tombol copy summary.
- Tambahkan tombol export jika diperlukan nanti.

### 14. Error Handling

Tangani error berikut:
- User belum login.
- GitHub token kosong.
- GitHub API rate limit.
- Repository tidak ditemukan.
- Tidak ada commit.
- LLM API key kosong.
- LLM gagal menghasilkan output.
- HTML hasil LLM tidak valid.
- Database error.

Jangan tampilkan error sensitif ke user.
Log error teknis di server.

Contoh pesan user-friendly:
- "Tidak ada commit pada tanggal yang dipilih."
- "Gagal mengambil data GitHub. Silakan coba lagi."
- "Gagal membuat summary. Silakan coba lagi atau gunakan provider AI lain."

### 15. Coding Rules

Ikuti aturan berikut saat mengubah kode:

- Gunakan TypeScript.
- Hindari `any` kecuali benar-benar diperlukan.
- Buat fungsi kecil dan jelas.
- Pisahkan logic GitHub, LLM, database, dan UI.
- Jangan hardcode secret.
- Jangan ubah struktur besar project tanpa instruksi.
- Jangan menghapus kode lama tanpa alasan jelas.
- Jangan membuat dependency baru jika tidak diperlukan.
- Jika perlu menambah dependency, jelaskan alasannya.
- Selalu validasi input dari client.
- Selalu cek session user pada route yang membutuhkan auth.
- Gunakan Prisma untuk operasi database.
- Gunakan server-side code untuk GitHub API dan LLM API.

### 16. Development Workflow for Codex

Saat diminta mengerjakan fitur:
1. Baca file terkait terlebih dahulu.
2. Jelaskan rencana perubahan secara singkat.
3. Buat perubahan seminimal mungkin.
4. Jangan refactor bagian yang tidak diminta.
5. Setelah perubahan, jelaskan:
   - file yang diubah
   - fungsi yang ditambahkan
   - cara testing
   - risiko atau catatan lanjutan

Saat memperbaiki bug:
1. Cari penyebab bug.
2. Perbaiki akar masalah.
3. Jangan hanya menutupi error.
4. Jangan mengubah behavior lain kecuali diperlukan.

Saat membuat fitur besar:
- Pecah menjadi beberapa langkah kecil.
- Prioritaskan versi MVP yang berjalan dulu.

### 17. MVP Priority

Prioritas implementasi MVP:

1. Setup Next.js + Supabase + Prisma.
2. Auth login.
3. Model database:
   - User
   - UserRepository
   - WorkSummary
   - CommitLog
4. CRUD repository sederhana.
5. Fetch commit GitHub berdasarkan tanggal.
6. Generate summary dengan LLM.
7. Simpan summary HTML.
8. Dashboard table summary.
9. Detail summary.
10. Copy summary.

Fitur setelah MVP:
- Export ke PDF.
- Export ke Markdown.
- Regenerate summary.
- Manual edit summary.
- Multi-user.
- Filter berdasarkan project.
- Grafik jumlah commit per hari.
- Scheduler otomatis harian.
- Integrasi GitHub OAuth.

### 18. Example Commit Normalization

Input dari GitHub:

```json
{
  "sha": "ad881e48e9c9bc8f1e03c8699a36f841a66cd91d",
  "commit": {
    "author": {
      "name": "Henry Junior Zai",
      "email": "94433467+henryjrzai@users.noreply.github.com",
      "date": "2026-03-30T10:01:33Z"
    },
    "message": "feat(nursery): remove pagination from nursery program list"
  },
  "author": {
    "login": "henryjrzai"
  },
  "html_url": "https://github.com/iweka-dev/nursery-oil-palm-be/commit/ad881e48e9c9bc8f1e03c8699a36f841a66cd91d"
}
```

Normalized output:

```ts
{
  sha: "ad881e48e9c9bc8f1e03c8699a36f841a66cd91d",
  message: "feat(nursery): remove pagination from nursery program list",
  authorName: "Henry Junior Zai",
  authorEmail: "94433467+henryjrzai@users.noreply.github.com",
  authorLogin: "henryjrzai",
  committedAt: new Date("2026-03-30T10:01:33Z"),
  htmlUrl: "https://github.com/iweka-dev/nursery-oil-palm-be/commit/ad881e48e9c9bc8f1e03c8699a36f841a66cd91d",
  owner: "iweka-dev",
  repo: "nursery-oil-palm-be",
  projectName: "Nursery Oil Palm - Gawai",
}
```

### 19. Summary Quality Rules

Summary yang baik:
- Tidak terlalu teknis.
- Tidak hanya menerjemahkan literal.
- Menggunakan kata kerja aktif.
- Menjelaskan manfaat pekerjaan bila jelas dari commit.
- Tetap jujur terhadap isi commit.
- Tidak mengarang fitur yang tidak ada.
- Menggabungkan commit yang mirip.
- Menggunakan format konsisten.

Contoh buruk:

```text
feat nursery remove pagination from nursery program list - done
```

Contoh baik:

```text
Menghapus paginasi dari daftar program pembibitan agar seluruh data program dapat ditampilkan sesuai kebutuhan. - done
```

Contoh buruk:

```text
Fix query sub block - done
```

Contoh baik:

```text
Memperbaiki kueri terkait data sub-blok agar hasil data yang ditampilkan lebih akurat. - done
```

### 20. Security Notes

- Jangan expose GitHub token ke browser.
- Jangan expose LLM API key ke browser.
- Jangan expose Supabase service role key ke browser.
- Sanitasi HTML hasil LLM.
- Validasi semua request body.
- Pastikan user hanya bisa melihat summary miliknya sendiri.
- Gunakan row-level ownership check di server.
- Jangan percaya data dari client untuk `userId`; ambil dari session Supabase.

### 21. Testing Checklist

Sebelum menyelesaikan task, pastikan:

- `npm run lint` berjalan.
- `npm run build` berjalan.
- Login bekerja.
- User tanpa login tidak bisa akses dashboard.
- Generate summary bekerja untuk tanggal yang memiliki commit.
- Generate summary menampilkan pesan jelas jika tidak ada commit.
- Commit duplicate tidak tersimpan ulang.
- Summary HTML tampil rapi.
- HTML hasil LLM sudah disanitasi.
- API key tidak muncul di client bundle.
- Error GitHub/LLM tidak membuat aplikasi crash.

### 22. Commands

Gunakan command berikut jika tersedia:

```bash
npm install
npm run dev
npm run lint
npm run build
npx prisma generate
npx prisma migrate dev
npx prisma studio
```

### 23. Preferred Implementation Style

- Gunakan `async/await`.
- Gunakan helper function untuk parsing tanggal.
- Gunakan Zod untuk validasi request jika tersedia.
- Gunakan service layer:
  - `fetchGithubCommits`
  - `normalizeGithubCommits`
  - `generateWorkSummary`
  - `sanitizeSummaryHtml`
  - `saveWorkSummary`
- Buat komponen UI reusable.
- Hindari logic berat di komponen React.
- Letakkan logic berat di server route atau lib service.

### 24. Final Goal

Aplikasi harus menjadi sistem sederhana tetapi berguna untuk merekam kegiatan pekerjaan developer berdasarkan commit GitHub.

Hasil akhirnya harus membantu user membuat laporan seperti:

```text
Senin, 30 Maret 2026

Nursery Oil Palm - Gawai
- Mengembangkan endpoint API untuk menampilkan detail Surat Perintah Kerja (SPK) khusus bagi Mantri Bibitan, serta memperbarui dokumentasi terkait. - done
- Memperbarui fitur penerimaan kecambah dengan menambahkan informasi tahap pertumbuhan (pra-nursery) pada data SPK yang diteruskan, agar dapat diakses oleh Mantri Bibitan. - done
```

Aplikasi harus memudahkan user untuk:
- login,
- memilih tanggal,
- mengambil commit,
- membuat summary otomatis,
- menyimpan hasil,
- melihat ulang summary,
- menyalin summary untuk dikirim ke project manager.
