import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Edit, Send } from "@mui/icons-material";
import { updatePost, fetchPost } from "../slices/postsSlice";
import BoardSelector from "../components/BoardSelector";
import TagAutocomplete from "../components/TagAutocomplete";

const EditPost = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentPost, loading, error } = useSelector((state) => state.posts);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });
  const [selectedBoards, setSelectedBoards] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [boardError, setBoardError] = useState(false);

  useEffect(() => {
    if (postId) {
      dispatch(fetchPost(postId));
    }
  }, [dispatch, postId]);

  useEffect(() => {
    if (currentPost) {
      setFormData({
        title: currentPost.title || "",
        content: currentPost.content || "",
      });
      setSelectedBoards(
        currentPost.boards
          ? currentPost.boards.map((board) =>
              typeof board === "object" ? board._id : board,
            )
          : [],
      );
      setSelectedTags(
        currentPost.tags
          ? currentPost.tags.map((t) => (typeof t === "object" ? t.tag : t))
          : [],
      );
    }
  }, [currentPost]);

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = "Title is required";
    } else if (formData.title.length < 3) {
      errors.title = "Title must be at least 3 characters";
    } else if (formData.title.length > 200) {
      errors.title = "Title cannot exceed 200 characters";
    }
    if (!formData.content.trim()) {
      errors.content = "Content is required";
    } else if (formData.content.length < 10) {
      errors.content = "Content must be at least 10 characters";
    } else if (formData.content.length > 10000) {
      errors.content = "Content cannot exceed 10000 characters";
    }

    if (selectedBoards.length === 0) {
      setBoardError(true);
    } else {
      setBoardError(false);
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0 && selectedBoards.length > 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      const postData = {
        title: formData.title,
        content: formData.content,
        boards: selectedBoards,
        tags: selectedTags,
      };

      const result = await dispatch(updatePost({ postId, data: postData }));

      if (!result.error) {
        navigate(`/posts/${postId}`);
      }
    }
  };

  if (!currentPost && !loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Post not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
        Edit Post ✏️
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Update your post content
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card>
          <CardContent sx={{ p: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                error={!!formErrors.title}
                helperText={formErrors.title}
                placeholder="e.g., My First Planted Tank Setup"
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                label="Content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                error={!!formErrors.content}
                helperText={formErrors.content}
                multiline
                rows={8}
                sx={{ mb: 3 }}
              />

              <BoardSelector
                selectedBoards={selectedBoards}
                onChange={setSelectedBoards}
                error={boardError}
                helperText={
                  boardError
                    ? "Please select at least one board"
                    : "Select one or more boards"
                }
              />

              <TagAutocomplete
                value={selectedTags}
                onChange={setSelectedTags}
                placeholder="e.g., 燈魚, 孔雀魚, 水草缸"
              />

              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  startIcon={
                    loading ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <Send />
                    )
                  }
                  disabled={loading}
                >
                  Save Changes
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate(`/post/${postId}`)}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default EditPost;
