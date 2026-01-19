import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Button,
  Divider,
  Alert,
  Skeleton,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material";
import {
  Favorite,
  FavoriteBorder,
  Bookmark,
  BookmarkBorder,
  Visibility,
  Edit,
  Delete,
  ArrowBack,
} from "@mui/icons-material";
import { fetchPost, deletePost, likePost } from "../slices/postsSlice";
import { likePost as likePostBackend } from "../slices/postsSlice";

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    currentPost: post,
    loading,
    error,
  } = useSelector((state) => state.posts);
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    dispatch(fetchPost(postId));
  }, [dispatch, postId]);

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      await dispatch(deletePost(postId));
      navigate("/");
    }
    setAnchorEl(null);
  };

  const handleLike = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    dispatch(likePostBackend(postId));
  };

  const isOwner = user?._id === post?.user?._id;

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="text" width="20%" height={32} />
        <Skeleton variant="text" width="60%" height={48} sx={{ mt: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
        <Skeleton variant="text" width="100%" sx={{ mt: 2 }} />
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="80%" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          component={Link}
          to="/"
          startIcon={<ArrowBack />}
          sx={{ mt: 2 }}
        >
          Back to Home
        </Button>
      </Container>
    );
  }

  if (!post) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">Post not found</Alert>
        <Button
          component={Link}
          to="/"
          startIcon={<ArrowBack />}
          sx={{ mt: 2 }}
        >
          Back to Home
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button component={Link} to="/" startIcon={<ArrowBack />} sx={{ mb: 3 }}>
        Back to Home
      </Button>

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Avatar
                src={post.user?.profile?.avatar}
                sx={{ width: 48, height: 48, mr: 2 }}
              >
                {post.user?.username?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  {post.user?.username}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(post.metadata?.createdAt)}
                </Typography>
              </Box>
            </Box>

            {isAuthenticated && (
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                <Edit />
              </IconButton>
            )}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem component={Link} to={`/edit/${post._id}`}>
                <ListItemIcon>
                  <Edit fontSize="small" />
                </ListItemIcon>
                Edit
              </MenuItem>
              <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
                <ListItemIcon>
                  <Delete fontSize="small" color="error" />
                </ListItemIcon>
                Delete
              </MenuItem>
            </Menu>
          </Box>

          <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
            {post.title}
          </Typography>

          {post.tags?.length > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
              {post.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag.tag}
                  size="small"
                  color={tag.autoGenerated ? "default" : "primary"}
                  variant={tag.autoGenerated ? "outlined" : "filled"}
                />
              ))}
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Box
            sx={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.8,
              "& img": { maxWidth: "100%", height: "auto" },
            }}
          >
            {post.content}
          </Box>

          {post.media?.length > 0 && (
            <Box sx={{ mt: 3 }}>
              {post.media.map((item, index) => (
                <Box
                  key={index}
                  component="img"
                  src={item.url}
                  alt={`Media ${index + 1}`}
                  sx={{
                    width: "100%",
                    maxHeight: 400,
                    objectFit: "cover",
                    borderRadius: 1,
                    mt: 2,
                  }}
                />
              ))}
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Visibility color="action" />
                <Typography variant="body2" color="text.secondary">
                  {post.metadata?.viewCount || 0} views
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant={
                  post.engagement?.likes?.includes(user?._id)
                    ? "contained"
                    : "outlined"
                }
                color="error"
                startIcon={
                  post.engagement?.likes?.includes(user?._id) ? (
                    <Favorite />
                  ) : (
                    <FavoriteBorder />
                  )
                }
                onClick={handleLike}
              >
                {post.metadata?.likeCount || 0}
              </Button>
              <Button variant="outlined" startIcon={<Bookmark />}>
                Save
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default PostDetail;
