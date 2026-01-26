import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  IconButton,
} from "@mui/material";
import { AddCircle, Send, ArrowBack } from "@mui/icons-material";
import { createPost } from "../slices/postsSlice";
import BoardSelector from "../components/BoardSelector";
import TagAutocomplete from "../components/TagAutocomplete";

const CreatePost = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error, boards } = useSelector((state) => state.posts);
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });
  const [selectedBoards, setSelectedBoards] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [boardError, setBoardError] = useState(false);

  // Get the board ID from URL query param and pre-select if present
  useEffect(() => {
    const boardId = searchParams.get("board");
    if (boardId && boards.length > 0) {
      // Verify the board exists before setting
      const boardExists = boards.some((b) => b._id === boardId);
      if (boardExists) {
        setSelectedBoards([boardId]);
      }
    }
  }, [searchParams, boards]);

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

    // Check boards
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

      const result = await dispatch(createPost(postData));

      if (!result.error) {
        navigate("/");
      }
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Back button */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexDirection: "row",
          mb: 2,
        }}
      >
        <IconButton
          onClick={() => navigate(-1)}
          sx={{ mb: 0.3, left: "-10px" }}
          aria-label="go back"
        >
          <ArrowBack />
        </IconButton>
        返回
      </Box>

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
