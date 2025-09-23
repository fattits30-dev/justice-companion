import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInterface from '../EnhancedChatInterface';

// CSS imports handled by moduleNameMapper in jest.config.js

describe('ChatInterface', () => {
  const mockSetMessages = jest.fn();
  const mockOnFactFound = jest.fn();

  const defaultProps = {
    currentCase: null,
    messages: [],
    setMessages: mockSetMessages,
    onFactFound: mockOnFactFound
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset AI mock
    window.justiceAPI.aiChat.mockResolvedValue(createMockAIResponse());
  });

  describe('Initial Rendering', () => {
    test('renders welcome message on mount', async () => {
      const TestWrapper = () => {
        const [messages, setMessages] = React.useState([]);
        return <ChatInterface {...defaultProps} messages={messages} setMessages={setMessages} />;
      };

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Welcome to Justice Companion/)).toBeInTheDocument();
      });
      expect(screen.getByText(/I'm here to help you understand your legal situation/)).toBeInTheDocument();
    });

    test('renders chat input and send button', () => {
      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByPlaceholderText(/Message Legal Assistant/)).toBeInTheDocument();
      expect(screen.getByTestId('send-button')).toBeInTheDocument();
    });

    test('focuses input on mount', () => {
      render(<ChatInterface {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message Legal Assistant/);
      expect(input).toHaveFocus();
    });
  });

  describe('Form Validation', () => {
    test('shows error for empty input', async () => {
      const user = userEvent.setup();
      const TestWrapper = () => {
        const [messages, setMessages] = React.useState([]);
        return <ChatInterface {...defaultProps} messages={messages} setMessages={setMessages} />;
      };
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText(/Message Legal Assistant/);
      const sendButton = screen.getByTestId('send-button');

      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/Please describe your legal situation to get started/)).toBeInTheDocument();
      });
    });

    test('shows error for input too short', async () => {
      const user = userEvent.setup();
      const TestWrapper = () => {
        const [messages, setMessages] = React.useState([]);
        return <ChatInterface {...defaultProps} messages={messages} setMessages={setMessages} />;
      };
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText(/Message Legal Assistant/);

      await user.type(input, 'help');
      await user.click(screen.getByTestId('send-button'));

      await waitFor(() => {
        expect(screen.getByText(/Please provide more details about your situation/)).toBeInTheDocument();
      });
    });

    test('accepts valid input length', async () => {
      const user = userEvent.setup();
      const TestWrapper = () => {
        const [messages, setMessages] = React.useState([]);
        return <ChatInterface {...defaultProps} messages={messages} setMessages={setMessages} />;
      };
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText(/Message Legal Assistant/);
      const validMessage = 'I need help with my landlord about deposit protection';

      await user.type(input, validMessage);
      await user.click(screen.getByTestId('send-button'));

      // Wait for form processing
      await waitFor(() => {
        expect(window.justiceAPI.aiChat).toHaveBeenCalled();
      });

      expect(screen.queryByText(/Please provide more details about your situation/)).not.toBeInTheDocument();
    });
  });

  describe('AI Chat Integration', () => {
    test('sends message to AI service', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message Legal Assistant/);
      const message = 'I need help with landlord deposit protection';

      await user.type(input, message);
      await user.click(screen.getByTestId('send-button'));

      await waitFor(() => {
        expect(window.justiceAPI.aiChat).toHaveBeenCalledWith(
          message,
          expect.any(String), // sessionId
          expect.objectContaining({
            temperature: 0.3,
            max_tokens: 2048
          })
        );
      });
    });

    test('displays AI response in chat', async () => {
      const user = userEvent.setup();
      const mockResponse = createMockAIResponse('This is legal information about deposit protection...');
      window.justiceAPI.aiChat.mockResolvedValue(mockResponse);

      render(<ChatInterface {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message Legal Assistant/);
      await user.type(input, 'Help with deposit protection');
      await user.click(screen.getByTestId('send-button'));

      await waitFor(() => {
        expect(mockSetMessages).toHaveBeenCalledWith(expect.any(Function));
      });
    });

    test('handles AI service errors gracefully', async () => {
      const user = userEvent.setup();
      window.justiceAPI.aiChat.mockRejectedValue(new Error('Service unavailable'));

      render(<ChatInterface {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message Legal Assistant/);
      await user.type(input, 'Help with legal issue');
      await user.click(screen.getByTestId('send-button'));

      await waitFor(() => {
        expect(mockSetMessages).toHaveBeenCalledWith(expect.any(Function));
      });
    });
  });

  describe('Fact Extraction', () => {
    test('extracts monetary amounts from input', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message Legal Assistant/);
      await user.type(input, 'My landlord is asking for £500 deposit but it is not protected');
      await user.click(screen.getByTestId('send-button'));

      await waitFor(() => {
        expect(mockOnFactFound).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'money',
            value: '£500'
          })
        );
      });
    });

    test('extracts dates from input', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message Legal Assistant/);
      await user.type(input, 'I received notice on 15/09/2024 to leave the property');
      await user.click(screen.getByTestId('send-button'));

      await waitFor(() => {
        expect(mockOnFactFound).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'date',
            value: '15/09/2024'
          })
        );
      });
    });
  });

  describe('Keyboard Interactions', () => {
    test('submits form on Enter key', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message Legal Assistant/);
      await user.type(input, 'I need help with tenancy rights');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(window.justiceAPI.aiChat).toHaveBeenCalled();
      });
    });

    test('creates new line on Shift+Enter', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message Legal Assistant/);
      await user.type(input, 'First line');
      await user.keyboard('{Shift>}{Enter}{/Shift}Second line');

      expect(input.value).toBe('First line\nSecond line');
    });
  });

  describe('Loading States', () => {
    test('disables input during AI processing', async () => {
      const user = userEvent.setup();
      // Make AI call hang to test loading state
      window.justiceAPI.aiChat.mockImplementation(() => new Promise(() => {}));

      const TestWrapper = () => {
        const [messages, setMessages] = React.useState([]);
        return <ChatInterface {...defaultProps} messages={messages} setMessages={setMessages} />;
      };
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText(/Message Legal Assistant/);
      await user.type(input, 'Test message for loading state');
      await user.click(screen.getByTestId('send-button'));

      expect(input).toBeDisabled();
      expect(screen.getByText(/📤 Processing/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<ChatInterface {...defaultProps} />);

      const input = screen.getByLabelText(/Describe your legal situation/);
      expect(input).toBeInTheDocument();

      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).toBeInTheDocument();
    });

    test('announces form validation errors to screen readers', async () => {
      const user = userEvent.setup();
      const TestWrapper = () => {
        const [messages, setMessages] = React.useState([]);
        return <ChatInterface {...defaultProps} messages={messages} setMessages={setMessages} />;
      };
      render(<TestWrapper />);

      const sendButton = screen.getByTestId('send-button');
      await user.click(sendButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/Please describe your legal situation to get started/);
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });
});