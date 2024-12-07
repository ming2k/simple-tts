import React from 'react';

export function TextInput({ value, onChange, disabled }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder="Enter text to speak..."
      rows={4}
      className="text-input"
      disabled={disabled}
    />
  );
} 