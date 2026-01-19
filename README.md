# Aqua Forum 🐠

A modern aquarium enthusiast forum platform built with MERN stack (MongoDB, Express, React, Node.js).

## Features

- **User Authentication**: Register, login, and secure JWT-based authentication
- **Forum Posts**: Create, edit, delete posts with auto-tagging system
- **Photo Gallery**: Upload and share aquarium photos
- **User Profiles**: Customizable profiles with stats
- **Dark/Light Theme**: Theme switching with persistence
- **Search**: Find posts and photos easily

## Tech Stack

### Frontend

- React 18 with functional components and hooks
- React Router v6 for navigation
- Redux Toolkit for state management
- Material-UI v5 for components
- Axios for API calls

### Backend

- Node.js & Express.js
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**

```bash
cd aqua-forum
```

2. **Install backend dependencies**

```bash
cd backend
npm install
```

3. **Configure environment variables**

```bash
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

4. **Install frontend dependencies**

```bash
cd ../frontend
npm install
```

### Running the Application

1. **Start MongoDB** (if running locally)

```bash
mongod
```

2. **Start the backend server**

```bash
cd backend
npm run dev
```

Server runs on http://localhost:5000

3. **Start the frontend** (in a new terminal)

```bash
cd frontend
npm start
```

Frontend runs on http://localhost:3000

## Project Structure

```
aqua-forum/
├── backend/
│   ├── config/
│   │   └── db.js          # Database connection
│   ├── middleware/
│   │   └── auth.js        # JWT authentication
│   ├── models/
│   │   ├── User.js        # User model
│   │   ├── Post.js        # Post model
│   │   └── Photo.js       # Photo model
│   ├── routes/
│   │   ├── auth.js        # Auth routes
│   │   ├── users.js       # User routes
│   │   ├── posts.js       # Post routes
│   │   └── photos.js      # Photo routes
│   ├── server.js          # Express server
│   ├── .env               # Environment variables
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── api.js         # Axios configuration
│   │   ├── App.js         # Main app component
│   │   ├── index.js       # Entry point
│   │   ├── store.js       # Redux store
│   │   ├── theme.js       # MUI theme configuration
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   └── slices/        # Redux slices
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Users

- `GET /api/users/:userId` - Get user profile
- `PUT /api/users/:userId` - Update profile
- `GET /api/users/:userId/photos` - Get user's photos
- `GET /api/users/:userId/posts` - Get user's posts

### Posts

- `GET /api/posts` - Get all posts
- `GET /api/posts/search` - Search posts
- `GET /api/posts/:postId` - Get single post
- `POST /api/posts` - Create post
- `PUT /api/posts/:postId` - Update post
- `DELETE /api/posts/:postId` - Delete post
- `POST /api/posts/:postId/like` - Like post
- `POST /api/posts/:postId/bookmark` - Bookmark post

### Photos

- `GET /api/photos` - Get all photos
- `POST /api/photos/upload` - Upload photo
- `GET /api/photos/:photoId` - Get photo
- `PUT /api/photos/:photoId` - Update photo
- `DELETE /api/photos/:photoId` - Delete photo
- `POST /api/photos/:photoId/like` - Like photo

## Environment Variables

### Backend (.env)

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aqua-forum
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
```

### Frontend (.env)

```
REACT_APP_API_URL=http://localhost:5000/api
```

## License

MIT

## Contributing

Pull requests are welcome!

---

Happy coding! 🐠🐟🦀
