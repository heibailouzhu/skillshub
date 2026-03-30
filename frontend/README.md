# SkillShub Frontend

Frontend application for SkillShub - A skill sharing platform.

## Tech Stack

- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Build Tool**: Vite

## Prerequisites

- Node.js >= 18
- npm >= 9

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:8080
```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── api/           # API client and services
│   │   ├── client.ts  # Axios instance configuration
│   │   ├── auth.ts    # Authentication API
│   │   ├── skills.ts  # Skills API
│   │   ├── comments.ts # Comments API
│   │   ├── favorites.ts # Favorites API
│   │   ├── ratings.ts   # Ratings API
│   │   └── index.ts   # API exports
│   ├── components/    # React components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── utils/         # Utility functions
│   ├── types/         # TypeScript type definitions
│   ├── App.tsx        # Root component
│   ├── main.tsx       # Application entry point
│   └── index.css      # Global styles
├── public/            # Static assets
├── index.html         # HTML template
├── tailwind.config.js # Tailwind CSS configuration
├── postcss.config.js  # PostCSS configuration
└── vite.config.ts     # Vite configuration
```

## API Documentation

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Skills

- `GET /api/skills` - Get skills list (with search, filter, sort)
- `GET /api/skills/:id` - Get skill details
- `POST /api/skills` - Create a new skill (requires auth)
- `PUT /api/skills/:id` - Update a skill (requires auth, author only)
- `DELETE /api/skills/:id` - Delete a skill (requires auth, author only)
- `GET /api/skills/categories/popular` - Get popular categories
- `GET /api/skills/tags/popular` - Get popular tags
- `GET /api/skills/search/suggestions` - Get search suggestions

### Skill Versions

- `GET /api/skills/:id/versions/:version` - Get version details
- `POST /api/skills/:id/versions` - Create a new version (requires auth, author only)
- `POST /api/skills/:id/versions/:version/rollback` - Rollback to a version (requires auth, author only)

### Comments

- `GET /api/skills/:skill_id/comments` - Get skill comments
- `POST /api/skills/:skill_id/comments` - Create a comment (requires auth)
- `PUT /api/comments/:comment_id` - Update a comment (requires auth, author only)
- `DELETE /api/comments/:comment_id` - Delete a comment (requires auth, author only)

### Favorites

- `GET /api/favorites` - Get user's favorites (requires auth)
- `POST /api/skills/:id/favorite` - Add to favorites (requires auth)
- `DELETE /api/skills/:id/favorite` - Remove from favorites (requires auth)

### Ratings

- `GET /api/ratings` - Get user's ratings (requires auth)
- `POST /api/skills/:id/rating` - Create a rating (requires auth)
- `PUT /api/ratings/:id` - Update a rating (requires auth, author only)
- `DELETE /api/ratings/:id` - Delete a rating (requires auth, author only)
- `GET /api/skills/:id/ratings` - Get skill rating statistics

## Features

### Authentication

- User registration
- User login/logout
- Token-based authentication (JWT)
- Protected routes

### Skills

- Browse skills with pagination
- Search skills (full-text search)
- Filter by category and tags
- Sort by various criteria
- Create, edit, delete skills
- Version management
- Download skills

### Comments

- View comments on skills
- Post comments
- Reply to comments (nested)
- Edit and delete own comments

### Favorites

- Add skills to favorites
- View favorite skills
- Remove from favorites

### Ratings

- Rate skills (1-5 stars)
- View average rating
- View rating statistics
- Edit and delete own ratings

## Error Handling

The API client automatically handles:

- Authentication errors (401) - Redirect to login
- Forbidden errors (403) - Log error
- Not found errors (404) - Log error
- Server errors (500) - Log error
- Network errors - Log error

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT
