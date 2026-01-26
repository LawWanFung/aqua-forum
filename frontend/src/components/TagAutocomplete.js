import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  TextField,
  Chip,
  Box,
  List,
  ListItem,
  ListItemButton,
  Paper,
  Typography,
} from "@mui/material";
import { searchTags, clearTagSuggestions } from "../slices/postsSlice";

const TagAutocomplete = ({
  value,
  onChange,
  error,
  helperText,
  placeholder = "輸入標籤...",
}) => {
  const dispatch = useDispatch();
  const { tagSuggestions } = useSelector((state) => state.posts);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Search tags when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 1) {
      dispatch(searchTags({ query: debouncedQuery, limit: 10 }));
      setIsOpen(true);
    } else {
      dispatch(clearTagSuggestions());
      setIsOpen(false);
    }
  }, [debouncedQuery, dispatch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSelectTag = (tagName) => {
    if (!value.includes(tagName)) {
      onChange([...value, tagName]);
    }
    setInputValue("");
    setIsOpen(false);
  };

  const handleRemoveTag = (tagToRemove) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      handleRemoveTag(value[value.length - 1]);
    }
  };

  return (
    <Box ref={containerRef} sx={{ position: "relative", mb: 2 }}>
      <TextField
        fullWidth
        label="標籤"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (tagSuggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        error={error}
        helperText={helperText || "輸入後按 Enter 新增標籤，或從建議中選擇"}
        placeholder={placeholder}
        ref={inputRef}
      />

      {/* Selected tags */}
      {value.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
          {value.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              onDelete={() => handleRemoveTag(tag)}
              size="small"
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>
      )}

      {/* Autocomplete dropdown */}
      {isOpen && tagSuggestions.length > 0 && (
        <Paper
          sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: 200,
            overflow: "auto",
            mt: 0.5,
          }}
        >
          <List dense>
            {tagSuggestions.map((tag) => (
              <ListItem key={tag.name} disablePadding>
                <ListItemButton
                  onClick={() => handleSelectTag(tag.name)}
                  disabled={value.includes(tag.name)}
                >
                  <Typography variant="body2">
                    {tag.name}
                    {tag.usageCount > 0 && (
                      <Typography
                        component="span"
                        sx={{ color: "text.secondary", ml: 1, fontSize: 12 }}
                      >
                        ({tag.usageCount}次使用)
                      </Typography>
                    )}
                  </Typography>
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default TagAutocomplete;
