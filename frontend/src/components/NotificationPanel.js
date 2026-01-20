import {
  Badge,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Button,
  Divider,
  useTheme,
  Tooltip,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  CheckCircleOutline,
  Delete,
  Circle,
} from "@mui/icons-material";
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../slices/notificationsSlice";
import { NotificationSkeleton } from "./Skeleton";

const NotificationPanel = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const { notifications, unreadCount, loading, pagination } = useSelector(
    (state) => state.notifications,
  );
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchUnreadCount());
      // Set up polling for new notifications every 30 seconds
      const interval = setInterval(() => {
        dispatch(fetchUnreadCount());
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, dispatch]);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    if (isAuthenticated) {
      dispatch(fetchNotifications({ page: 1, unreadOnly: false }));
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await dispatch(markAsRead(notification._id));
    }
    if (notification.post) {
      navigate(`/posts/${notification.post._id || notification.post}`);
    }
    handleClose();
  };

  const handleMarkAllRead = () => {
    dispatch(markAllAsRead());
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "like":
        return "❤️";
      case "comment":
        return "💬";
      case "reply":
        return "↩️";
      case "follow":
        return "👤";
      case "mention":
        return "@";
      default:
        return "🔔";
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton color="inherit" onClick={handleOpen} sx={{ ml: 1 }}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 500,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<CheckCircleOutline />}
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          )}
        </Box>

        {/* Notification List */}
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {!isAuthenticated ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography color="text.secondary">
                Please login to view notifications
              </Typography>
            </Box>
          ) : loading && notifications.length === 0 ? (
            Array.from({ length: 3 }).map((_, index) => (
              <NotificationSkeleton key={index} />
            ))
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.slice(0, 10).map((notification, index) => (
                <React.Fragment key={notification._id}>
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      cursor: "pointer",
                      bgcolor: notification.read
                        ? "transparent"
                        : theme.palette.action.hover,
                      "&:hover": {
                        bgcolor: theme.palette.action.selected,
                      },
                    }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={
                          notification.fromUser?.profile?.avatar ||
                          notification.fromUser?.avatar
                        }
                        sx={{ width: 40, height: 40 }}
                      >
                        {notification.fromUser?.username?.[0]?.toUpperCase() ||
                          getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          {!notification.read && (
                            <Circle
                              sx={{
                                fontSize: 10,
                                color: theme.palette.primary.main,
                              }}
                            />
                          )}
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: notification.read ? 400 : 600,
                            }}
                          >
                            <Box component="span" sx={{ fontWeight: 600 }}>
                              {notification.fromUser?.username || "Someone"}
                            </Box>{" "}
                            {notification.message}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(notification.createdAt)}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && (
                    <Divider component="li" />
                  )}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box
            sx={{
              p: 1,
              borderTop: 1,
              borderColor: "divider",
              textAlign: "center",
            }}
          >
            <Button
              size="small"
              onClick={() => {
                navigate("/notifications");
                handleClose();
              }}
            >
              View All Notifications
            </Button>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationPanel;
