# Testing & QA Plan — Sehatkita Frontend

## Setup

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @types/jest jest-environment-jsdom
npm test                  # Run all tests
npm run test:watch      # Watch mode
```

## Test Coverage Roadmap

### ✅ Unit Tests (Jest + RTL)
- **UI Components** (Button, Badge, Empty, etc.)
  - Props rendering
  - Click handlers
  - Disabled/loading states
  - Styling (variant, size, tone)

- **Utility Functions** (format, labels, validation)
  - Date formatting (tanggal, relatif)
  - Number formatting (angka)
  - Enum mapping (LABEL_STATUS, etc.)

- **Hooks** (useUser, custom hooks)
  - State management
  - localStorage/cookie interaction
  - Error handling

### 🔄 Integration Tests
- **Pages**
  - Dashboard tier 1-4 rendering
  - Login/register flow
  - Role-based UI conditional rendering
  - API error fallback (dummy data)

- **User Flows**
  - Register → consent → onboarding → dashboard
  - Login → role detect → dashboard redirect
  - Add catatan → list update
  - Join program → peserta status

### 🎭 E2E Tests (Manual + future Playwright)
- **Critical Paths**
  - [ ] Register new user (tier 1)
  - [ ] Login & dashboard load
  - [ ] Create catatan kesehatan
  - [ ] Join program & see status
  - [ ] Change settings (notifikasi, keamanan)
  - [ ] Admin tier 3 — create program, manage peserta
  - [ ] Super_admin tier 4 — master data (wilayah, indikator, pengguna)

- **Edge Cases**
  - [ ] Unauthorized route access (middleware block)
  - [ ] Token expired → auto logout
  - [ ] API error response → fallback dummy data
  - [ ] Slow network → loading states
  - [ ] Mobile viewport (< 390px width)

## QA Checklist

### Functional
- [ ] All 31 routes load without error
- [ ] Role-based UI renders correctly per role
- [ ] Middleware guards redirect unauthorized access
- [ ] Form validation & error messages display
- [ ] Links navigate to correct pages
- [ ] Buttons trigger correct actions

### Usability
- [ ] Navigation flow intuitive (landing → auth → dashboard → app)
- [ ] Empty states show helpful message
- [ ] Loading states visible on slow network
- [ ] Error messages actionable & clear
- [ ] CTA buttons (FAB, action buttons) obvious & reachable

### Performance
- [ ] Home page < 2s load (desktop)
- [ ] Dashboard < 3s with dummy data
- [ ] List pages (program, rujukan, notifikasi) paginate at 15+ items
- [ ] Charts render smooth (no jank)
- [ ] Mobile viewport reflow < 100ms

### Accessibility
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Screen reader alt text on icons
- [ ] Form labels linked to inputs
- [ ] Color contrast ≥ 4.5:1 (WCAG AA)
- [ ] Focus visible on interactive elements

### Browser Compatibility
- [ ] Chrome 128+
- [ ] Safari 18+
- [ ] Firefox 130+
- [ ] Mobile Safari (iOS 18+)
- [ ] Chrome Android

### Mobile
- [ ] Minimum 320px viewport works
- [ ] Touch targets ≥ 44x44px
- [ ] No horizontal scroll on viewport
- [ ] Font readable (≥ 16px on input)
- [ ] Form inputs don't zoom on iOS

## Test Examples

### Button Component (unit)
```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "@/components/ui/Button";

it("renders & fires onClick", async () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click</Button>);
  await userEvent.click(screen.getByText("Click"));
  expect(handleClick).toHaveBeenCalled();
});
```

### Dashboard User (integration)
```typescript
import { render, screen, waitFor } from "@testing-library/react";
import DashboardUser from "@/components/dashboard/DashboardUser";

it("renders dashboard pribadi tier 1 user", async () => {
  const mockUser = { id: 1, name: "Budi", role: "user" };
  render(<DashboardUser user={mockUser} />);
  
  await waitFor(() => {
    expect(screen.getByText(/status kesehatan/i)).toBeInTheDocument();
    expect(screen.getByText(/indikator terkini/i)).toBeInTheDocument();
  });
});
```

## Running Tests

```bash
# All tests
npm test

# Specific file
npm test Button.test.tsx

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage
```

## Next Steps

1. **Add 10+ unit tests** (components, utils, hooks)
2. **Add 5+ integration tests** (pages, flows)
3. **Manual E2E QA** (all critical paths)
4. **Performance audit** (Lighthouse CI)
5. **Accessibility scan** (axe DevTools)
6. **Cross-browser test** (BrowserStack / LambdaTest)
