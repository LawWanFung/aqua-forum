import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api";

// Fetch Posts
export const fetchPosts = createAsyncThunk(
  "posts/fetchPosts",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/posts", { params });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to fetch posts",
      );
    }
  },
);

// Fetch Single Post
export const fetchPost = createAsyncThunk(
  "posts/fetchPost",
  async (postId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/posts/${postId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to fetch post",
      );
    }
  },
);

// Create Post
export const createPost = createAsyncThunk(
  "posts/createPost",
  async (postData, { rejectWithValue }) => {
    try {
      const response = await api.post("/posts", postData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to create post",
      );
    }
  },
);

// Update Post
export const updatePost = createAsyncThunk(
  "posts/updatePost",
  async ({ postId, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/posts/${postId}`, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to update post",
      );
    }
  },
);

// Delete Post
export const deletePost = createAsyncThunk(
  "posts/deletePost",
  async (postId, { rejectWithValue }) => {
    try {
      await api.delete(`/posts/${postId}`);
      return postId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to delete post",
      );
    }
  },
);

// Like Post
export const likePost = createAsyncThunk(
  "posts/likePost",
  async (postId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/posts/${postId}/like`);
      return { postId, ...response.data.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to like post",
      );
    }
  },
);

// Search Posts
export const searchPosts = createAsyncThunk(
  "posts/searchPosts",
  async (query, { rejectWithValue }) => {
    try {
      const response = await api.get("/posts/search", { params: { q: query } });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Search failed",
      );
    }
  },
);

// Fetch Boards
export const fetchBoards = createAsyncThunk(
  "posts/fetchBoards",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/boards");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to fetch boards",
      );
    }
  },
);

// Fetch Posts by Board
export const fetchPostsByBoard = createAsyncThunk(
  "posts/fetchPostsByBoard",
  async ({ boardId, params = {} }, { rejectWithValue }) => {
    try {
      const response = await api.get("/posts", {
        params: { ...params, board: boardId },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to fetch posts",
      );
    }
  },
);

// Search Tags (autocomplete)
export const searchTags = createAsyncThunk(
  "posts/searchTags",
  async ({ query, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await api.get("/tags/search", {
        params: { q: query, limit },
      });
      return response.data.data.tags;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to search tags",
      );
    }
  },
);

const initialState = {
  posts: [],
  currentPost: null,
  boards: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  selectedBoard: null,
  tagSuggestions: [],
  loading: false,
  error: null,
};

const postsSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    clearCurrentPost: (state) => {
      state.currentPost = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setSelectedBoard: (state, action) => {
      state.selectedBoard = action.payload;
    },
    clearTagSuggestions: (state) => {
      state.tagSuggestions = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Posts
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload.posts;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Single Post
      .addCase(fetchPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPost.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPost = action.payload;
      })
      .addCase(fetchPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create Post
      .addCase(createPost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.loading = false;
        state.posts.unshift(action.payload);
        state.pagination.total += 1;
      })
      .addCase(createPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Post
      .addCase(updatePost.fulfilled, (state, action) => {
        const index = state.posts.findIndex(
          (p) => p._id === action.payload._id,
        );
        if (index !== -1) {
          state.posts[index] = action.payload;
        }
        if (state.currentPost?._id === action.payload._id) {
          state.currentPost = action.payload;
        }
      })
      // Delete Post
      .addCase(deletePost.fulfilled, (state, action) => {
        state.posts = state.posts.filter((p) => p._id !== action.payload);
        state.pagination.total -= 1;
      })
      // Like Post
      .addCase(likePost.fulfilled, (state, action) => {
        const { postId, liked, likeCount } = action.payload;
        const post = state.posts.find((p) => p._id === postId);
        if (post) {
          post.metadata.likeCount = likeCount;
        }
        if (state.currentPost?._id === postId) {
          state.currentPost.metadata.likeCount = likeCount;
        }
      })
      // Search Posts
      .addCase(searchPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload.posts;
        state.pagination = action.payload.pagination;
      })
      .addCase(searchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Boards
      .addCase(fetchBoards.fulfilled, (state, action) => {
        state.boards = action.payload;
      })
      // Fetch Posts by Board
      .addCase(fetchPostsByBoard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPostsByBoard.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload.posts;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPostsByBoard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Search Tags (autocomplete)
      .addCase(searchTags.fulfilled, (state, action) => {
        state.tagSuggestions = action.payload;
      });
  },
});

export const {
  clearCurrentPost,
  clearError,
  setSelectedBoard,
  clearTagSuggestions,
} = postsSlice.actions;
export default postsSlice.reducer;
