import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders initial state', () => {
  render(<App />);
  const headingElement = screen.getByText(/Analyze Any GitHub Repository/i);
  expect(headingElement).toBeInTheDocument();
});
