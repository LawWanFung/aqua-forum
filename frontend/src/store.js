import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import postsReducer from "./slices/postsSlice";
import usersReducer from "./slices/usersSlice";
import photosReducer from "./slices/photosSlice";
import notificationsReducer from "./slices/notificationsSlice";
import albumsReducer from "./slices/albumsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    posts: postsReducer,
    users: usersReducer,
    photos: photosReducer,
    notifications: notificationsReducer,
    albums: albumsReducer,
  },
});
