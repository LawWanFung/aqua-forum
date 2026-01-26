import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  FormHelperText,
} from "@mui/material";
import { fetchBoards } from "../slices/postsSlice";

const BoardSelector = ({
  selectedBoards,
  onChange,
  error,
  helperText,
  multiple = true,
}) => {
  const dispatch = useDispatch();
  const { boards } = useSelector((state) => state.posts);
  const [isLoaded, setIsLoaded] = useState(false);

  React.useEffect(() => {
    if (!isLoaded && boards.length === 0) {
      dispatch(fetchBoards()).then(() => setIsLoaded(true));
    }
  }, [dispatch, isLoaded, boards.length]);

  const handleChange = (event) => {
    const value = event.target.value;
    onChange(value);
  };

  const handleDelete = (boardId) => {
    const newBoards = selectedBoards.filter((id) => id !== boardId);
    onChange(newBoards);
  };

  return (
    <FormControl fullWidth error={error} sx={{ mb: 2 }}>
      <InputLabel id="board-select-label">選擇看板</InputLabel>
      <Select
        labelId="board-select-label"
        multiple={multiple}
        value={selectedBoards}
        onChange={handleChange}
        label="選擇看板"
        renderValue={(selected) => (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {selected.map((boardId) => {
              const board = boards.find((b) => b._id === boardId);
              return board ? (
                <Chip
                  key={boardId}
                  label={`${board.icon} ${board.name}`}
                  onDelete={() => handleDelete(boardId)}
                  sx={{
                    backgroundColor: board.color + "20",
                    borderColor: board.color,
                    border: "1px solid",
                  }}
                />
              ) : null;
            })}
          </Box>
        )}
      >
        {boards.map((board) => (
          <MenuItem key={board._id} value={board._id}>
            <span style={{ marginRight: 8 }}>{board.icon}</span>
            {board.name}
            {board.postCount !== undefined && (
              <span
                style={{
                  marginLeft: "auto",
                  color: "text.secondary",
                  fontSize: 12,
                }}
              >
                ({board.postCount})
              </span>
            )}
          </MenuItem>
        ))}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export default BoardSelector;
