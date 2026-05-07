# Finance Tracker - Complete Project Summary

## 📋 Project Overview

**Application Name:** Finance Tracker  
**Version:** 0.1.0  
**Type:** Full-stack React web application  
**Purpose:** A comprehensive personal finance management platform that helps users track, analyze, and optimize their spending, investments, insurance, and credit card usage.

**Tagline:** "Track. Analyze. Save smarter."

---

## 🎯 Core Features

### 1. **Dashboard (Primary Hub)**
- **Net Worth Banner**: Displays total invested, current value, and gains/losses
- **Investment Summary**: Total invested, current value, portfolio gains, gain percentage
- **Insurance Coverage**: Life cover, health cover, annual premiums, expiring policies
- **Expense Analytics**: Last 6 months expenses by category with visual bars
- **Allocation Breakdown**: Investments by category using donut charts
- **Quick Stats**: Current portfolio distribution and performance metrics

### 2. **Investments Management**
- Track multiple investment types: Equity, Mutual Funds, FD, ULIP, EPF, PPF, Others
- Add/Edit/Delete investment entries
- View investment portfolio with current values and gains
- Calculate invested amount and current market value
- Tab-based interface for different investment types
- Real-time portfolio summary cards

### 3. **Insurance Management**
- Track insurance policies: Term, Life, Health, and other types
- Store policy details: Provider, Plan, Sum Assured, Premium, Renewal Date
- Renewal status indicators: Active, Expiring Soon (≤30 days), Expired
- Life cover and health cover totals
- Annual insurance premium calculation
- Status badges and color-coded cards

### 4. **Transaction Management**
- Add transactions with OCR receipt reading capability
- Auto-categorization using keyword matching
- Merchant name detection
- Transaction history with filtering
- Support for expense and income transactions

### 5. **Credit Cards Management**
- Track multiple credit cards
- Bill management and payment tracking
- Current cycle spending aggregation
- Card dashboard with visual summaries

### 6. **Transactions Page**
- Comprehensive transaction history
- Filter and search capabilities
- Category-based grouping
- Export functionality

---

## 🏗️ Architecture

### **Folder Structure**
```
finance-tracker/
├── src/
│   ├── pages/                 # Page components (full pages)
│   │   ├── Dashboard.js       # Main dashboard
│   │   ├── Investments.jsx    # Investment management
│   │   ├── Insurance.jsx      # Insurance management
│   │   ├── Login.js           # Authentication
│   │   ├── AddTransaction.js  # Add/OCR transaction
│   │   ├── Transactions.js    # Transaction history
│   │   ├── CreditCards.js     # Credit cards list
│   │   └── CardDashboard.js   # Card-specific dashboard
│   │
│   ├── components/            # Reusable components
│   │   ├── Navbar.js          # Navigation menu
│   │   ├── DashboardHeader.js # Dashboard header
│   │   ├── AccountOverview.js # Account summary
│   │   ├── CategoryChart.js   # Category charts
│   │   ├── RecentTransactions.js  # Recent txn list
│   │   ├── QuickActions.js    # Action buttons
│   │   ├── Insights.js        # Analytics insights
│   │   └── ui/                # Basic UI components
│   │       ├── Button.js
│   │       ├── Card.js
│   │       ├── Input.js
│   │       └── Page.js
│   │
│   ├── services/              # Business logic & API
│   │   ├── firebaseConfig.js  # Firebase initialization
│   │   ├── aggregationService.js  # Data aggregation
│   │   └── cardBillService.js # Card billing logic
│   │
│   ├── config/                # Configuration
│   │   └── categories.js      # Category definitions
│   │
│   ├── styles/                # Global styles
│   │   ├── global.css
│   │   └── theme.js           # Theme configuration
│   │
│   ├── App.js                 # Main app component
│   ├── index.js               # Entry point
│   └── setupTests.js          # Test configuration
│
├── public/                    # Static assets
├── build/                     # Production build output
├── firebase.json              # Firebase configuration
├── package.json               # Dependencies
└── README.md                  # Project documentation
```

---

## 🛠️ Technology Stack

### **Frontend Framework**
- **React** (v19.2.4): UI library and state management
- **React Router** (v7.13.0): Client-side routing

### **Backend & Database**
- **Firebase** (v12.8.0)
  - Firebase Authentication (Email/Password)
  - Firestore (Real-time database)
  - Firebase Storage (File storage)

### **Data Visualization & Charts**
- **Chart.js** (v4.5.1): Charting library
- **React ChartJS2** (v5.3.1): React wrapper for Chart.js

### **Document & File Handling**
- **jsPDF** (v4.1.0): PDF generation
- **jsPDF AutoTable** (v5.0.7): PDF table styling
- **XLSX** (v0.18.5): Excel export/import
- **Tesseract.js** (v7.0.0): OCR for receipt reading
- **Browser Image Compression** (v2.0.2): Image optimization

### **Styling**
- **CSS3**: Custom CSS with CSS variables
- **Tailwind CSS** (v4.2.4): Utility-first CSS framework
- **PostCSS** (v8.5.14): CSS processing
- **AutoPrefixer** (v10.5.0): Vendor prefixing

### **Testing**
- **React Testing Library** (v16.3.2)
- **Jest** (via react-scripts)

### **Build & Deployment**
- **React Scripts** (v5.0.1): Build toolchain
- **Firebase Hosting**: Deployment platform

---

## 🎨 Design System

### **Color Palette** (CSS Variables)
```css
--bg: #07090f              /* Dark background */
--surface: #0f1420         /* Surface/card background */
--card: #141927            /* Card background */
--border: rgba(255,255,255,0.07)  /* Borders */
--accent: #22d3a5          /* Primary - Teal/Green */
--blue: #3b82f6            /* Secondary - Blue */
--amber: #f59e0b           /* Warning - Amber */
--purple: #a78bfa          /* Tertiary - Ultra violet */
--red: #f87171             /* Danger/Negative - Red */
--green: #34d399           /* Positive - Green */
--text: #f1f5f9            /* Main text */
--muted: #64748b           /* Secondary text */
--muted2: #94a3b8          /* Tertiary text */
```

### **Typography**
- **Headline Font**: "Syne" (weights: 400, 600, 700, 800)
- **Body Font**: "DM Sans" (weights: 300, 400, 500)
- **Import**: Google Fonts CDN

### **Responsive Design**
- **Desktop**: Full multi-column layouts (grid-2, grid-3, grid-1-2, grid-2-1)
- **Tablet** (≤900px): Stacked to single column
- **Mobile** (≤600px): Optimized for small screens

---

## 📊 Data Models

### **Investment**
```javascript
{
  id: string,
  category: string, // Equity, Mutual Funds, FD, ULIP, EPF, PPF, Others
  name: string,
  invested: number,
  currentValue: number,
  quantity?: number,
  date: timestamp,
  notes: string
}
```

### **Insurance**
```javascript
{
  id: string,
  type: string, // Term, Life, Health, etc.
  provider: string,
  planName: string,
  sumAssured?: number,
  sumInsured?: number,
  premium: number,
  frequency: string, // Annual, Monthly, etc.
  renewalDate: date,
  startDate: date,
  status: string  // Active, Expiring, Expired
}
```

### **Transaction**
```javascript
{
  id: string,
  type: string, // "expense" or "income"
  amount: number,
  category: string,
  merchant: string,
  date: timestamp,
  account: string, // UPI app or card name
  description: string,
  receipt?: string // URL to receipt image
}
```

### **Monthly Summary**
```javascript
{
  monthKey: string, // "YYYY-MM"
  totalSpend: number,
  categories: { [categoryName]: amount },
  merchants: { [merchantName]: amount }
}
```

### **Card Summary**
```javascript
{
  account: string,
  currentCycleSpend: number,
  cycleStartDate: date,
  cycleEndDate: date
}
```

---

## 🔄 Data Flow & Services

### **Firebase Service** (`firebaseConfig.js`)
- Initializes Firebase with environment variables
- Exports: `auth`, `db`, `storage`
- Supports all Firebase Authentication and Firestore operations

### **Aggregation Service** (`aggregationService.js`)
Updates aggregate data in Firestore:
- `updateMonthlySummary()`: Updates monthly spending totals
- `updateMerchantSummary()`: Tracks spending by merchant
- `updateCardSummary()`: Tracks credit card cycle spending
- `updateCategorySummary()`: Tracks spending by category

### **Card Bill Service** (`cardBillService.js`)
- Manages credit card billing cycles
- Calculates outstanding amounts
- Tracks payment dates and amounts

### **Authentication Flow**
1. User logs in with email/password
2. Firebase Auth validates credentials
3. `onAuthStateChanged()` listener updates app state
4. Protected routes render based on auth state
5. User data fetched from Firestore

---

## 📱 Navigation Structure

### **Main Navigation (Navbar)**
- 🏠 Dashboard (`/dashboard`)
- 📈 Investments (`/investments`)
- 🛡️ Insurance (`/insurance`)
- ➕ Add Entry (`/add`)
- 📊 Transactions (`/transactions`)
- 💳 Credit Cards (`/cards`)
- 📊 Card Dashboard (`/card-dashboard`)

### **Authentication Routes**
- `/` → Redirects to Dashboard (if logged in) or Login (if not)
- `/login` → Login form
- `*` → Fallback to Login

---

## 🔐 Key Features & Implementations

### **OCR Receipt Reading** (AddTransaction.js)
- Uses Tesseract.js for optical character recognition
- Extracts: Amount, Date, Merchant name, Category
- Auto-category detection using keyword matching
- Image compression for optimization

### **Smart Categorization**
```javascript
Category Keywords:
- Food: ["swiggy", "zomato", "restaurant", "cafe", "pizza", "biryani"]
- Groceries: ["bigbasket", "blinkit", "instamart", "dmart", "zepto"]
- Transport: ["uber", "ola", "rapido", "flight", "petrol", "fuel"]
- Bills: ["rent", "electricity", "water", "internet", "jio"]
- Shopping: ["amazon", "flipkart", "myntra", "nykaa"]
- Health: ["pharmacy", "apollo", "hospital", "doctor"]
- Entertainment: ["netflix", "prime", "hotstar", "bookmyshow"]
- Investment: ["mutual fund", "stocks", "zerodha", "groww"]
```

### **Payment Methods Support**
- **UPI Apps**: GPay, PhonePe, Paytm, Kiwi, BHIM, Amazon Pay
- **Debit Cards**: HDFC, SBI, ICICI, Axis

### **Report Generation**
- PDF export of transactions and summary reports
- Excel export of financial data
- Custom styling with jsPDF AutoTable

---

## 📈 Key Calculations

### **Investment Returns**
```javascript
Total Invested = Sum of all invested amounts
Total Current Value = Latest market value of all investments
Total Gain = Total Current Value - Total Invested
Gain Percentage = (Total Gain / Total Invested) * 100
```

### **Insurance Coverage**
```javascript
Life Cover = Sum of all Term/Life policies sum assured
Health Cover = Sum of all Health policies sum insured
Annual Premium = Sum of all annual premiums
Expiring Soon = Policies with renewal date within 30 days
```

### **Expense Analysis**
- **By Category**: Aggregated last 6 months
- **By Merchant**: Top merchants by spending
- **By Time**: Monthly trends and patterns
- **By Account**: Spending by payment method

---

## 🚀 Performance Optimizations

- **Code Splitting**: React Router enables lazy loading
- **Image Compression**: Browser-image-compression for receipt images
- **Responsive Design**: Mobile-first approach
- **Real-time Updates**: Firestore listeners for live data sync
- **Efficient Queries**: User-specific data with Firestore where clauses

---

## 🔧 Development Setup

### **Prerequisites**
- Node.js (v14+)
- npm or yarn

### **Installation**
```bash
cd finance-tracker
npm install
```

### **Environment Variables** (.env)
```
REACT_APP_FIREBASE_API_KEY=xxxxx
REACT_APP_FIREBASE_AUTH_DOMAIN=xxxxx
REACT_APP_FIREBASE_PROJECT_ID=xxxxx
REACT_APP_FIREBASE_STORAGE_BUCKET=xxxxx
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=xxxxx
REACT_APP_FIREBASE_APP_ID=xxxxx
```

### **Scripts**
```bash
npm start          # Run dev server (localhost:3000)
npm build          # Create production build
npm test           # Run tests
npm eject          # Eject from CRA (one-way operation)
```

### **Deployment**
```bash
npm run build
firebase deploy
```

---

## 📊 Database Schema (Firestore)

### **Collections**
- `users/{userId}`: User profile and preferences
- `transactions/{userId}/entries`: User transactions
- `investments/{userId}/entries`: Investment portfolio
- `insurance/{userId}/entries`: Insurance policies
- `creditCards/{userId}/entries`: Credit card details
- `monthlySummary/{monthKey}`: Aggregate monthly data
- `merchantSummary/{monthKey}`: Merchant spending aggregate
- `categorySummary/{monthKey}`: Category spending aggregate
- `cardSummary/{cardId}`: Credit card aggregate data

---

## 🎯 Current Status & Known Items

### **Implemented**
✅ User authentication (Firebase)  
✅ Dashboard with net worth and insights  
✅ Investment tracking and portfolio management  
✅ Insurance policy management  
✅ Transaction entry with manual input  
✅ OCR receipt reading  
✅ Credit card management  
✅ Category-based expense analysis  
✅ Real-time data sync with Firestore  
✅ Responsive design  

### **Future Enhancement Opportunities**
- [ ] Multi-currency support
- [ ] Budget planning and alerts
- [ ] Bill reminders and notifications
- [ ] Goal tracking (savings, investment targets)
- [ ] Advanced analytics and AI-powered insights
- [ ] Mobile app (React Native)
- [ ] Dark/Light theme toggle
- [ ] Bank account integration (API)
- [ ] Recurring transaction templates
- [ ] Data export (CSV, PDF reports)
- [ ] Spending forecasts
- [ ] Tax optimization suggestions
- [ ] Collaborative budgeting (shared accounts)
- [ ] Offline support (PWA)

---

## 📝 Code Conventions

### **File Naming**
- Components: PascalCase (e.g., `Dashboard.js`)
- Pages: PascalCase (e.g., `Dashboard.js`)
- Services: camelCase (e.g., `aggregationService.js`)
- Styles: CSS files or inline styles

### **Component Structure**
- Imports at top
- State declarations
- Effects
- Helper functions
- JSX rendering
- Inline styles in CSS template literals

### **Styling Approach**
- Global CSS variables for theming
- Inline CSS templates (template literals) for component styles
- Mobile-first responsive design
- Utility classes for common patterns

---

## 🔒 Security Considerations

- Firebase Authentication for user access control
- Firestore Security Rules (should be configured appropriately)
- Environment variables for API keys (not in version control)
- Input validation before database operations
- XSS protection through React
- CSRF protection via Firebase

---

## 📞 Dependencies Summary

| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.2.4 | UI framework |
| react-router-dom | 7.13.0 | Routing |
| firebase | 12.8.0 | Backend services |
| chart.js | 4.5.1 | Data visualization |
| tesseract.js | 7.0.0 | OCR |
| jspdf | 4.1.0 | PDF generation |
| xlsx | 0.18.5 | Excel export |
| tailwindcss | 4.2.4 | CSS framework |

---

## 🎓 Getting Started for New Developers

1. **Understand the app**: This is a personal finance tracker with investments, insurance, and transaction management
2. **Read the file structure**: Navigate through pages/ and components/ folders
3. **Check Firebase setup**: Understand the data model in firebaseConfig.js
4. **Review a page**: Start with Dashboard.js to understand component patterns
5. **Study aggregation**: Learn how data flows through aggregationService.js
6. **Explore styling**: Check the CSS variables and responsive design patterns

---

## 📞 Support & Maintenance

For suggestions on new features or improvements:
- Review this summary for current architecture
- Check the "Future Enhancement Opportunities" section
- Consider the existing data models when proposing changes
- Ensure compatibility with Firebase structure
- Maintain the responsive design principle

---

**Last Updated:** May 8, 2026  
**Project Type:** React + Firebase Web Application  
**Status:** Active Development
