import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Chip,
  CircularProgress,
} from "@mui/material";
import { AddCircle, Send } from "@mui/icons-material";
import { createPost } from "../slices/postsSlice";

const CreatePost = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.posts);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });
  const [manualTags, setManualTags] = useState("");
  const [formErrors, setFormErrors] = useState({});

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
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
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
      const tags = manualTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const result = await dispatch(
        createPost({
          title: formData.title,
          content: formData.content,
          tags,
        }),
      );

      if (!result.error) {
        navigate("/");
      }
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
        Create New Post 🐠
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Share your aquarium experience with the community
      </Typography>

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
              helperText={
                formErrors.title || "Give your post a descriptive title"
              }
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
              helperText={
                formErrors.content ||
                "Share your story, ask questions, or give advice"
              }
              multiline
              rows={8}
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Tags (optional)"
              name="tags"
              value={manualTags}
              onChange={(e) => setManualTags(e.target.value)}
              placeholder="e.g., freshwater, planted, beginner"
              helperText="Separate tags with commas"
              sx={{ mb: 3 }}
            />

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Auto-generated tags based on your content:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <i>
                  Tags will be automatically suggested when you create your post
                </i>
              </Typography>
            </Box>

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
                Publish Post
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate("/")}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CreatePost;
