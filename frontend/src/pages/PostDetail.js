import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Button,
  Chip,
  IconButton,
  Skeleton,
  Alert,
  Divider,
  Grid,
  CardMedia,
} from "@mui/material";
import {
  Favorite,
  FavoriteBorder,
  Bookmark,
  BookmarkBorder,
  Edit,
  Delete,
  Visibility,
  ChatBubble,
  Share,
} from "@mui/icons-material";
import { fetchPost, likePost, deletePost } from "../slices/postsSlice";
import LazyImage from "../components/LazyImage";

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
  const { currentPost, loading, error } = useSelector((state) => state.posts);
  const { user } = useSelector((state) => state.auth);

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    if (postId) {
      dispatch(fetchPost(postId));
    }
  }, [dispatch, postId]);

  useEffect(() => {
    if (currentPost) {
      setIsLiked(
        currentPost.engagement?.likes?.some(
          (like) => like._id === user?._id || like === user?._id,
        ),
      );
      setLikeCount(currentPost.metadata?.likeCount || 0);
    }
  }, [currentPost, user]);

  const handleLike = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    const result = await dispatch(likePost(postId));
    if (!result.error) {
      setIsLiked(result.payload.liked);
      setLikeCount(result.payload.likeCount);
    }
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      const result = await dispatch(deletePost(postId));
      if (!result.error) {
        navigate("/");
      }
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: currentPost?.title,
        text: currentPost?.content?.substring(0, 100),
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Skeleton variant="text" width="60%" height={48} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="40%" height={24} sx={{ mb: 4 }} />
        <Skeleton variant="rectangular" height={200} sx={{ mb: 3 }} />
        <Skeleton variant="text" width="100%" height={100} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!currentPost) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">Post not found</Alert>
      </Container>
    );
  }

  const isOwner = user?._id === currentPost.user?._id;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Boards */}
      {currentPost.boards?.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
          {currentPost.boards.map((board, index) => (
            <Chip
              key={index}
              label={`${board.icon} ${board.name}`}
              component={Link}
              to={`/?board=${board._id}`}
              clickable
              sx={{
                backgroundColor: board.color + "20",
                border: "1px solid",
                borderColor: board.color + "40",
              }}
            />
          ))}
        </Box>
      )}

      <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
        {currentPost.title}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <Avatar
          src={currentPost.user?.profile?.avatar}
          sx={{ width: 48, height: 48, mr: 2 }}
        >
          {currentPost.user?.username?.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {currentPost.user?.username}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDate(currentPost.metadata?.createdAt)}
          </Typography>
        </Box>

        {isOwner && (
          <Box>
            <Button
              component={Link}
              to={`/edit/${postId}`}
              startIcon={<Edit />}
              sx={{ mr: 1 }}
            >
              Edit
            </Button>
            <Button color="error" startIcon={<Delete />} onClick={handleDelete}>
              Delete
            </Button>
          </Box>
        )}
      </Box>

      {/* Media Gallery */}
      {currentPost.media?.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {currentPost.media.map((item, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Card>
                <CardMedia
                  component="img"
                  height="300"
                  image={item.url}
                  alt={`Media ${index + 1}`}
                  loading="lazy"
                />
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography
            variant="body1"
            sx={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.8,
            }}
          >
            {currentPost.content}
          </Typography>
        </CardContent>
      </Card>

      {/* Tags */}
      {currentPost.tags?.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Tags
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {currentPost.tags.map((tag, index) => (
              <Chip
                key={index}
                label={typeof tag === "object" ? tag.tag : tag}
                variant="outlined"
                size="small"
              />
            ))}
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Actions */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton
            onClick={handleLike}
            color={isLiked ? "error" : "default"}
          >
            {isLiked ? <Favorite /> : <FavoriteBorder />}
          </IconButton>
          <Typography>{likeCount}</Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <ChatBubble fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {currentPost.metadata?.commentCount || 0}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Visibility fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {currentPost.metadata?.viewCount || 0}
            </Typography>
          </Box>
        </Box>

        <Box>
          <IconButton onClick={handleBookmark}>
            {isBookmarked ? <Bookmark /> : <BookmarkBorder />}
          </IconButton>
          <IconButton onClick={handleShare}>
            <Share />
          </IconButton>
        </Box>
      </Box>
    </Container>
  );
};

export default PostDetail;
