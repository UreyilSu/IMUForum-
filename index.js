require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const methodOverride = require('method-override');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// MODELS
const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');

// Connect to MongoDB Atlas using environment variable
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB Atlas bağlantısı kuruldu.'))
.catch(err => console.error('MongoDB bağlantı hatası:', err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static('public'));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  })
);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları kabul edilir!'), false);
    }
  }
});

// Helper: Check if user is authenticated
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}
// Helper: Check if user is admin
async function requireAdmin(req, res, next) {
  try {
    if (!req.session.userId) return res.redirect('/login');
    const user = await User.findById(req.session.userId);
    if (user && user.isAdmin) return next();
    res.status(403).send('Yönetici erişimi gerekli');
  } catch (err) {
    console.error('requireAdmin error:', err);
    res.status(500).send('Sunucu hatası');
  }
}

// Sadece senin hesabını admin yap ve şifreyi hashle
mongoose.connection.once('open', async () => {
  console.log('MongoDB bağlantısı kuruldu.');
  const user = await User.findOne({ email: 'ureyilbusiness@gmail.com' });
  if (user) {
    if (!user.isAdmin) {
      user.isAdmin = true;
    }
    if (!user.passwordHash) {
      bcrypt.hash('6287', 12, (err, hashedPassword) => {
        if (err) {
          console.error('Admin şifresi hashlenirken hata oluştu:', err);
        } else {
          user.passwordHash = hashedPassword;
          user.save().then(() => {
            console.log('Admin şifresi hashlenip güncellendi.');
          }).catch(err => {
            console.error('Admin kaydedilirken hata oluştu:', err);
          });
        }
      });
    } else {
      await user.save();
    }
    console.log('Senin kullanıcı admin yapıldı: rootkali');
  }
});

// Category icons and descriptions
const categoryInfo = {
  'Genel': { icon: '💬', description: 'Genel konular, sohbet ve güncel olaylar hakkında konuşun' },
  'Dedikodu': { icon: '🗣️', description: 'Kampüs dedikoduları ve güncel olaylar' },
  'Öğrenciler': { icon: '👥', description: 'Öğrenci hayatı, etkinlikler ve deneyimler' },
  'Hocalar': { icon: '👨‍🏫', description: 'Hocalar, dersler ve akademik deneyimler' },
  'İtiraf': { icon: '💭', description: 'Anonim itiraflar ve kişisel deneyimler' },
  'Teknoloji': { icon: '💻', description: 'Teknoloji, yazılım, donanım ve dijital dünya hakkında' },
  'Eğitim': { icon: '📚', description: 'Eğitim, öğrenme, kurslar ve akademik konular' },
  'Spor': { icon: '⚽', description: 'Spor haberleri, maçlar ve spor aktiviteleri' },
  'Sanat': { icon: '🎨', description: 'Resim, heykel, tasarım ve sanat dünyası' },
  'Müzik': { icon: '🎵', description: 'Müzik türleri, sanatçılar ve konserler' },
  'Film': { icon: '🎬', description: 'Filmler, diziler ve sinema dünyası' },
  'Kitap': { icon: '📖', description: 'Kitaplar, yazarlar ve edebiyat dünyası' },
  'Oyun': { icon: '🎮', description: 'Video oyunları, oyun geliştirme ve oyun kültürü' },
  'Diğer': { icon: '🔧', description: 'Diğer kategorilere uymayan konular' }
};

// ROUTES
app.get('/', async (req, res) => {
  const currentUser = req.session.userId ? await User.findById(req.session.userId) : null;
  res.render('index', { currentUser });
});

// Category page
app.get('/category/:categoryName', async (req, res) => {
  const categoryName = decodeURIComponent(req.params.categoryName);
  const posts = await Post.find({ kategori: categoryName })
    .populate('author')
    .populate('comments')
    .sort({ createdAt: -1 });
  
  const currentUser = req.session.userId ? await User.findById(req.session.userId) : null;
  const categoryData = categoryInfo[categoryName] || { icon: '📁', description: 'Bu kategori hakkında' };
  
  res.render('category', {
    currentCategory: categoryName,
    categoryIcon: categoryData.icon,
    categoryDescription: categoryData.description,
    posts,
    currentUser
  });
});

// Register
app.get('/register', (req, res) => {
  res.render('register');
});
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.render('register', { error: 'Tüm alanları doldurunuz' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.render('register', { error: 'Bu email veya kullanıcı adı zaten kullanılıyor' });
    }
    
    const passwordHash = await bcrypt.hash(password, 12);
    const user = new User({ username, email, passwordHash });
    await user.save();
    req.session.userId = user._id;
    res.redirect('/');
  } catch (error) {
    console.error('Register error:', error);
    res.render('register', { error: 'Kayıt sırasında hata oluştu' });
  }
});

// Login
app.get('/login', (req, res) => {
  res.render('login');
});
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.render('login', { error: 'Email ve şifre gerekli' });
    }
    
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      req.session.userId = user._id;
      res.redirect('/');
    } else {
      res.render('login', { error: 'Geçersiz email veya şifre' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { error: 'Giriş sırasında hata oluştu' });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
    }
    res.redirect('/login');
  });
});

// Profile
app.get('/profile', requireLogin, async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.render('profile', { user });
});

// POSTS CRUD
app.get('/posts/new', requireLogin, (req, res) => {
  const category = req.query.category || '';
  res.render('posts/new', { selectedCategory: category, categoryInfo });
});
app.post('/posts', requireLogin, upload.single('image'), async (req, res) => {
  const { baslik, kategori, icerik } = req.body;
  const post = new Post({
    baslik,
    kategori,
    icerik,
    author: req.session.userId,
    image: req.file ? '/uploads/' + req.file.filename : null,
  });
  await post.save();
  // Redirect to category page instead of home
  res.redirect('/category/' + encodeURIComponent(kategori));
});
app.get('/posts/:id', async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate('author')
    .populate({
      path: 'comments',
      populate: { path: 'author' }
    });
  const currentUser = req.session.userId ? await User.findById(req.session.userId) : null;
  res.render('post', { post, currentUser });
});
app.get('/posts/:id/edit', requireLogin, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (post.author.toString() !== req.session.userId) {
    return res.status(403).send('Yetkisiz');
  }
  res.render('posts/edit', { post });
});
app.put('/posts/:id', requireLogin, upload.single('image'), async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (post.author.toString() !== req.session.userId) {
    return res.status(403).send('Yetkisiz');
  }
  post.baslik = req.body.baslik;
  post.kategori = req.body.kategori;
  post.icerik = req.body.icerik;
  if (req.file) {
    if (post.image) {
      const oldImagePath = path.join(__dirname, 'public', post.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    post.image = '/uploads/' + req.file.filename;
  }
  await post.save();
  res.redirect('/posts/' + req.params.id);
});
app.delete('/posts/:id', requireLogin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send('Post bulunamadı');
    if (post.author.toString() !== req.session.userId) {
      return res.status(403).send('Yetkisiz');
    }
    if (post.image) {
      const imagePath = path.join(__dirname, 'public', post.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    await Post.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Post silinirken hata oluştu');
  }
});

// COMMENTS
app.post('/posts/:id/comments', requireLogin, async (req, res) => {
  const post = await Post.findById(req.params.id);
  const comment = new Comment({
    icerik: req.body.icerik,
    author: req.session.userId,
    post: post._id,
  });
  await comment.save();
  post.comments.push(comment);
  await post.save();
  res.redirect('/posts/' + req.params.id + '#comments');
});
app.delete('/comments/:id', requireLogin, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).send('Yorum bulunamadı');
    if (comment.author.toString() !== req.session.userId) {
      return res.status(403).send('Yetkisiz');
    }
    await Comment.findByIdAndDelete(req.params.id);
    await Post.findByIdAndUpdate(comment.post, { $pull: { comments: comment._id } });
    res.redirect('/posts/' + comment.post + '#comments');
  } catch (err) {
    console.error(err);
    res.status(500).send('Yorum silinirken hata oluştu');
  }
});

// COMMENT LIKES
app.post('/comments/:id/like', requireLogin, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).send('Yorum bulunamadı');
    if (!comment.likes.includes(req.session.userId)) {
      comment.likes.push(req.session.userId);
      await comment.save();
    }
    res.redirect('/posts/' + comment.post + '#comments');
  } catch (err) {
    console.error(err);
    res.status(500).send('Yorum beğenirken hata oluştu');
  }
});

app.post('/comments/:id/unlike', requireLogin, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).send('Yorum bulunamadı');
    comment.likes = comment.likes.filter(
      userId => userId.toString() !== req.session.userId
    );
    await comment.save();
    res.redirect('/posts/' + comment.post + '#comments');
  } catch (err) {
    console.error(err);
    res.status(500).send('Yorum beğenisini geri alırken hata oluştu');
  }
});

// LIKES
app.post('/posts/:id/like', requireLogin, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post.likes.includes(req.session.userId)) {
    post.likes.push(req.session.userId);
    await post.save();
  }
  res.redirect('/posts/' + req.params.id + '#likes');
});
app.post('/posts/:id/unlike', requireLogin, async (req, res) => {
  const post = await Post.findById(req.params.id);
  post.likes = post.likes.filter(
    userId => userId.toString() !== req.session.userId
  );
  await post.save();
  res.redirect('/posts/' + req.params.id + '#likes');
});

// ADMIN PANEL
app.get('/admin', requireAdmin, async (req, res) => {
  const posts = await Post.find({}).populate('author').sort({ createdAt: -1 });
  const currentUser = req.session.userId ? await User.findById(req.session.userId) : null;
  res.render('admin/index', { posts, currentUser });
});
// DELETE '/admin/posts/:id' route - admin deletes post
app.delete('/admin/posts/:id', requireAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post && post.image) {
      const imagePath = path.join(__dirname, 'public', post.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    await Post.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Post silinirken hata oluştu');
  }
});

// 404
app.use((req, res) => {
  res.status(404).send('Sayfa bulunamadı');
});

// Start server
app.set('view engine', 'ejs');
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('IMUGOSSIP çalışıyor: http://localhost:' + PORT);
});