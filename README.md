Dynamic Learning Card Organizer (Angular)
🧠 Real-time Collaborative Concept Mapping Tool
This project is a single-page web application built with modern Angular and Firebase Firestore that allows multiple users to collaboratively create, organize, and visualize complex concepts in a shared canvas. It is designed to replace static flashcards with a dynamic, real-time concept map.

✨ Key Features & Technical Highlights
This application demonstrates mastery of modern front-end architecture, state management, and real-time cloud data persistence:

Modern Angular Architecture: Built as a single, self-contained Standalone Angular Component using the Signals pattern for highly efficient and reactive state management.

Real-time Collaboration: Uses Firebase Firestore's onSnapshot listeners to instantly synchronize card positions, content edits, and connections across all active users.

Semantic Data Modeling: Cards and Connections are modeled as separate entities. Connections include a label (Prerequisite, Example Of, etc.) to define complex semantic relationships.

Advanced Canvas Interaction:

Drag-and-Drop: Cards are drag-and-droppable, instantly updating their coordinates in the database.

Pan & Zoom: The canvas supports intuitive Pan (click-and-drag) and Zoom (Ctrl+Wheel) functionality, allowing users to navigate large concept maps efficiently.

Dynamic Visualizations: Connection lines are rendered using SVG and feature different stroke dash patterns based on the semantic relationship, providing clear visual hierarchy.

In-Place Editing: Users can edit the title, content, and color of their own cards via a dedicated sidebar panel, showcasing conditional rendering and persistent data updates.

🛠️ Technology Stack
Framework: Angular (Standalone Component, Signals, Native Control Flow)

Styling: Tailwind CSS (for rapid, responsive UI development)

Persistence: Firebase Firestore (Real-time database)

Visuals: Scalable Vector Graphics (SVG) and HTML Canvas for drawing lines and managing interactive elements.

Language: TypeScript

🚀 How to Use the Organizer
Authentication: The app automatically signs you in anonymously using a unique User ID, which is displayed in the sidebar.

Create a Card: Use the Add New Card section to enter a title and content. The card will appear on the canvas.

Drag & Organize: Click and drag any card to move it. The position is instantly saved and synchronized.

Edit Content: Click a card (if you are the owner) to open the Edit Card panel in the sidebar, where you can update its details and color.

Create Connections:

Click the first card you want to connect.

Click the second card.

Select the Relationship Type (e.g., Prerequisite For) from the dropdown.

Click Connect Selected Cards. A line representing the relationship will appear.

Navigate: Use the Zoom Controls (top right) or hold the mouse button down in the canvas to pan and explore large concept maps.

🗺️ Data Modeling (Firestore Collections)
The application manages two primary public collections for collaborative state:

Collection

Description

Data Fields

/artifacts/{appId}/public/data/cards

Stores the content, position, and metadata for each concept card.

id, title, content, x, y, color, ownerId

/artifacts/{appId}/public/data/connections

Stores the semantic links between cards.

id, cardAId, cardBId, label

