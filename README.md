# StudyYodha - AI-Powered Learning Platform 🎓

A modern, professional educational platform for Class 5-12 students with AI tutoring, practice tests, and comprehensive CBSE curriculum coverage.

## ✨ Features

- 🤖 **AI Teacher** - Interactive doubt-solving with intelligent responses
- 📚 **Complete Curriculum** - Full CBSE coverage for Class 5-12
- 📝 **Practice Tests** - Unlimited quizzes with instant feedback
- 📊 **Progress Tracking** - Detailed analytics for students and parents
- 🌐 **Bilingual Support** - Hindi and English language options
- 👪 **Parent Dashboard** - Monitor your child's learning progress
- ⚙️ **Admin Panel** - Content and user management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd studyyodha

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
studyyodha/
├── src/
│   ├── components/
│   │   ├── Layout.jsx          # Main layout with sidebar
│   │   └── UI.jsx              # Reusable UI components
│   ├── pages/
│   │   ├── Landing.jsx         # Home page
│   │   ├── Login.jsx           # Authentication
│   │   ├── Dashboard.jsx       # Student dashboard
│   │   ├── ChapterList.jsx     # Chapter browser
│   │   ├── TutorChat.jsx       # AI tutor interface
│   │   ├── Quiz.jsx            # Practice tests
│   │   ├── ParentDashboard.jsx # Parent view
│   │   └── Admin.jsx           # Admin panel
│   ├── utils/
│   │   └── theme.js            # Design system
│   ├── App.jsx                 # Router configuration
│   └── main.jsx                # Entry point
├── public/                     # Static assets
├── index.html                  # HTML template
└── package.json                # Dependencies
```

## 🎨 Design System

### Color Palette
- **Primary**: Indigo (#6366F1) - Main brand color
- **Secondary**: Amber (#F59E0B) - Highlights & CTAs
- **Accent**: Green (#10B981) - Success states
- **Neutral**: Grays for text and backgrounds

### Typography
- **Headings**: Poppins (bold, modern)
- **Body**: Inter (clean, readable)

### Components
- Modern card-based layouts
- Smooth animations and transitions
- Icon-based navigation
- Responsive design for all devices

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) for complete guidelines.

## 🛣️ Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Homepage with features overview |
| `/login` | Login/Signup | User authentication |
| `/dashboard` | Dashboard | Student progress overview |
| `/chapters` | Chapter List | Browse available chapters |
| `/tutor` | AI Tutor | Interactive learning assistant |
| `/quiz` | Quiz | Practice questions |
| `/parent` | Parent View | Progress monitoring |
| `/admin` | Admin | Content management |

## 🔧 Technology Stack

- **Frontend**: React 18
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Styling**: CSS-in-JS + Tailwind utility approach
- **Build Tool**: Vite
- **Fonts**: Google Fonts (Inter + Poppins)

## 📦 Dependencies

```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "react-router-dom": "^6.x",
  "lucide-react": "latest"
}
```

## 🎯 Key Features Breakdown

### 1. Landing Page
- Hero section with gradient background
- Feature highlights with icons
- Subject showcase cards
- Clear call-to-action buttons

### 2. Student Dashboard
- Study time and performance stats
- Active learning streak tracker
- Continue learning card
- Subject progress visualization

### 3. AI Tutor
- Split-screen: content viewer + chat
- Real-time doubt solving
- Voice and image input support
- Context-aware responses

### 4. Practice Tests
- Multiple-choice questions
- Progress tracking
- Instant feedback
- Skip functionality

### 5. Parent Dashboard
- Weekly activity overview
- Subject-wise performance
- Weak areas identification
- Progress trends

### 6. Admin Panel
- Content upload interface
- Student access management
- Toggle active/inactive users
- Book and chapter organization

## 🌟 UI Highlights

- ✅ Clean, modern interface
- ✅ Intuitive navigation
- ✅ Smooth animations
- ✅ Responsive design
- ✅ Accessible components
- ✅ Professional color scheme
- ✅ Icon-based visual language
- ✅ Card-based layouts

## 📱 Responsive Design

The application is fully responsive and optimized for:
- 📱 Mobile phones (320px+)
- 📱 Tablets (640px+)
- 💻 Desktops (1024px+)
- 🖥️ Large screens (1280px+)

## 🔐 Future Enhancements

- [ ] User authentication with JWT
- [ ] Real AI integration (OpenAI/Claude API)
- [ ] Payment gateway integration
- [ ] Video lessons
- [ ] Live classes
- [ ] Gamification (badges, leaderboards)
- [ ] Push notifications
- [ ] Dark mode
- [ ] Offline support (PWA)
- [ ] Mobile apps (React Native)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support, email support@studyyodha.com or open an issue on GitHub.

---

**Built with ❤️ for Indian students** 🇮🇳

Happy Learning! 🎓✨
