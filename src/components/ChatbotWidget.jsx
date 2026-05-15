import React, { useMemo, useState } from 'react';

const MAIN_MENU_TEXT = [
  'Hello 👋 Welcome to our Donation Platform.',
  'How can I help you today?',
  '',
  '1. How to Donate?',
  '2. Need Help?',
  '3. Track Donation',
  '4. Become Volunteer',
  '5. Donation Safety',
  '6. Contact Support',
].join('\n');

const MAIN_OPTIONS = [
  { id: 'how_to_donate', label: '1. How to Donate?' },
  { id: 'need_help', label: '2. Need Help?' },
  { id: 'track_donation', label: '3. Track Donation' },
  { id: 'become_volunteer', label: '4. Become Volunteer' },
  { id: 'donation_safety', label: '5. Donation Safety' },
  { id: 'contact_support', label: '6. Contact Support' },
];

function createBotMessage(text, options = [], inputType = null) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender: 'bot',
    text,
    options,
    inputType,
  };
}

function createUserMessage(text) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sender: 'user',
    text,
    options: [],
    inputType: null,
  };
}

export default function ChatbotWidget() {
  const initialMessages = useMemo(
    () => [createBotMessage(MAIN_MENU_TEXT, MAIN_OPTIONS)],
    []
  );

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [donationId, setDonationId] = useState('');

  function resetToMainMenu() {
    setMessages((prev) => [
      ...prev,
      createBotMessage(MAIN_MENU_TEXT, MAIN_OPTIONS),
    ]);
  }

  function handleChoice(choiceId, choiceLabel) {
    setMessages((prev) => [...prev, createUserMessage(choiceLabel)]);

    if (choiceId === 'back_main') {
      resetToMainMenu();
      return;
    }

    if (choiceId === 'how_to_donate') {
      setMessages((prev) => [
        ...prev,
        createBotMessage(
          'You can donate food, clothes, books, money, or other useful items.',
          [
            { id: 'donate_food', label: '1. Donate Food' },
            { id: 'donate_clothes', label: '2. Donate Clothes' },
            { id: 'donate_money', label: '3. Donate Money' },
            { id: 'back_main', label: '4. Back to Main Menu' },
          ]
        ),
      ]);
      return;
    }

    if (choiceId === 'donate_food') {
      setMessages((prev) => [
        ...prev,
        createBotMessage(
          'Please fill donation form with food type, quantity, and pickup location.',
          [{ id: 'back_main', label: 'Back to Main Menu' }]
        ),
      ]);
      return;
    }

    if (choiceId === 'donate_clothes') {
      setMessages((prev) => [
        ...prev,
        createBotMessage(
          'Please ensure clothes are clean and usable.',
          [{ id: 'back_main', label: 'Back to Main Menu' }]
        ),
      ]);
      return;
    }

    if (choiceId === 'donate_money') {
      setMessages((prev) => [
        ...prev,
        createBotMessage(
          'You can donate securely using UPI / Card / Net Banking.',
          [{ id: 'back_main', label: 'Back to Main Menu' }]
        ),
      ]);
      return;
    }

    if (choiceId === 'need_help') {
      setMessages((prev) => [
        ...prev,
        createBotMessage('Please choose your issue:', [
          { id: 'login_problem', label: '1. Login Problem' },
          { id: 'payment_failed', label: '2. Payment Failed' },
          { id: 'form_not_working', label: '3. Form Not Working' },
          { id: 'back_main', label: '4. Back' },
        ]),
      ]);
      return;
    }

    if (choiceId === 'login_problem') {
      setMessages((prev) => [
        ...prev,
        createBotMessage(
          'Try resetting password or contact admin.',
          [{ id: 'back_main', label: 'Back to Main Menu' }]
        ),
      ]);
      return;
    }

    if (choiceId === 'payment_failed') {
      setMessages((prev) => [
        ...prev,
        createBotMessage(
          'Check internet connection or try again after some time.',
          [{ id: 'back_main', label: 'Back to Main Menu' }]
        ),
      ]);
      return;
    }

    if (choiceId === 'form_not_working') {
      setMessages((prev) => [
        ...prev,
        createBotMessage(
          'Please refresh the page and submit again. If issue continues, contact support.',
          [{ id: 'back_main', label: 'Back to Main Menu' }]
        ),
      ]);
      return;
    }

    if (choiceId === 'track_donation') {
      setMessages((prev) => [
        ...prev,
        createBotMessage('Please enter Donation ID.', [], 'donationId'),
      ]);
      return;
    }

    if (choiceId === 'become_volunteer') {
      setMessages((prev) => [
        ...prev,
        createBotMessage(
          'Great 👍 Please register as volunteer by filling volunteer form.',
          [
            { id: 'vol_event', label: '1. Event Volunteer' },
            { id: 'vol_pickup', label: '2. Pickup Volunteer' },
            { id: 'vol_awareness', label: '3. Awareness Campaign' },
            { id: 'back_main', label: 'Back to Main Menu' },
          ]
        ),
      ]);
      return;
    }

    if (choiceId === 'vol_event' || choiceId === 'vol_pickup' || choiceId === 'vol_awareness') {
      setMessages((prev) => [
        ...prev,
        createBotMessage(
          'Awesome! Please complete volunteer registration and select your preferred role in the form.',
          [{ id: 'back_main', label: 'Back to Main Menu' }]
        ),
      ]);
      return;
    }

    if (choiceId === 'donation_safety') {
      setMessages((prev) => [
        ...prev,
        createBotMessage(
          'We verify all requests and donations for safety and transparency.',
          [
            { id: 'safety_payment', label: '1. Is payment secure?' },
            { id: 'safety_delivery', label: '2. How items are delivered?' },
            { id: 'safety_anonymous', label: '3. Can I stay anonymous?' },
            { id: 'back_main', label: 'Back to Main Menu' },
          ]
        ),
      ]);
      return;
    }

    if (choiceId === 'safety_payment') {
      setMessages((prev) => [
        ...prev,
        createBotMessage(
          'Yes, payment is secured with trusted gateways and encrypted processing.',
          [{ id: 'back_main', label: 'Back to Main Menu' }]
        ),
      ]);
      return;
    }

    if (choiceId === 'safety_delivery') {
      setMessages((prev) => [
        ...prev,
        createBotMessage(
          'Items are picked up and delivered through verified NGO and volunteer networks.',
          [{ id: 'back_main', label: 'Back to Main Menu' }]
        ),
      ]);
      return;
    }

    if (choiceId === 'safety_anonymous') {
      setMessages((prev) => [
        ...prev,
        createBotMessage(
          'Yes, you can request anonymous donation in supported donation flows.',
          [{ id: 'back_main', label: 'Back to Main Menu' }]
        ),
      ]);
      return;
    }

    if (choiceId === 'contact_support') {
      setMessages((prev) => [
        ...prev,
        createBotMessage(
          '📧 Email: support@donatehelp.com\n\n📞 Phone: +91 XXXXX XXXXX',
          [{ id: 'back_main', label: 'Back to Main Menu' }]
        ),
      ]);
    }
  }

  function submitDonationId(event) {
    event.preventDefault();
    const trimmed = donationId.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      createUserMessage(trimmed),
      createBotMessage(
        'Your donation is under processing and will be picked soon.',
        [{ id: 'back_main', label: 'Back to Main Menu' }]
      ),
    ]);
    setDonationId('');
  }

  const activeInputType = messages[messages.length - 1]?.inputType;

  return (
    <div className="chatbot-widget">
      {isOpen ? (
        <div className="chatbot-panel" role="dialog" aria-label="Donation support chatbot">
          <div className="chatbot-header">
            <strong>Support Bot</strong>
            <button
              type="button"
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
            >
              ✕
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message ${message.sender === 'user' ? 'chat-message-user' : 'chat-message-bot'}`}
              >
                <p>{message.text}</p>
                {message.options?.length > 0 && (
                  <div className="chatbot-options">
                    {message.options.map((option) => (
                      <button
                        type="button"
                        key={`${message.id}-${option.id}`}
                        onClick={() => handleChoice(option.id, option.label)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {activeInputType === 'donationId' && (
            <form className="chatbot-input-row" onSubmit={submitDonationId}>
              <input
                type="text"
                value={donationId}
                onChange={(event) => setDonationId(event.target.value)}
                placeholder="Enter Donation ID"
                aria-label="Donation ID"
              />
              <button type="submit">Send</button>
            </form>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="chatbot-fab"
          onClick={() => setIsOpen(true)}
          aria-label="Open support chatbot"
        >
          💬 Help
        </button>
      )}
    </div>
  );
}
