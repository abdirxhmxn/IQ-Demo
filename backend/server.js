const path = require("path");
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const methodOverride = require("method-override");
const flash = require("express-flash");
const logger = require("morgan");
const connectDB = require("./config/database");
const mainRoutes = require("./routes/main");
const postRoutes = require("./routes/posts");
const cookieParser = require("cookie-parser");

// Use .env file in project config folder
require("dotenv").config({ path: path.join(__dirname, "../config/.env") });

if (!process.env.DB_STRING) {
  console.error("FATAL: DB_STRING is not set. Refusing to start.");
  process.exit(1);
}

// Trust Render's reverse proxy so req.protocol / secure cookies behave correctly
app.set("trust proxy", 1);

// Passport config
require("./config/passport")(passport);

//Connect To Database
connectDB();

//Using EJS for views
app.set("view engine", "ejs");
// Point Express at the new frontend folder
app.set("views", path.join(__dirname, "../frontend/views"));

//Static Folder
app.use(express.static(path.join(__dirname, "../frontend/public")));

//Body Parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//Logging
app.use(logger("dev"));

//Use forms for put / delete
app.use(methodOverride("_method"));

// Setup Sessions - stored in MongoDB
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.DB_STRING,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);



// Passport middleware
app.use(passport.initialize());
app.use(passport.session());
app.use(passport.authenticate("session"));

//Use flash messages for errors, info, ect...
app.use(flash());

//Setup Routes For Which The Server Is Listening
app.use("/", mainRoutes);
app.use("/post", postRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).send("Not Found");
});

//Server Running
const PORT = process.env.PORT || 2121;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
