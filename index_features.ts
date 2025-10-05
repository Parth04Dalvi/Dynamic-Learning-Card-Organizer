import { Component, signal, computed, effect } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// --- Interfaces and Data Modeling ---

/** Defines the structure for a single learning card. */
interface LearningCard {
  id: string;
  title: string;
  content: string;
  // Normalized position on a 1000x1000 grid
  x: number; 
  y: number;
  color: string;
  ownerId: string; // To track who created the card
}

/** Defines the structure for a connection between two cards. */
interface CardConnection {
  id: string;
  cardAId: string;
  cardBId: string;
  label: string; // e.g., "Prerequisite", "Example Of"
}

// --- Component Definition ---

@Component({
  selector: 'app-root',
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      
      <!-- Sidebar / Controls -->
      <aside class="w-full lg:w-80 bg-white p-6 shadow-xl border-r border-gray-200 flex-shrink-0">
        <h1 class="text-2xl font-bold text-indigo-600 mb-6">Concept Canvas</h1>
        
        <!-- User/Auth Status -->
        <div class="mb-6 p-3 bg-indigo-50 rounded-lg text-sm">
          <p class="font-semibold text-indigo-700">User ID:</p>
          <p class="text-xs break-words text-indigo-900 mt-1">{{ userId() || 'Connecting...' }}</p>
          @if (!isAuthReady()) {
            <p class="text-xs mt-2 text-red-500">Connecting to Firebase...</p>
          }
        </div>

        <!-- Card Creation -->
        @if (!editingCard()) {
          <div class="space-y-4 mb-8">
            <h2 class="text-lg font-semibold text-gray-800 border-b pb-2">Add New Card</h2>
            
            <label class="block">
              <span class="text-gray-700 text-sm">Card Title</span>
              <input #newTitle type="text" placeholder="Topic name" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
            </label>
            
            <label class="block">
              <span class="text-gray-700 text-sm">Content Summary</span>
              <textarea #newContent placeholder="Brief description or key points" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"></textarea>
            </label>

            <label class="block">
              <span class="text-gray-700 text-sm">Card Color</span>
              <input #newColor type="color" value="#a5b4fc" class="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm">
            </label>
            
            <button 
              (click)="addCard(newTitle.value, newContent.value, newColor.value); newTitle.value=''; newContent.value='';"
              [attr.disabled]="!isAuthReady() ? true : null"
              class="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 disabled:opacity-50"
            >
              Create Card
            </button>
          </div>
        }

        <!-- Card Editing Panel (NEW) -->
        @if (editingCard(); as card) {
          <div class="space-y-4 mb-8 p-4 border border-indigo-300 rounded-xl bg-indigo-50">
            <h2 class="text-xl font-bold text-indigo-800 border-b pb-2">Edit Card: {{ card.title }}</h2>
            
            <label class="block">
              <span class="text-gray-700 text-sm">Title</span>
              <input 
                type="text" 
                [value]="card.title" 
                (input)="updateEditingCard('title', $event.target.value)"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              >
            </label>
            
            <label class="block">
              <span class="text-gray-700 text-sm">Content</span>
              <textarea 
                rows="3" 
                [value]="card.content" 
                (input)="updateEditingCard('content', $event.target.value)"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              ></textarea>
            </label>

            <label class="block">
              <span class="text-gray-700 text-sm">Color</span>
              <input 
                type="color" 
                [value]="card.color" 
                (input)="updateEditingCard('color', $event.target.value)"
                class="mt-1 block w-full h-10 rounded-md border-gray-300 shadow-sm">
            </label>
            
            <button 
              (click)="saveCardEdit()"
              class="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-150"
            >
              Save Changes
            </button>

            <button 
              (click)="cancelCardEdit()"
              class="w-full py-2 px-4 bg-gray-400 text-white font-semibold rounded-lg shadow-md hover:bg-gray-500 transition duration-150 mt-2"
            >
              Cancel
            </button>
          </div>
        }

        <!-- Connection Management -->
        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-gray-800 border-b pb-2">Connections</h2>
          <p class="text-sm text-gray-500">
            Click two cards to select them, then click connect below.
          </p>
          
          <div class="flex flex-col space-y-2 text-sm">
            <div class="p-2 border rounded-md" [class]="selectedCardIds().length > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'">
              Selected: {{ selectedCardIds().length }} / 2
            </div>
            
            <!-- Connection Label Selector (NEW) -->
            <label class="block">
                <span class="text-gray-700 text-sm">Relationship Type</span>
                <select #connectionLabel class="block w-full rounded-md border-gray-300 shadow-sm p-2 border mt-1">
                  <option value="Related To">Related To</option>
                  <option value="Prerequisite">Prerequisite For</option>
                  <option value="Example Of">Example Of</option>
                  <option value="Contradicts">Contradicts</option>
                </select>
            </label>

            <button 
              (click)="createConnection(connectionLabel.value);"
              [attr.disabled]="selectedCardIds().length !== 2 || !isAuthReady() ? true : null"
              class="w-full py-2 px-4 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition duration-150 disabled:opacity-50"
            >
              Connect Selected Cards
            </button>
            <button 
              (click)="clearConnections()"
              [attr.disabled]="selectedCardIds().length === 0 ? true : null"
              class="w-full py-2 px-4 bg-gray-400 text-white font-semibold rounded-lg shadow-md hover:bg-gray-500 transition duration-150 disabled:opacity-50"
            >
              Clear Selection
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Canvas Area -->
      <main class="flex-grow relative overflow-hidden bg-gray-100">
        <!-- SVG Canvas for Lines -->
        <svg [attr.width]="canvasWidth()" [attr.height]="canvasHeight()" 
             class="absolute top-0 left-0 pointer-events-none z-10">
          
          <!-- Grid Lines (Background) -->
          <defs>
            <pattern id="grid" [attr.width]="gridSize" [attr.height]="gridSize" patternUnits="userSpaceOnUse">
              <path [attr.d]="'M ' + gridSize + ' 0 L 0 0 0 ' + gridSize" fill="none" stroke="#e0e7ff" stroke-width="1"/>
            </pattern>
          </defs>
          <rect [attr.width]="canvasWidth()" [attr.height]="canvasHeight()" fill="url(#grid)" />
          
          <!-- Connection Lines -->
          @for (connection of allConnections(); track connection.id) {
            @if (getConnectionCoordinates(connection); as coords) {
              <line 
                [attr.x1]="coords.x1" 
                [attr.y1]="coords.y1" 
                [attr.x2]="coords.x2" 
                [attr.y2]="coords.y2" 
                stroke="#6366f1" 
                stroke-width="3" 
                class="pointer-events-auto hover:stroke-red-500 transition duration-150"
                (click)="deleteConnection(connection.id)"
              />
              <!-- Connection Label -->
              <text [attr.x]="(coords.x1 + coords.x2) / 2" [attr.y]="(coords.y1 + coords.y2) / 2 - 5"
                    text-anchor="middle" font-size="12" fill="#4f46e5" class="pointer-events-none font-sans bg-white bg-opacity-70 p-1 rounded">
                {{ connection.label }}
              </text>
            }
          }
        </svg>

        <!-- Cards Container -->
        <div id="cards-container" 
             [style.width.px]="canvasWidth()" 
             [style.height.px]="canvasHeight()" 
             class="relative z-20"
             (mousemove)="dragMove($event)"
             (mouseup)="dragEnd()">

          <!-- Render all Cards -->
          @for (card of allCards(); track card.id) {
            <div 
              class="card absolute p-4 rounded-xl shadow-lg cursor-grab transition duration-100 flex flex-col justify-between overflow-hidden"
              [style.background-color]="card.color"
              [style.left.px]="card.x"
              [style.top.px]="card.y"
              [style.width.px]="cardWidth"
              [style.height.px]="cardHeight"
              [class.shadow-xl]="card.id === activeCardId()"
              [class.ring-4]="selectedCardIds().includes(card.id) || editingCard()?.id === card.id"
              [class.ring-yellow-500]="selectedCardIds().includes(card.id)"
              [class.ring-indigo-500]="editingCard()?.id === card.id"
              (mousedown)="dragStart(card.id, $event)"
              (touchstart)="dragStart(card.id, $event)"
              (touchend)="dragEnd()"
              (touchmove)="dragMove($event)"
              (click)="handleCardClick(card.id, $event)"
              >
              
              <!-- Card Content -->
              <div>
                <h3 class="font-bold text-lg leading-tight mb-1" [style.color]="getContrastColor(card.color)">{{ card.title }}</h3>
                <p class="text-sm opacity-90" [style.color]="getContrastColor(card.color)">{{ card.content }}</p>
                <p class="text-xs mt-2 opacity-70" [style.color]="getContrastColor(card.color)">Creator: {{ card.ownerId.substring(0, 8) }}...</p>
              </div>

              <!-- Delete Button (Only for owner) -->
              @if (card.ownerId === userId()) {
                <button (click)="deleteCard(card.id, $event)" 
                        class="absolute top-1 right-1 text-red-500 hover:text-red-700 transition opacity-80"
                        [style.color]="getContrastColor(card.color) === '#ffffff' ? '#f87171' : '#dc2626'">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
              }
            </div>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    /* Using HSL color math to determine good contrast color */
    .card h3, .card p, .card button, .card p:nth-child(3) {
      mix-blend-mode: difference;
    }
  `],
  changeDetection: 0, // Default change detection strategy
})
export class App {
  // --- Firebase/Auth State ---
  userId = signal<string | null>(null);
  isAuthReady = signal(false);
  private db: any; // Firestore instance
  private auth: any; // Auth instance
  private appId: string;

  // --- Card/Connection State ---
  allCards = signal<LearningCard[]>([]);
  allConnections = signal<CardConnection[]>([]);

  // --- UI/Interaction State ---
  selectedCardIds = signal<string[]>([]);
  activeCardId = signal<string | null>(null);
  dragOffset = signal({ x: 0, y: 0 });
  
  // NEW: State for editing a card
  editingCard = signal<LearningCard | null>(null);

  // --- Canvas Dimensions ---
  canvasWidth = signal(1500);
  canvasHeight = signal(1000);
  gridSize = 50;
  cardWidth = 180;
  cardHeight = 120;

  // --- Initialization ---

  constructor() {
    this.appId = typeof __app_id !== 'undefined' ? __app_id : 'default-concept-canvas';
    const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

    if (Object.keys(firebaseConfig).length) {
      const app = initializeApp(firebaseConfig);
      this.db = getFirestore(app);
      this.auth = getAuth(app);
      this.initAuthAndListeners();
    } else {
      console.error("Firebase config not found.");
    }
    
    // Resize the canvas based on initial window size (can be expanded later)
    this.updateCanvasSize();
    window.addEventListener('resize', () => this.updateCanvasSize());
  }
  
  updateCanvasSize() {
      // Set minimum dimensions and expand based on content
      this.canvasWidth.set(Math.max(1500, window.innerWidth - (window.innerWidth >= 1024 ? 320 : 0)));
      this.canvasHeight.set(Math.max(1000, window.innerHeight));
  }

  // --- Auth & Data Listeners ---

  private async initAuthAndListeners() {
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    try {
      if (initialAuthToken) {
        await signInWithCustomToken(this.auth, initialAuthToken);
      } else {
        await signInAnonymously(this.auth);
      }
    } catch (error) {
      console.error("Firebase Auth Error:", error);
    }

    onAuthStateChanged(this.auth, (user) => {
      this.isAuthReady.set(true);
      if (user) {
        this.userId.set(user.uid);
        this.setupRealtimeListeners();
      } else {
        this.userId.set(crypto.randomUUID());
        console.warn("Signed in anonymously or user not found.");
      }
    });
  }

  private setupRealtimeListeners() {
    const cardsCollectionRef = collection(this.db, 'artifacts', this.appId, 'public', 'data', 'cards');
    const connectionsCollectionRef = collection(this.db, 'artifacts', this.appId, 'public', 'data', 'connections');

    // Listener for Cards
    onSnapshot(cardsCollectionRef, (snapshot) => {
      const cards: LearningCard[] = [];
      snapshot.forEach(doc => cards.push(doc.data() as LearningCard));
      this.allCards.set(cards);
      
      // If the currently edited card has been updated in Firestore, update the editingCard state
      const currentEditId = this.editingCard()?.id;
      if (currentEditId) {
        const updatedCard = cards.find(c => c.id === currentEditId);
        if (updatedCard) {
            this.editingCard.set(updatedCard);
        } else {
             // Card was deleted by another user/device
             this.editingCard.set(null);
        }
      }
      
    }, (error) => console.error("Firestore Cards Error:", error));

    // Listener for Connections
    onSnapshot(connectionsCollectionRef, (snapshot) => {
      const connections: CardConnection[] = [];
      snapshot.forEach(doc => connections.push(doc.data() as CardConnection));
      this.allConnections.set(connections);
    }, (error) => console.error("Firestore Connections Error:", error));
  }

  // --- Card CRUD Operations ---

  async addCard(title: string, content: string, color: string) {
    if (!title || !this.userId()) return;

    const newCard: LearningCard = {
      id: Date.now().toString(),
      title: title.substring(0, 50),
      content: content.substring(0, 150),
      x: 50, // Default position
      y: 50,
      color: color || '#a5b4fc',
      ownerId: this.userId()!
    };

    const cardDocRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'cards', newCard.id);
    await setDoc(cardDocRef, newCard);
  }

  async deleteCard(cardId: string, event: Event) {
    event.stopPropagation(); // Prevent card selection on delete click
    if (!this.userId()) return;

    const card = this.allCards().find(c => c.id === cardId);
    if (card && card.ownerId === this.userId()) {
      // 1. Delete Card
      const cardDocRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'cards', cardId);
      await deleteDoc(cardDocRef);
      this.editingCard.set(null); // Close edit panel if deleting

      // 2. Delete associated connections
      const connectionsToDelete = this.allConnections().filter(c => c.cardAId === cardId || c.cardBId === cardId);
      connectionsToDelete.forEach(async conn => {
        const connDocRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'connections', conn.id);
        await deleteDoc(connDocRef);
      });
      
      // Clear selection if deleted card was selected
      this.selectedCardIds.update(ids => ids.filter(id => id !== cardId));
    } else if (card) {
      console.warn("Cannot delete: Only the card owner can delete this card.");
    }
  }
  
  // NEW: Card Editing Logic
  
  handleCardClick(cardId: string, event: Event) {
    // If we're currently dragging, don't trigger selection or editing
    if (this.activeCardId()) return;

    // Check if the user is the owner and wants to edit
    const card = this.allCards().find(c => c.id === cardId);
    if (card && card.ownerId === this.userId()) {
        this.editingCard.set(card);
        this.selectedCardIds.set([]); // Clear connection selection when editing
    } else {
        // If not the owner, only allow selection for connection purposes
        this.editingCard.set(null);
        this.selectCard(cardId, event);
    }
  }
  
  updateEditingCard(field: keyof LearningCard, value: any) {
    this.editingCard.update(card => {
        if (card) {
            return { ...card, [field]: value };
        }
        return null;
    });
  }
  
  async saveCardEdit() {
    const card = this.editingCard();
    if (!card || card.ownerId !== this.userId()) return;
    
    // Create a clean object with only editable fields and ID
    const { id, title, content, color, ownerId } = card;
    
    const cardDocRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'cards', id);
    
    // Note: We use setDoc(..., {merge: true}) here just in case Firebase listener didn't update the local card fully
    await setDoc(cardDocRef, { title, content, color, ownerId }, { merge: true });

    // The Firestore listener will update allCards, and the listener logic handles updating editingCard.
    this.editingCard.set(null);
  }
  
  cancelCardEdit() {
    this.editingCard.set(null);
  }

  // --- Drag & Drop ---
  
  private normalizePosition(x: number, y: number): { x: number, y: number } {
    // Ensure position stays within canvas bounds (with padding for card size)
    const minX = 10;
    const minY = 10;
    const maxX = this.canvasWidth() - this.cardWidth - 10;
    const maxY = this.canvasHeight() - this.cardHeight - 10;
    
    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY)
    };
  }

  dragStart(cardId: string, event: MouseEvent | TouchEvent) {
    if (!this.userId()) return; // Must be authenticated to drag
    
    // Clear editing state when starting drag
    this.editingCard.set(null);
    
    const card = this.allCards().find(c => c.id === cardId);
    if (!card) return;

    // Get current mouse/touch position
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    
    // Calculate offset from card's top-left corner to mouse/touch position
    const cardElement = (event.currentTarget as HTMLElement);
    const rect = cardElement.getBoundingClientRect();
    
    this.dragOffset.set({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
    
    this.activeCardId.set(cardId);
    
    // Stop default touch behavior like scrolling
    if (event instanceof TouchEvent) {
      event.preventDefault();
    }
  }

  dragMove(event: MouseEvent | TouchEvent) {
    if (!this.activeCardId() || !this.userId()) return;

    // Get current mouse/touch position
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;
    
    // Get the container element's position
    const container = document.getElementById('cards-container') as HTMLElement;
    const containerRect = container.getBoundingClientRect();

    // Calculate new position relative to the container
    let newX = clientX - containerRect.left - this.dragOffset().x;
    let newY = clientY - containerRect.top - this.dragOffset().y;
    
    // Snap to grid for cleaner alignment (optional but useful)
    newX = Math.round(newX / this.gridSize) * this.gridSize;
    newY = Math.round(newY / this.gridSize) * this.gridSize;

    const normalized = this.normalizePosition(newX, newY);
    
    // Find the card and update its position locally immediately for smooth dragging
    this.allCards.update(cards => cards.map(c => 
      c.id === this.activeCardId() ? { ...c, x: normalized.x, y: normalized.y } : c
    ));
    
    // Stop default touch behavior like scrolling
    if (event instanceof TouchEvent) {
      event.preventDefault();
    }
  }

  async dragEnd() {
    if (!this.activeCardId() || !this.userId()) return;

    const cardId = this.activeCardId()!;
    this.activeCardId.set(null);

    const cardToUpdate = this.allCards().find(c => c.id === cardId);

    if (cardToUpdate) {
      // Save the final position to Firestore
      const cardDocRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'cards', cardId);
      
      // Only update the x and y fields, keeping other fields intact
      await setDoc(cardDocRef, { x: cardToUpdate.x, y: cardToUpdate.y }, { merge: true });
    }
  }
  
  // --- Selection & Connection Logic ---
  
  selectCard(cardId: string, event: Event) {
    // Prevent selection if we just finished a drag
    if (this.activeCardId() === cardId) return;

    event.stopPropagation();
    
    this.selectedCardIds.update(ids => {
      const index = ids.indexOf(cardId);
      if (index > -1) {
        // Deselect
        return ids.filter(id => id !== cardId);
      } else if (ids.length < 2) {
        // Select (limit to 2)
        return [...ids, cardId];
      }
      return ids; // Do nothing if 2 cards are already selected
    });
  }
  
  async createConnection(label: string) {
    const selected = this.selectedCardIds();
    if (selected.length !== 2 || !this.userId() || !label) return;

    // Check if connection already exists (A->B or B->A)
    const exists = this.allConnections().some(conn => 
        (conn.cardAId === selected[0] && conn.cardBId === selected[1]) ||
        (conn.cardAId === selected[1] && conn.cardBId === selected[0])
    );

    if (exists) {
        console.warn("Connection already exists between these two cards.");
        this.selectedCardIds.set([]); 
        return;
    }


    const newConnection: CardConnection = {
      id: `${selected[0]}-${selected[1]}-${Date.now()}`,
      cardAId: selected[0],
      cardBId: selected[1],
      label: label.substring(0, 30) || 'Related To'
    };

    const connDocRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'connections', newConnection.id);
    await setDoc(connDocRef, newConnection);
    
    this.selectedCardIds.set([]); // Clear selection after creating connection
  }
  
  async deleteConnection(connectionId: string) {
    const connDocRef = doc(this.db, 'artifacts', this.appId, 'public', 'data', 'connections', connectionId);
    await deleteDoc(connDocRef);
  }
  
  clearConnections() {
    this.selectedCardIds.set([]);
  }

  // --- Computed Values & Utilities ---

  /** Calculates the pixel coordinates for a connection line. */
  getConnectionCoordinates = computed(() => (connection: CardConnection) => {
    const cardA = this.allCards().find(c => c.id === connection.cardAId);
    const cardB = this.allCards().find(c => c.id === connection.cardBId);

    if (cardA && cardB) {
      // Line starts/ends at the center of the cards
      return {
        x1: cardA.x + this.cardWidth / 2,
        y1: cardA.y + this.cardHeight / 2,
        x2: cardB.x + this.cardWidth / 2,
        y2: cardB.y + this.cardHeight / 2,
      };
    }
    return null;
  });
  
  /** Utility to choose a high-contrast text color based on background HSL luminance. */
  getContrastColor(hex: string): string {
    if (!hex) return '#000000';
    // Convert hex to RGB, then to luminance
    const r = parseInt(hex.substring(1, 3), 16) / 255;
    const g = parseInt(hex.substring(3, 5), 16) / 255;
    const b = parseInt(hex.substring(5, 7), 16) / 255;
    
    // Formula for relative luminance (WCAG 2.1)
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    
    // Use white for dark backgrounds and black for light backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
}
