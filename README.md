# TikTok Creator Hub - Backend API

Node.js/Express API backend with MongoDB for TikTok Creator Hub.

## 🚀 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs

## 📦 Installation

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your MongoDB connection string and JWT secret:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/tiktok-creator-hub
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   NODE_ENV=development
   ```

3. **Start MongoDB**
   - Make sure MongoDB is installed and running
   - Or use MongoDB Atlas (cloud): Update `MONGODB_URI` with your Atlas connection string

4. **Run the server**
   ```bash
   # Development (with nodemon)
   npm run dev
   
   # Production
   npm start
   ```

The API will be available at `http://localhost:5000`

## 📚 API Endpoints

### Authentication

- `POST /api/auth/signup` - Register a new user
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }
  ```

- `POST /api/auth/signin` - Login user
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

- `GET /api/auth/me` - Get current user (requires token)

### Ideas

All ideas endpoints require authentication token in header:
```
Authorization: Bearer <token>
```

- `GET /api/ideas` - Get all ideas for current user
- `GET /api/ideas/:id` - Get single idea
- `POST /api/ideas` - Create new idea
  ```json
  {
    "title": "My Video Idea",
    "description": "Video description",
    "tags": "tag1, tag2, tag3"
  }
  ```
- `PUT /api/ideas/:id` - Update idea
- `DELETE /api/ideas/:id` - Delete idea

## 🔐 Authentication

The API uses JWT tokens for authentication. After signup/signin, you'll receive a token that must be included in subsequent requests:

```
Authorization: Bearer <your-jwt-token>
```

Tokens expire after 30 days.

## 🗄️ Database Schema

### User
- `name` (String, required)
- `email` (String, required, unique)
- `password` (String, required, hashed)
- `createdAt` (Date)

### Idea
- `title` (String, required)
- `description` (String)
- `tags` (Array of Strings)
- `user` (ObjectId, reference to User)
- `createdAt` (Date)

## ☁️ Deploy to Vercel

This backend is configured for Vercel serverless deployment:

1. **Connect your repo** to Vercel (or use `vercel` CLI)
2. **Set environment variables** in Vercel project settings:
   - `MONGODB_URI` - Your MongoDB Atlas connection string
   - `JWT_SECRET` - Your JWT secret key
3. **Deploy** - Vercel auto-detects the Express app from `server.js`

**MongoDB Atlas:** Ensure Network Access allows connections from anywhere (`0.0.0.0/0`) so Vercel's serverless functions can connect.

## 🔧 Development

To use nodemon for auto-restart during development:
```bash
npm install -g nodemon
npm run dev
```

## 📝 Notes

- Passwords are automatically hashed using bcryptjs before saving
- Each user can only access their own ideas
- MongoDB connection is handled automatically on server start
- CORS is enabled for all origins (adjust in production)