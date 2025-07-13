# ReChess - Online Chess Shop

Modern e-commerce platform for chess equipment and accessories, built with Vue.js and Node.js.

## Project Structure

```
rechessNode/
├── frontend/                 # Vue.js frontend application
│   ├── src/
│   │   ├── components/      # Reusable Vue components
│   │   │   └── floating/    # Floating UI elements (cart badge, cookies)
│   │   ├── pages/          # Page components
│   │   ├── store/          # Pinia state management
│   │   ├── composables/    # Vue composables
│   │   ├── utils/          # Utility functions
│   │   ├── types/          # TypeScript type definitions
│   │   ├── assets/         # Static assets
│   │   └── router/         # Vue Router configuration
│   ├── public/             # Public static assets
│   └── docs/               # VitePress documentation
│
├── backend/                 # Node.js backend application
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API route definitions
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── db/             # Database migrations and configuration
│   └── docs/               # JSDoc API documentation
│
└── e2e/                    # End-to-end tests with Playwright
    ├── tests/              # Test scenarios
    └── playwright.config.ts # Playwright configuration
```

## Technology Stack

### Frontend
- Vue.js 3 with Composition API
- TypeScript
- Vite for development and building
- Pinia for state management
- Vue Router for navigation
- VitePress for documentation
- Vitest for unit testing

### Backend
- Node.js with Express
- TypeScript
- Knex.js for database operations
- MariaDB as database
- JWT for token-based identification
- Jest for testing
- JSDoc for API documentation

### Testing
- Frontend: Vitest + Vue Test Utils
- Backend: Jest
- E2E: Playwright

## Getting Started

### Prerequisites
- Node.js 18+
- MariaDB 10.5+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/rechessNode.git
cd rechessNode
```

2. Install dependencies:
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install

# E2E tests
cd ../e2e
npm install
```

3. Set up environment variables:
```bash
# Backend
cp backend/.env.example backend/.env
# Edit .env with your database credentials
```

4. Run database migrations:
```bash
cd backend
npm run migrate
```

### Development

Start the development servers:

```bash
# Frontend (http://localhost:3000)
cd frontend
npm run dev

# Backend (http://localhost:3001)
cd backend
npm run dev
```

### Testing

```bash
# Frontend tests
cd frontend
npm run test

# Backend tests
cd backend
npm run test

# E2E tests
cd e2e
npm run test
```

### Documentation

```bash
# Frontend documentation
cd frontend
npm run docs:dev

# Backend API documentation
cd backend
npm run docs
```

## Project Features

- Static pages with pre-rendering
- Dynamic pages for shop and user cabinet
- Shopping cart with persistent storage
- Token-based user identification
- Responsive design
- Comprehensive test coverage
- Detailed documentation

## Development Guidelines

1. Code Style
   - Use TypeScript for all new code
   - Follow ESLint configuration
   - Write JSDoc comments for functions and components
   - Use English for comments and documentation

2. Git Workflow
   - Create feature branches from main
   - Use conventional commits
   - Submit pull requests for review

3. Testing
   - Write unit tests for new components
   - Add integration tests for API endpoints
   - Include E2E tests for critical paths

4. Documentation
   - Update documentation for new features
   - Include JSDoc comments in code
   - Keep README up to date

## License

[MIT License](LICENSE) 