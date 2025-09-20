# IMUForum

IMUForum, Express.js ve MongoDB kullanılarak geliştirilmiş bir forum uygulamasıdır.

## Özellikler

- ✅ Kullanıcı kayıt/giriş sistemi
- ✅ Gönderi oluşturma, düzenleme, silme
- ✅ Yorum sistemi
- ✅ Beğeni sistemi
- ✅ Resim yükleme (Multer ile)
- ✅ Admin paneli
- ✅ Kategori sistemi
- ✅ Responsive tasarım

## Kurulum

1. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

2. **MongoDB'yi başlatın:**
   ```bash
   # macOS için (Homebrew ile kurulu ise)
   brew services start mongodb-community
   
   # Veya manuel olarak
   mongod --dbpath ~/mongodb-data
   ```

3. **Uygulamayı başlatın:**
   ```bash
   npm start
   # veya
   node index.js
   # veya
   ./start.sh
   ```

4. **Tarayıcınızda açın:**
   ```
   http://localhost:3000
   ```



## API Endpoints

### Kimlik Doğrulama
- `GET /login` - Giriş sayfası
- `POST /login` - Giriş işlemi
- `GET /register` - Kayıt sayfası
- `POST /register` - Kayıt işlemi
- `POST /logout` - Çıkış işlemi

### Gönderiler
- `GET /` - Ana sayfa (tüm gönderiler)
- `GET /posts/new` - Yeni gönderi oluştur
- `POST /posts` - Gönderi kaydet
- `GET /posts/:id` - Gönderi detayı
- `GET /posts/:id/edit` - Gönderi düzenle
- `PUT /posts/:id` - Gönderi güncelle
- `DELETE /posts/:id` - Gönderi sil

### Yorumlar
- `POST /posts/:id/comments` - Yorum ekle
- `DELETE /comments/:id` - Yorum sil

### Beğeniler
- `POST /posts/:id/like` - Gönderi beğen
- `POST /posts/:id/unlike` - Beğeniyi geri al

### Admin
- `GET /admin` - Admin paneli
- `DELETE /admin/posts/:id` - Admin gönderi sil

## Teknolojiler

- **Backend:** Node.js, Express.js
- **Veritabanı:** MongoDB, Mongoose
- **Template Engine:** EJS
- **File Upload:** Multer
- **Authentication:** Express-session, bcrypt
- **Styling:** CSS3

## Dosya Yapısı

```
IMUForum/
├── models/
│   ├── User.js          # Kullanıcı modeli
│   ├── Post.js          # Gönderi modeli
│   └── Comment.js       # Yorum modeli
├── views/
│   ├── index.ejs        # Ana sayfa
│   ├── login.ejs        # Giriş sayfası
│   ├── register.ejs     # Kayıt sayfası
│   ├── profile.ejs      # Profil sayfası
│   ├── posts/
│   │   ├── new.ejs      # Yeni gönderi
│   │   └── edit.ejs     # Gönderi düzenle
│   └── admin/
│       └── index.ejs    # Admin paneli
├── public/
│   └── uploads/         # Yüklenen resimler
├── index.js             # Ana uygulama dosyası
└── package.json         # Bağımlılıklar
```

## Sorun Giderme

### MongoDB Bağlantı Hatası
```bash
# MongoDB servisini kontrol edin
brew services list | grep mongo

# MongoDB'yi yeniden başlatın
brew services restart mongodb-community
```

### Port Zaten Kullanımda
```bash
# Port 3000'i kullanan işlemi bulun
lsof -ti:3000

# İşlemi sonlandırın
kill -9 $(lsof -ti:3000)
```

### Resim Yükleme Sorunu
- `public/uploads/` klasörünün mevcut olduğundan emin olun
- Dosya boyutunun 5MB'dan küçük olduğundan emin olun
- Sadece resim dosyalarının yüklendiğinden emin olun

## Lisans

ISC

