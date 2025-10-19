🧠 Concept Canvas: Collaborative Map Builder

Concept Canvas is a real-time, collaborative web application built with Angular Signals and Firebase Firestore that allows users to visually organize concepts, ideas, and learning topics as movable cards and define relationships between them. It’s perfect for brainstorming, curriculum planning, or visualizing dependencies.

✨ Key Features

Real-time Collaboration: All card data and connections are stored in Firestore and updated in real-time for all active users, making it a truly shared workspace.

Concept Card Management (CRUD): Easily create, edit, move, and delete colorful learning cards.

Owner-Based Editing: Cards can only be edited or deleted by the user who created them (the owner), ensuring content integrity in a public space.

Drag-and-Drop Interface: Cards use responsive drag-and-drop functionality with a grid snapping feature for clean visual organization.

Relational Mapping: Connect two selected cards to define their relationship (e.g., "Prerequisite For," "Example Of").

Angular Signals: Leverages Angular's modern reactivity system (Signals) for highly efficient state management and instantaneous UI updates.

🛠️ Technology Stack

This application is built as an Angular Standalone Component, utilizing modern web and Google Cloud technologies:

Frontend Framework: Angular (Standalone Component)

Language: TypeScript

State Management: Angular Signals (signal, computed, effect)

Styling: Tailwind CSS for a responsive, utility-first design.

Database: Firebase Firestore (Real-time, persistent, public data storage).

Authentication: Firebase Authentication (Handles custom token sign-in to securely generate unique User IDs for tracking ownership).

👩‍💻 How to Use

Canvas Interaction

Create a Card: Use the Add New Card panel on the left sidebar to enter a title, content summary, and select a color, then click Create Card.

Move a Card: Click and hold any card to drag it to a new position on the canvas. Positions are saved automatically.

Edit a Card: If you are the card's creator/owner, click the card once to open the Edit Card panel in the sidebar. Make your changes and click Save Changes.

Connect Cards:

Click the first card you want to link.

Click the second card you want to link.

Select the Relationship Type (e.g., "Prerequisite For").

Click Connect Selected Cards. A line will appear between the two concepts.

Delete a Connection: Click directly on the connection line to instantly delete the mapped relationship.

Data Security & Access

This application is configured to save all map data (cards and connections) to a public Firestore collection under your Canvas application ID (/artifacts/{appId}/public/data/). This allows multiple users to collaborate simultaneously and see the same data in real-time. User identity is managed using the provided __initial_auth_token for secure authentication and ownership tracking.
