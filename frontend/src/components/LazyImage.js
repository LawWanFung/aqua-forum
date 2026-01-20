import { Box, useTheme } from "@mui/material";
import React, { useState, useEffect } from "react";

const LazyImage = ({
  src,
  alt,
  sx,
  placeholderColor = "grey.300",
  objectFit = "cover",
  aspectRatio,
  onClick,
}) => {
  const theme = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = React.useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "100px",
        threshold: 0.1,
      },
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
    setIsLoaded(true);
  };

  return (
    <Box
      ref={imgRef}
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: aspectRatio ? 0 : 200,
        bgcolor: placeholderColor,
        overflow: "hidden",
        borderRadius: 1,
        ...(aspectRatio && {
          aspectRatio: aspectRatio,
        }),
        ...sx,
      }}
      onClick={onClick}
    >
      {/* Placeholder skeleton */}
      {!isLoaded && !error && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: `linear-gradient(90deg, ${placeholderColor} 0%, ${theme.palette.grey[400]} 50%, ${placeholderColor} 100%)`,
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            "@keyframes shimmer": {
              "0%": {
                backgroundPosition: "200% 0",
              },
              "100%": {
                backgroundPosition: "-200% 0",
              },
            },
          }}
        />
      )}

      {/* Error placeholder */}
      {error && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: theme.palette.grey[200],
            color: theme.palette.grey[500],
          }}
        >
          <Box
            sx={{
              fontSize: "2rem",
              opacity: 0.5,
            }}
          >
            🖼️
          </Box>
        </Box>
      )}

      {/* Actual image */}
      {isInView && !error && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: "100%",
            height: "100%",
            objectFit: objectFit,
            opacity: isLoaded ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
          }}
        />
      )}
    </Box>
  );
};

export default LazyImage;
