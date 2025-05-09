import React from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem
} from '@mui/material';

// A reusable component for selecting result limits across the application
const LimitSelector = ({ 
  value, 
  onChange, 
  options = [5, 10, 25, 50, 100],
  label = 'Results',
  id = 'limit-selector'
}) => {
  // Handle selection change
  const handleChange = (event) => {
    const newValue = parseInt(event.target.value, 10);
    onChange(newValue);
  };

  return (
    <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
      <InputLabel id={`${id}-label`}>{label}</InputLabel>
      <Select
        labelId={`${id}-label`}
        id={id}
        value={value}
        onChange={handleChange}
        label={label}
      >
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default LimitSelector;