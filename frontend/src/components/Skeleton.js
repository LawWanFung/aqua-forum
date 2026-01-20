import { Box, Skeleton, useTheme } from "@mui/material";
import React from "react";

export const PostCardSkeleton = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        p: 2,
        mb: 2,
        bgcolor: isDark ? "background.paper" : "#fff",
        borderRadius: 2,
        boxShadow: 1,
      }}
    >
      {/* Header: Avatar + Username */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Skeleton variant="circular" width={40} height={40} sx={{ mr: 1.5 }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton width={120} height={20} />
          <Skeleton width={80} height={14} />
        </Box>
      </Box>

      {/* Title */}
      <Skeleton width="60%" height={28} sx={{ mb: 1 }} />

      {/* Content preview */}
      <Skeleton width="100%" height={16} sx={{ mb: 0.5 }} />
      <Skeleton width="80%" height={16} sx={{ mb: 2 }} />

      {/* Tags */}
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <Skeleton variant="rounded" width={60} height={24} />
        <Skeleton variant="rounded" width={80} height={24} />
        <Skeleton variant="rounded" width={50} height={24} />
      </Box>

      {/* Footer: Stats */}
      <Box sx={{ display: "flex", gap: 3 }}>
        <Skeleton width={40} height={20} />
        <Skeleton width={40} height={20} />
        <Skeleton width={40} height={20} />
      </Box>
    </Box>
  );
};

export const PhotoCardSkeleton = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        position: "relative",
        aspectRatio: "1",
        bgcolor: isDark ? "grey.800" : "grey.200",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Skeleton
        variant="rectangular"
        width="100%"
        height="100%"
        sx={{ position: "absolute", top: 0, left: 0 }}
      />
    </Box>
  );
};

export const NotificationSkeleton = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        display: "flex",
        p: 2,
        bgcolor: isDark ? "background.paper" : "#fff",
        borderRadius: 2,
        boxShadow: 1,
        mb: 1,
      }}
    >
      <Skeleton variant="circular" width={48} height={48} sx={{ mr: 1.5 }} />
      <Box sx={{ flex: 1 }}>
        <Skeleton width="70%" height={20} sx={{ mb: 0.5 }} />
        <Skeleton width="40%" height={14} />
      </Box>
    </Box>
  );
};

export const ProfileSkeleton = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        p: 3,
        bgcolor: isDark ? "background.paper" : "#fff",
        borderRadius: 2,
        boxShadow: 1,
        textAlign: "center",
      }}
    >
      <Skeleton
        variant="circular"
        width={120}
        height={120}
        sx={{ mx: "auto", mb: 2 }}
      />
      <Skeleton width="50%" height={32} sx={{ mx: "auto", mb: 1 }} />
      <Skeleton width="30%" height={20} sx={{ mx: "auto", mb: 2 }} />
      <Skeleton width="100%" height={60} />
    </Box>
  );
};

export const CommentSkeleton = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        display: "flex",
        p: 2,
        bgcolor: isDark ? "background.paper" : "#fff",
        borderRadius: 2,
        boxShadow: 1,
        mb: 1,
      }}
    >
      <Skeleton variant="circular" width={40} height={40} sx={{ mr: 1.5 }} />
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Skeleton width={100} height={20} sx={{ mr: 1 }} />
          <Skeleton width={60} height={14} />
        </Box>
        <Skeleton width="100%" height={16} sx={{ mb: 0.5 }} />
        <Skeleton width="80%" height={16} />
      </Box>
    </Box>
  );
};

export default {
  PostCardSkeleton,
  PhotoCardSkeleton,
  NotificationSkeleton,
  ProfileSkeleton,
  CommentSkeleton,
};
