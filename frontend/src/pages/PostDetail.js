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
  Modal,
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
  Fullscreen,
  Close,
  ChevronLeft,
  ChevronRight,
} from "@mui/icons-material";
import { fetchPost, likePost, deletePost } from "../slices/postsSlice";
import "react-image-gallery/styles/css/image-gallery.css";

const styleModal = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  maxWidth: "90vw",
  maxHeight: "90vh",
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 1,
  outline: "none",
  borderRadius: 1,
};

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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();

    if (postId) {
      dispatch(fetchPost(postId, { signal: abortController.signal }));
    }

    return () => {
      abortController.abort();
    };
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

  const openLightbox = (index) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === (currentPost?.media?.length || 1) - 1 ? 0 : prev + 1,
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? (currentPost?.media?.length || 1) - 1 : prev - 1,
    );
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
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            mb: 3,
            justifyContent: "flex-end",
          }}
        >
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
                fontSize: "0.7rem",
              }}
            />
          ))}
        </Box>
      )}

      <Typography
        variant="h3"
        component="h1"
        gutterBottom
        fontWeight={700}
        marginBottom={3}
      >
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

      {/* Media Gallery with Carousel */}
      {currentPost.media?.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {/* Main carousel */}
          <Box
            sx={{
              position: "relative",
              borderRadius: 2,
              overflow: "hidden",
              cursor: "pointer",
              "&:hover .nav-buttons": {
                opacity: 1,
              },
            }}
            onClick={() => openLightbox(currentImageIndex)}
          >
            <Box
              component="img"
              src={currentPost.media[currentImageIndex]?.url}
              alt={`Image ${currentImageIndex + 1}`}
              sx={{
                width: "100%",
                height: 400,
                objectFit: "contain",
                backgroundColor: "#f5f5f5",
              }}
            />

            {/* Navigation buttons */}
            {currentPost.media.length > 1 && (
              <>
                <IconButton
                  className="nav-buttons"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  sx={{
                    position: "absolute",
                    left: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    color: "white",
                    opacity: 0,
                    transition: "opacity 0.2s",
                    "&:hover": {
                      backgroundColor: "rgba(0,0,0,0.7)",
                    },
                  }}
                >
                  <ChevronLeft />
                </IconButton>
                <IconButton
                  className="nav-buttons"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  sx={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    color: "white",
                    opacity: 0,
                    transition: "opacity 0.2s",
                    "&:hover": {
                      backgroundColor: "rgba(0,0,0,0.7)",
                    },
                  }}
                >
                  <ChevronRight />
                </IconButton>
              </>
            )}

            {/* Fullscreen button */}
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                openLightbox(currentImageIndex);
              }}
              sx={{
                position: "absolute",
                bottom: 8,
                right: 8,
                backgroundColor: "rgba(0,0,0,0.5)",
                color: "white",
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.7)",
                },
              }}
            >
              <Fullscreen />
            </IconButton>

            {/* Image counter */}
            <Box
              sx={{
                position: "absolute",
                bottom: 8,
                left: 8,
                backgroundColor: "rgba(0,0,0,0.5)",
                color: "white",
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                fontSize: 12,
              }}
            >
              {currentImageIndex + 1} / {currentPost.media.length}
            </Box>
          </Box>

          {/* Thumbnail strip */}
          {currentPost.media.length > 1 && (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                mt: 2,
                overflowX: "auto",
                pb: 1,
              }}
            >
              {currentPost.media.map((item, index) => (
                <Box
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  sx={{
                    width: 80,
                    height: 60,
                    flexShrink: 0,
                    borderRadius: 1,
                    overflow: "hidden",
                    cursor: "pointer",
                    border: index === currentImageIndex ? 2 : 0,
                    borderColor: "primary.main",
                    opacity: index === currentImageIndex ? 1 : 0.6,
                    transition: "all 0.2s",
                    "&:hover": {
                      opacity: 1,
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={item.url}
                    alt={`Thumbnail ${index + 1}`}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Lightbox Modal */}
      <Modal
        open={lightboxOpen}
        onClose={closeLightbox}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "rgba(0,0,0,0.9)",
        }}
      >
        <Box sx={styleModal}>
          {/* Close button */}
          <IconButton
            onClick={closeLightbox}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: "white",
              zIndex: 1,
            }}
          >
            <Close />
          </IconButton>

          {/* Main image */}
          <Box
            component="img"
            src={currentPost.media[currentImageIndex]?.url}
            alt={`Image ${currentImageIndex + 1}`}
            sx={{
              maxWidth: "85vw",
              maxHeight: "80vh",
              objectFit: "contain",
            }}
          />

          {/* Navigation */}
          {currentPost.media.length > 1 && (
            <>
              <IconButton
                onClick={prevImage}
                sx={{
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "white",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  "&:hover": {
                    backgroundColor: "rgba(0,0,0,0.7)",
                  },
                }}
              >
                <ChevronLeft />
              </IconButton>
              <IconButton
                onClick={nextImage}
                sx={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "white",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  "&:hover": {
                    backgroundColor: "rgba(0,0,0,0.7)",
                  },
                }}
              >
                <ChevronRight />
              </IconButton>
            </>
          )}

          {/* Counter */}
          <Box
            sx={{
              textAlign: "center",
              color: "text.secondary",
              mt: 1,
            }}
          >
            {currentImageIndex + 1} / {currentPost.media.length}
          </Box>
        </Box>
      </Modal>

      <Card sx={{ mb: 8 }}>
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
          <Typography variant="subtitle2" color="tags.dark" gutterBottom>
            Tags
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {currentPost.tags.map((tag, index) => (
              <Chip
                key={index}
                label={typeof tag === "object" ? tag.tag : tag}
                variant="outlined"
                size="small"
                clickable
                sx={{
                  color: "tags.main",
                }}
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
