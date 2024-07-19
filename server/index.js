const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const Post = require("./models/Post");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const app = express();
const port = 4000;
const uploadMiddleware = multer({ dest: "uploads/" });

// Use environment variables for sensitive information
const saltRounds = 10;
const secret = process.env.JWT_SECRET || "default_secret";

app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose.connect("mongodb://127.0.0.1:27017/bloging", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.get("/", (req, res) => {
  app.use(express.static(path.resolve(__dirname, "blog", "build")));
  res.sendFile(path.resolve(__dirname, "blog", "build", "index.html"));
});
 
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const userDoc = await User.create({
      username,
      password: hashedPassword,
    });
    res.json(userDoc);
  } catch (error) {
    res.status(400).json({ message: "Error registering user", error });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.findOne({ username });
    if (!userDoc) {
      return res.status(400).json({ message: "Wrong Credentials" });
    }

    const passOk = await bcrypt.compare(password, userDoc.password);
    if (!passOk) {
      return res.status(400).json({ message: "Wrong Credentials" });
    }

    const token = jwt.sign({ username, id: userDoc._id }, secret, {
      expiresIn: "24h",
    });

    res
      .cookie("token", token, {
        httpOnly: true,
        sameSite: "Strict", // For local testing; adjust for production
        // secure: true, // Uncomment for production
      })
      .json({ id: userDoc._id, username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  try {
    if (!token) {
      console.log("No token provided");
      return res.status(401).json({ message: "No token provided" });
    }

    jwt.verify(token, secret, (err, info) => {
      if (err) {
        console.error("Token verification error:", err);
        return res.status(401).json({ message: "Unauthorized" });
      }
      res.json(info);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { originalname, path: tempPath } = req.file;
    const ext = path.extname(originalname);
    const filename = `${Date.now()}${ext}`;
    const newPath = path.join(__dirname, "uploads", filename);
    fs.renameSync(tempPath, newPath);

    const { token } = req.cookies;
    jwt.verify(token, secret, async (err, info) => {
      if (err) throw err;
      const { title, summary, content } = req.body;
      const postDoc = await Post.create({
        title,
        summary,
        content,
        cover: filename, // Store only the filename
        author: info.id,
      });
      res.json(postDoc);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/post", uploadMiddleware.single("file"), async (req, res) => {
  let newPath = null;
  let filename = null;
  if (req.file) {
    const { originalname, path: tempPath } = req.file;
    const ext = path.extname(originalname);
    filename = `${Date.now()}${ext}`;
    newPath = path.join(__dirname, "uploads", filename);
    fs.renameSync(tempPath, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) {
      return res.status(403).json({ error: "Token verification failed" });
    }

    const { id, title, summary, content } = req.body;

    try {
      const postDoc = await Post.findById(id);
      if (!postDoc) {
        return res.status(404).json({ error: "Post not found" });
      }

      const isAuthor =
        JSON.stringify(postDoc.author) === JSON.stringify(info.id);
      if (!isAuthor) {
        return res.status(403).json({ error: "You are not the author" });
      }

      postDoc.title = title;
      postDoc.summary = summary;
      postDoc.content = content;
      if (newPath) {
        postDoc.cover = filename; // Store only the filename
      }

      await postDoc.save();

      res.json(postDoc);
    } catch (err) {
      res
        .status(500)
        .json({ error: "An error occurred while updating the post" });
    }
  });
});

app.get("/post", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching posts" });
  }
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const postDoc = await Post.findById(id).populate("author", ["username"]);
    if (!postDoc) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json(postDoc);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while fetching the post" });
  }
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
