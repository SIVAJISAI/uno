You are a senior full-stack software engineer.

Build a complete multiplayer UNO game application from scratch using the requirements below.

The application must be fully functional, modular, maintainable, and production-ready. Generate clean code, proper folder structure, reusable components, and clear separation of concerns.

--------------------------------------------------
PROJECT OVERVIEW
--------------------------------------------------

Build a real-time multiplayer UNO game.

Players should be able to:

1. Login using a username.
2. Create a game room.
3. Join an existing game room.
4. Wait in a lobby until enough players join.
5. Start the game (host only).
6. Receive cards automatically.
7. Play cards during their turn.
8. Draw cards from the deck.
9. View game progress in real time.
10. Win the game when their hand becomes empty.

Real-time synchronization must be implemented using WebSockets.

--------------------------------------------------
TECH STACK
--------------------------------------------------

Frontend:
- React
- HTML
- CSS

Backend:
- JavaScript
- Hono Server
- WebSockets

--------------------------------------------------
GAME RULES
--------------------------------------------------

For Version 1:

Only number cards exist.

Colors:
- Red
- Blue
- Green
- Yellow

No action cards:
- No Skip
- No Reverse
- No Draw Two
- No Wild Cards

Each card contains:
- color
- number

Examples:
- Red 3
- Blue 7
- Green 1
- Yellow 9

--------------------------------------------------
LOGIN FLOW
--------------------------------------------------

Requirements:

- Application must always open on Login Page.
- User enters username.
- User clicks Login button.
- Username validation required.
- After successful login:
  navigate to Lobby Selection Page.

Lobby Selection Page must provide:

1. Create Room
2. Join Room

--------------------------------------------------
CREATE ROOM
--------------------------------------------------

Requirements:

- Generate unique room ID.
- Creator becomes Host.
- Host becomes Player 1.
- Room must support:
  - Minimum 2 players
  - Maximum 6 players

Room Lobby should display:

- Room ID
- Host Username
- Player List
- Current Player Count
- Start Game Button

Start Game Button Rules:

- Disabled when player count < 2
- Enabled when player count >= 2
- Visible only to Host

When Host clicks Start Game:

- Initialize game state
- Distribute cards
- Navigate all players to Game Screen

--------------------------------------------------
JOIN ROOM
--------------------------------------------------

Requirements:

- User enters Room ID
- Validate Room ID
- Join existing room
- Reject invalid room IDs
- Reject joining full rooms

After successful join:

- Add player to room
- Show updated player list to everyone
- Synchronize lobby state through WebSocket

--------------------------------------------------
GAME INITIALIZATION
--------------------------------------------------

When game starts:

1. Create deck
2. Shuffle deck randomly
3. Distribute 7 cards to every player
4. Place one card face-up in discard pile
5. Determine first player
6. Set play direction clockwise

Backend must be responsible for:

- Deck generation
- Card shuffling
- Card distribution
- Turn management
- Rule validation
- Winner detection

Frontend must never be trusted for game rules.

--------------------------------------------------
GAME SCREEN
--------------------------------------------------

The game table must contain:

CENTER AREA

- Draw Deck
- Open Discard Card

PLAYER AREA

Players should appear around the table in a circular layout.

Requirements:

- Every player's position visible
- Current player's turn highlighted
- Player username visible
- Card count visible for every player

Card Visibility Rules:

Current User:
- Show actual cards

Other Players:
- Show card backs only
- Do not reveal card values

Direction Indicator:

- Display circular arrows
- Show current play direction

Game Status:

- Current Player
- Remaining Deck Count
- Room ID

--------------------------------------------------
TURN SYSTEM
--------------------------------------------------

Players must play strictly in order.

Only current player can perform actions.

Backend validates turn ownership.

If a player attempts action outside their turn:

- Reject action
- Send error response

After valid action:

- Advance turn to next player

--------------------------------------------------
PLAY CARD RULES
--------------------------------------------------

Player may play a card only if:

Card color matches open card color

OR

Card number matches open card number

Examples:

Open Card:
Red 5

Valid:
- Red 2
- Blue 5

Invalid:
- Green 7

When a valid card is played:

1. Remove card from player's hand
2. Update discard pile
3. Broadcast game state
4. Advance turn

--------------------------------------------------
DRAW CARD RULES
--------------------------------------------------

Current player may draw a card when:

1. No playable card exists

OR

2. Player voluntarily chooses not to play

When drawing:

1. Remove top card from deck
2. Add card to player's hand
3. Broadcast updated game state
4. End player's turn

--------------------------------------------------
GAME STATE MANAGEMENT
--------------------------------------------------

Backend must maintain authoritative state.

Game State should include:

Room
Players
Hands
Deck
Discard Pile
Current Turn
Direction
Game Status
Winner

All state updates must happen only on server.

Every change must be broadcast through WebSockets.

--------------------------------------------------
WIN CONDITION
--------------------------------------------------

Game ends immediately when:

Player hand size = 0

Actions:

1. Mark game completed
2. Store winner username
3. Broadcast winner event
4. Prevent further gameplay actions

--------------------------------------------------
WINNER SCREEN
--------------------------------------------------

When game ends:

Display:

- Winner Username
- Victory Message
- Celebration Animation
- Play Again Option (optional)

All connected players must see winner announcement.

--------------------------------------------------
WEBSOCKET EVENTS
--------------------------------------------------

Design WebSocket events for:

Client -> Server

- LOGIN
- CREATE_ROOM
- JOIN_ROOM
- START_GAME
- PLAY_CARD
- DRAW_CARD

Server -> Client

- ROOM_CREATED
- ROOM_UPDATED
- GAME_STARTED
- GAME_STATE_UPDATED
- INVALID_MOVE
- PLAYER_JOINED
- PLAYER_LEFT
- TURN_CHANGED
- GAME_FINISHED

--------------------------------------------------
ARCHITECTURE REQUIREMENTS
--------------------------------------------------

Backend Responsibilities:

- Room Management
- Player Management
- Deck Management
- Game State Management
- Rule Validation
- Turn Validation
- Winner Detection
- WebSocket Communication

Frontend Responsibilities:

- UI Rendering
- User Interactions
- State Display
- WebSocket Communication

--------------------------------------------------
CODE QUALITY REQUIREMENTS
--------------------------------------------------

Generate:

- Complete folder structure
- Reusable React components
- Clean CSS
- Modular backend services
- Type-safe data models where possible
- Utility functions
- Error handling
- Input validation
- Clear comments

Follow SOLID principles and clean architecture practices.

Implement the application end-to-end with all required files, components, server logic, WebSocket handlers, game engine logic, and UI screens.


--------------------------------------------------
GAME TABLE UI & PLAYER INTERACTION DESIGN
--------------------------------------------------

The Game Screen UI should follow a multiplayer card-table layout similar to a modern UNO game.

Reference Interaction Requirements:

- The game table should occupy the full screen.
- The table should have a visually appealing board/game-table background.
- Players should be positioned around the table in a circular arrangement.
- The current logged-in player should always be displayed at the bottom center of the screen.
- Other players should automatically be positioned around the table based on player count.

Player Placement Examples:

2 Players:
- Self at bottom
- Opponent at top

3 Players:
- Self at bottom
- One player at top-left
- One player at top-right

4 Players:
- Self at bottom
- One player left
- One player top
- One player right

5-6 Players:
- Evenly distribute remaining players around the table circumference.

--------------------------------------------------
PLAYER DISPLAY
--------------------------------------------------

For every player display:

- Username
- Number of cards currently in hand
- Turn indicator

Do NOT display:

- Profile pictures
- Avatars
- Timers
- Countdown indicators
- Settings button

Current Player Highlight:

- The active player's area should be visually highlighted.
- The active player should have a glowing border, ring, outline, or animation.
- All users should clearly identify whose turn it is.

--------------------------------------------------
PLAYER HAND VISIBILITY
--------------------------------------------------

Current User:

- Show all card faces.
- Cards should be visible at the bottom center.
- Cards should be arranged in a fan layout.
- Cards should slightly overlap each other.
- Cards should be selectable with mouse click.
- Hovering a card should raise it slightly.
- Selected card should visually lift above other cards.

Other Players:

- Show card backs only.
- Never reveal actual card values.
- Show card count near each player.
- Arrange card backs in a small fan layout facing the center of the table.

--------------------------------------------------
CENTER TABLE AREA
--------------------------------------------------

The center of the table must contain:

1. Draw Deck
2. Open Discard Pile

Draw Deck:

- Visible at all times.
- Shows stacked card-back design.
- Clickable only during current player's turn.
- Clicking deck performs DRAW_CARD action.
- Disabled for non-current players.

Discard Pile:

- Display top-most played card.
- Visible to all players.
- Updates instantly after every valid move.

--------------------------------------------------
GAME FLOW INDICATOR
--------------------------------------------------

Display a circular direction indicator around the center area.

Requirements:

- Use circular arrows to represent play direction.
- Initially clockwise.
- Visually indicate player turn progression.
- Direction indicator remains visible throughout the game.

Since Version 1 does not contain Reverse cards:

- Direction always remains clockwise.

--------------------------------------------------
GAME STATUS PANEL
--------------------------------------------------

Display game information clearly:

- Room ID
- Current Player Username
- Remaining Deck Count
- Total Players
- Game Status

The status panel should update in real time through WebSocket events.

--------------------------------------------------
CARD INTERACTION
--------------------------------------------------

Current player may interact with cards only during their turn.

Playable Cards:

- Highlight valid playable cards.
- Allow clicking playable cards.
- Invalid cards should appear disabled or less emphasized.

When a valid card is clicked:

1. Send PLAY_CARD event
2. Disable repeated clicks until server response
3. Wait for server validation
4. Update UI after server broadcast

--------------------------------------------------
DRAW CARD INTERACTION
--------------------------------------------------

When player chooses to draw:

- Click draw deck
- Send DRAW_CARD event
- Wait for server response
- Newly drawn card should appear in player's hand
- Turn should automatically end after successful draw

--------------------------------------------------
REAL-TIME UPDATES
--------------------------------------------------

All players should instantly see:

- Cards played
- Cards drawn
- Turn changes
- Player joins
- Player leaves
- Winner announcement

All updates must come from WebSocket broadcasts.

Frontend must never locally manipulate game state without server confirmation.

--------------------------------------------------
WINNER CELEBRATION
--------------------------------------------------

When a player wins:

- Show winner overlay/modal
- Display winner username prominently
- Show celebration animation/confetti
- Disable all game interactions
- Display victory message to all connected players

No timers should exist anywhere in the application.

No profile pictures should exist anywhere in the application.

No settings button should exist anywhere in the application.