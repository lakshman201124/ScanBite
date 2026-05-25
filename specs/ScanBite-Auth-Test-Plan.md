# ScanBite Authentication Test Plan

## Application Overview

The ScanBite (QR Dine) application is a multi-tenant restaurant management system with NextAuth v5. This comprehensive test plan covers all authentication flows including admin signup, admin login, chef login, and API authentication endpoints. The plan validates user registration, session management, JWT tokens, credential validation, error handling, and security measures across the three main user roles: restaurant admins, kitchen staff (chefs), and customers.

## Test Scenarios

### 1. Admin Signup Tests

**Seed:** `tests/seed.spec.ts`

#### 1.1. Valid signup creates restaurant account and auto-logs in user

**File:** `tests/auth/admin-signup.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/signup
    - expect: Signup form page loads with all required fields visible
    - expect: Form contains Restaurant Name, Email, Password, and Phone fields
  2. Enter restaurant name: 'Spice Garden'
    - expect: Input field displays the entered value
    - expect: Floating label animates correctly
  3. Enter email: 'admin@spicegarden.com'
    - expect: Email field accepts the input
    - expect: Email format is validated
  4. Enter password: 'SecurePass123'
    - expect: Password field masks the input by default
    - expect: Eye toggle icon is visible to show/hide password
  5. Enter phone: '+919876543210'
    - expect: Phone field accepts the input
    - expect: Phone format is accepted
  6. Click the 'Create Account' button
    - expect: Loading state appears with multi-phase loader
    - expect: Loader displays steps like 'Creating tenant profile', 'Provisioning database', etc.
  7. Wait for signup process to complete
    - expect: User is automatically redirected to /onboarding or /dashboard
    - expect: JWT cookie is set in browser (httpOnly)
    - expect: Admin user is created in database with correct role
  8. Verify user session
    - expect: Session contains correct email and restaurant name
    - expect: JWT token is valid and contains user claims
    - expect: Session expires after 30 days

#### 1.2. Signup with password less than 8 characters shows validation error

**File:** `tests/auth/admin-signup.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/signup
    - expect: Signup form is displayed
  2. Fill form with valid data except password: 'Pass12'
    - expect: Form accepts all inputs except password field should indicate minimum length requirement
  3. Click 'Create Account' button
    - expect: Error message appears: 'Password must be at least 8 characters'
    - expect: Form remains on signup page
    - expect: Data is not submitted to API

#### 1.3. Signup with invalid email format shows validation error

**File:** `tests/auth/admin-signup.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/signup
    - expect: Signup form is displayed
  2. Fill form with invalid email: 'invalidemail'
    - expect: Email field shows invalid state
    - expect: Email validation is triggered
  3. Click 'Create Account' button
    - expect: Error message appears about invalid email format
    - expect: Form does not submit
    - expect: User remains on signup page

#### 1.4. Signup with duplicate email shows error

**File:** `tests/auth/admin-signup.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/signup
    - expect: Signup form is displayed
  2. Fill form with email: 'admin@spicegarden.com' (which already exists from previous test)
    - expect: Form accepts all inputs
  3. Click 'Create Account' button
    - expect: API returns error about duplicate email
    - expect: Error message displays: 'An account with this email already exists'
    - expect: Form remains on signup page
    - expect: User session is not created

#### 1.5. Signup with missing required fields shows validation errors

**File:** `tests/auth/admin-signup.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/signup
    - expect: Signup form is displayed
  2. Leave Restaurant Name field empty and click 'Create Account'
    - expect: Error or required field indicator appears for Restaurant Name
    - expect: Form does not submit
  3. Fill Restaurant Name, leave Email empty, click 'Create Account'
    - expect: Error appears for Email field
    - expect: Form validation prevents submission
  4. Fill all required fields except Phone and click 'Create Account'
    - expect: Error appears for Phone field or it's marked as required
    - expect: Form does not submit

#### 1.6. Signup password visibility toggle works correctly

**File:** `tests/auth/admin-signup.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/signup
    - expect: Signup form is displayed
  2. Enter password: 'SecurePass123'
    - expect: Password field shows dots/bullets
    - expect: Eye icon is visible on the right
  3. Click the eye icon to show password
    - expect: Password is revealed as plain text
    - expect: Eye icon changes appearance to 'eye-off' state
  4. Click the eye icon again to hide password
    - expect: Password is masked again with dots/bullets
    - expect: Eye icon changes back to 'eye' state

#### 1.7. Signup with special characters in restaurant name is accepted

**File:** `tests/auth/admin-signup.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/signup
    - expect: Signup form is displayed
  2. Fill form with restaurant name: 'Café & Co.'
    - expect: Form accepts special characters
  3. Complete signup with all other valid data
    - expect: Signup succeeds
    - expect: Restaurant name is stored correctly with special characters

#### 1.8. Signup form has floating labels that animate correctly

**File:** `tests/auth/admin-signup.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/signup
    - expect: All form labels are visible in their default position
  2. Focus on Restaurant Name field
    - expect: Label floats up and scales down
    - expect: Label color changes to brand color
  3. Clear the field and blur
    - expect: Label returns to default position
    - expect: Label color returns to default
  4. Enter text and leave field focused
    - expect: Label remains in floating position

#### 1.9. Signup API endpoint creates tenant and admin user in database

**File:** `tests/auth/admin-signup-api.spec.ts`

**Steps:**
  1. Call POST /api/auth/signup with valid payload
    - expect: API returns 201 status code
    - expect: Response contains JWT token
    - expect: Response contains user email and restaurant ID
  2. Verify restaurant is created in database
    - expect: Restaurant record exists with correct name
    - expect: Restaurant has auto-generated slug
    - expect: Restaurant has unique tenant ID
  3. Verify admin user is created
    - expect: User record exists with admin role
    - expect: User email matches signup request
    - expect: Password is hashed (not stored as plaintext)

### 2. Admin Login Tests

**Seed:** `tests/seed.spec.ts`

#### 2.1. Valid admin login with demo credentials redirects to dashboard

**File:** `tests/auth/admin-login.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/login
    - expect: Login form page loads
    - expect: Form contains Email and Password fields
    - expect: Demo credentials are shown below the form
  2. Enter email: 'admin@spicegarden.com'
    - expect: Email input accepts the value
    - expect: Floating label appears and animates
  3. Enter password: 'admin123'
    - expect: Password input masks the text by default
    - expect: Eye toggle is available
  4. Click 'Sign in' button
    - expect: Loading spinner appears on the button
    - expect: Button becomes disabled during login process
  5. Wait for authentication to complete
    - expect: User is redirected to /dashboard
    - expect: URL changes to dashboard
    - expect: Page title shows restaurant dashboard or admin area
  6. Verify JWT cookie is set
    - expect: httpOnly cookie is present in browser
    - expect: Cookie name is 'next-auth.session-token' or similar
    - expect: Cookie is valid JWT token

#### 2.2. Invalid email shows authentication error

**File:** `tests/auth/admin-login.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/login
    - expect: Login form is displayed
  2. Enter email: 'nonexistent@restaurant.com'
    - expect: Email field accepts input
  3. Enter password: 'admin123'
    - expect: Password field accepts input
  4. Click 'Sign in' button
    - expect: Loading state is shown
    - expect: Error message appears: 'Invalid email or password'
    - expect: User remains on login page
    - expect: No redirect to dashboard

#### 2.3. Invalid password shows authentication error

**File:** `tests/auth/admin-login.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/login
    - expect: Login form is displayed
  2. Enter email: 'admin@spicegarden.com'
    - expect: Email field accepts input
  3. Enter password: 'wrongpassword123'
    - expect: Password field accepts input
  4. Click 'Sign in' button
    - expect: Loading state appears
    - expect: Error message: 'Invalid email or password'
    - expect: User remains on login page
    - expect: JWT cookie is not set

#### 2.4. Empty email field shows validation error

**File:** `tests/auth/admin-login.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/login
    - expect: Login form is displayed
  2. Leave email field empty and enter password: 'admin123'
    - expect: Email field is marked as required
  3. Click 'Sign in' button
    - expect: Form validation prevents submission
    - expect: Error message appears about required field or browser native validation

#### 2.5. Empty password field shows validation error

**File:** `tests/auth/admin-login.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/login
    - expect: Login form is displayed
  2. Enter email: 'admin@spicegarden.com' and leave password empty
    - expect: Password field is marked as required
  3. Click 'Sign in' button
    - expect: Form validation prevents submission
    - expect: Browser native validation or error message appears

#### 2.6. Login session persists across page refreshes

**File:** `tests/auth/admin-login.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/login
    - expect: Login form is displayed
  2. Login with valid credentials: admin@spicegarden.com / admin123
    - expect: User is redirected to dashboard
    - expect: JWT token is set in cookie
  3. Refresh the page (F5 or Ctrl+R)
    - expect: User remains on dashboard
    - expect: Session is maintained
    - expect: Page does not redirect to login
  4. Close and reopen the browser (maintain cookies)
    - expect: User can access dashboard without re-logging in
    - expect: Session persists with JWT cookie

#### 2.7. Password visibility toggle works on login form

**File:** `tests/auth/admin-login.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/login
    - expect: Login form is displayed
  2. Enter password: 'admin123'
    - expect: Password is masked by default
    - expect: Eye icon is visible
  3. Click eye icon to reveal password
    - expect: Password text becomes visible as plain text
    - expect: Eye icon changes to 'eye-off' appearance
  4. Click eye icon again to hide password
    - expect: Password is masked again
    - expect: Eye icon returns to 'eye' appearance

#### 2.8. Link to signup page works from login page

**File:** `tests/auth/admin-login.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/login
    - expect: Login form is displayed
    - expect: Link 'Create account' is visible at bottom
  2. Click 'Create account' link
    - expect: Page navigates to /signup
    - expect: Signup form is displayed

#### 2.9. Link to chef login works from admin login page

**File:** `tests/auth/admin-login.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/login
    - expect: Login form is displayed
    - expect: Link 'Chef / Kitchen login' is visible
  2. Click 'Chef / Kitchen login' link
    - expect: Page navigates to /chef-login
    - expect: Chef login form is displayed

#### 2.10. Login POST request returns JWT token in response

**File:** `tests/auth/admin-login-api.spec.ts`

**Steps:**
  1. Call POST /api/auth/[...nextauth] with credentials
    - expect: API returns 200 status
    - expect: Response contains JWT token in cookies
    - expect: Token is valid and properly signed
  2. Verify JWT token structure
    - expect: Token contains user email in 'email' claim
    - expect: Token contains user ID in 'sub' claim
    - expect: Token contains restaurant ID in 'tenant' or custom claim
  3. Verify token expiration
    - expect: Token has 'exp' claim set to 30 days from now
    - expect: Token can be decoded and verified

### 3. Chef Login Tests

**Seed:** `tests/seed.spec.ts`

#### 3.1. Chef login with valid slug navigates to PIN entry step

**File:** `tests/auth/chef-login.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/chef-login
    - expect: Chef login page loads with dark theme
    - expect: Restaurant ID step is displayed
    - expect: Input field shows placeholder 'grand-biryani'
  2. Enter restaurant slug: 'spice-garden'
    - expect: Input accepts the value
    - expect: Text is converted to lowercase automatically
  3. Click 'Continue' button
    - expect: Step transitions to PIN entry form
    - expect: Button shows 'spice-garden' with back arrow option
    - expect: PIN input dots are displayed

#### 3.2. Chef login with valid slug and PIN redirects to KDS

**File:** `tests/auth/chef-login.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/chef-login
    - expect: Chef login form loads
  2. Enter restaurant slug: 'spice-garden'
    - expect: Slug is accepted
  3. Click 'Continue' button
    - expect: PIN entry form appears
  4. Enter PIN: '1234' using keypad (4 digits)
    - expect: Each digit shows as filled dot in the 4-dot display
    - expect: After 4th digit is entered, login request is sent automatically
  5. Wait for authentication to complete
    - expect: User is redirected to /kds (Kitchen Display System)
    - expect: Chef session is established
    - expect: JWT cookie is set for chef user

#### 3.3. Chef login with invalid PIN shows error

**File:** `tests/auth/chef-login.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/chef-login
    - expect: Chef login form loads
  2. Enter valid slug: 'spice-garden' and proceed to PIN entry
    - expect: PIN entry form is displayed
  3. Enter wrong PIN: '9999'
    - expect: Error message appears: 'Invalid PIN'
    - expect: User remains on PIN entry page
    - expect: PIN dots are cleared
  4. Verify user is not redirected to KDS
    - expect: URL remains at /chef-login
    - expect: No JWT session for chef is created

#### 3.4. Chef login with invalid slug shows error

**File:** `tests/auth/chef-login.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/chef-login
    - expect: Chef login form loads with slug input
  2. Enter invalid slug: 'nonexistent-restaurant'
    - expect: Input accepts the value
  3. Click 'Continue' button
    - expect: Error message appears about invalid restaurant slug
    - expect: User remains on slug entry form
    - expect: PIN entry form does not appear

#### 3.5. Chef login PIN entry uses numeric keypad with backspace

**File:** `tests/auth/chef-login.spec.ts`

**Steps:**
  1. Navigate to chef-login and enter valid slug to reach PIN entry
    - expect: PIN entry form is displayed with numeric keypad
  2. Enter digits: '1', '2', '3', '4'
    - expect: Each keystroke shows as a filled dot
    - expect: 4 dots are displayed after all digits
  3. Click keypad '1' button
    - expect: Button shows tactile feedback or highlights
    - expect: Digit is appended to PIN
  4. Click backspace/delete button
    - expect: Last entered digit is removed
    - expect: Number of filled dots decreases
  5. Test that more than 4 digits cannot be entered
    - expect: After 4 digits, further keypad clicks are ignored
    - expect: PIN entry is disabled until a digit is deleted

#### 3.6. Chef login PIN entry is case-insensitive for slug

**File:** `tests/auth/chef-login.spec.ts`

**Steps:**
  1. Navigate to /chef-login
    - expect: Slug input is displayed
  2. Enter slug: 'SPICE-GARDEN' (uppercase)
    - expect: Input automatically converts to lowercase
    - expect: Slug shows as 'spice-garden'
  3. Continue and enter valid PIN
    - expect: Login succeeds
    - expect: Chef is redirected to /kds

#### 3.7. Chef login back button returns to slug entry

**File:** `tests/auth/chef-login.spec.ts`

**Steps:**
  1. Navigate to /chef-login and complete slug entry
    - expect: PIN entry form is displayed
    - expect: Back button with slug name is shown
  2. Click back button (← slug)
    - expect: Page returns to slug entry form
    - expect: PIN is cleared
    - expect: Previously entered slug is preserved

#### 3.8. Chef login slug input is empty validation

**File:** `tests/auth/chef-login.spec.ts`

**Steps:**
  1. Navigate to /chef-login
    - expect: Slug input field is displayed
    - expect: Continue button is visible
  2. Leave slug field empty and try to click Continue
    - expect: Continue button is disabled
    - expect: Form prevents submission

#### 3.9. Chef login API endpoint validates PIN against chef user

**File:** `tests/auth/chef-login-api.spec.ts`

**Steps:**
  1. Call POST /api/auth/chef-login with valid slug and PIN
    - expect: API returns 200 status
    - expect: Response contains { success: true }
    - expect: JWT token is issued for chef user
  2. Call POST /api/auth/chef-login with invalid PIN
    - expect: API returns error response
    - expect: Response contains { success: false, error: 'Invalid PIN' }
    - expect: No token is issued

### 4. Authentication API Tests

**Seed:** `tests/seed.spec.ts`

#### 4.1. Signup API endpoint validates email format

**File:** `tests/auth/api-signup-validation.spec.ts`

**Steps:**
  1. Call POST /api/auth/signup with invalid email: 'notanemail'
    - expect: API returns 400 or 422 status code
    - expect: Response contains error message about invalid email format
  2. Call POST /api/auth/signup with valid email format
    - expect: API accepts the email and continues validation

#### 4.2. Signup API endpoint validates password minimum length

**File:** `tests/auth/api-signup-validation.spec.ts`

**Steps:**
  1. Call POST /api/auth/signup with password: 'Pass12'
    - expect: API returns 400 or 422 status code
    - expect: Response contains error: 'Password must be at least 8 characters'
  2. Call POST /api/auth/signup with password: 'SecurePass123'
    - expect: API accepts the password

#### 4.3. Signup API endpoint requires all mandatory fields

**File:** `tests/auth/api-signup-validation.spec.ts`

**Steps:**
  1. Call POST /api/auth/signup with missing 'restaurantName'
    - expect: API returns 400 status
    - expect: Response contains error about missing required field
  2. Call POST /api/auth/signup with missing 'email'
    - expect: API returns 400 status
    - expect: Error message indicates email is required
  3. Call POST /api/auth/signup with missing 'password' or 'phone'
    - expect: API returns 400 status for each missing field
    - expect: Clear error messages are provided

#### 4.4. Login API endpoint returns 401 for invalid credentials

**File:** `tests/auth/api-login.spec.ts`

**Steps:**
  1. Call POST /api/auth/[...nextauth] with wrong email
    - expect: API returns 401 Unauthorized
    - expect: Response does not include JWT token
  2. Call POST /api/auth/[...nextauth] with wrong password
    - expect: API returns 401 Unauthorized
    - expect: No token issued

#### 4.5. Login API endpoint returns 200 and sets JWT for valid credentials

**File:** `tests/auth/api-login.spec.ts`

**Steps:**
  1. Call POST /api/auth/[...nextauth] with valid email and password
    - expect: API returns 200 OK
    - expect: Response includes Set-Cookie header with JWT
    - expect: JWT token is properly formatted

#### 4.6. JWT token contains correct claims

**File:** `tests/auth/api-jwt.spec.ts`

**Steps:**
  1. Login successfully and extract JWT token
    - expect: Token is obtained from Set-Cookie header
  2. Decode JWT token (without verification)
    - expect: Token contains 'sub' claim with user ID
    - expect: Token contains 'email' claim with user email
    - expect: Token contains 'iat' (issued at) timestamp
    - expect: Token contains 'exp' (expiration) timestamp
  3. Verify token contains tenant/restaurant information
    - expect: Token includes tenant ID or restaurant slug for multi-tenancy
    - expect: Tenant claim is accessible for authorization

#### 4.7. JWT token expiration is set to 30 days

**File:** `tests/auth/api-jwt.spec.ts`

**Steps:**
  1. Login and get JWT token
    - expect: Token is issued
  2. Decode token and check 'exp' claim
    - expect: exp timestamp is approximately 30 days from 'iat'
    - expect: 30 days = 2,592,000 seconds

#### 4.8. Chef login API validates PIN format

**File:** `tests/auth/api-chef-validation.spec.ts`

**Steps:**
  1. Call POST /api/auth/chef-login with PIN: '123' (less than 4 digits)
    - expect: API returns 400 or validation error
    - expect: Response indicates PIN must be at least 4 digits
  2. Call POST /api/auth/chef-login with PIN: 'abcd' (non-numeric)
    - expect: API returns 400 status
    - expect: Response indicates PIN must be numeric

#### 4.9. Chef login API validates restaurant slug exists

**File:** `tests/auth/api-chef-validation.spec.ts`

**Steps:**
  1. Call POST /api/auth/chef-login with slug: 'nonexistent'
    - expect: API returns 400 or 404 status
    - expect: Response contains error about invalid restaurant
  2. Call POST /api/auth/chef-login with valid existing slug
    - expect: API continues to PIN validation

#### 4.10. Authentication endpoint has CSRF protection

**File:** `tests/auth/api-security.spec.ts`

**Steps:**
  1. Attempt POST to /api/auth/[...nextauth] without CSRF token
    - expect: Request is accepted (NextAuth handles CSRF automatically in Credentials provider)
    - expect: Or API returns error if CSRF token is required
  2. Verify NextAuth CSRF token mechanism
    - expect: Session cookies are secure and httpOnly
    - expect: Tokens are validated server-side

#### 4.11. API rate limiting prevents brute force attacks on login

**File:** `tests/auth/api-security.spec.ts`

**Steps:**
  1. Make 5 consecutive failed login attempts with wrong password
    - expect: First 3-4 attempts return 401 Unauthorized
    - expect: After threshold, API returns 429 Too Many Requests or rate limit error
  2. Wait for rate limit window to reset
    - expect: After waiting (e.g., 5 minutes), login attempt is accepted again

### 5. Session and Security Tests

**Seed:** `tests/seed.spec.ts`

#### 5.1. Accessing protected route without session redirects to login

**File:** `tests/auth/session-security.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000/dashboard without logging in
    - expect: Page redirects to /login automatically
    - expect: Dashboard is not accessible
  2. Verify redirect happens before rendering protected content
    - expect: No dashboard content is visible
    - expect: User sees login page

#### 5.2. JWT cookie is httpOnly and cannot be accessed from JavaScript

**File:** `tests/auth/session-security.spec.ts`

**Steps:**
  1. Login successfully
    - expect: JWT cookie is set in response
  2. Check cookie flags in browser DevTools
    - expect: Cookie has 'HttpOnly' flag set
    - expect: Cookie has 'Secure' flag set (HTTPS)
    - expect: Cookie has 'SameSite' flag set to 'Strict' or 'Lax'
  3. Attempt to access cookie via JavaScript: document.cookie
    - expect: JWT cookie is not visible in document.cookie (httpOnly prevents access)
    - expect: Only non-httpOnly cookies are visible

#### 5.3. Logout clears session and redirects to login

**File:** `tests/auth/session-security.spec.ts`

**Steps:**
  1. Login and navigate to dashboard
    - expect: User is on dashboard
    - expect: Session is active
  2. Click logout button or navigate to /api/auth/signout
    - expect: JWT cookie is cleared/deleted
    - expect: User is redirected to login page
  3. Try to access dashboard again
    - expect: Access is denied
    - expect: User is redirected to login

#### 5.4. Admin cannot access chef-specific routes

**File:** `tests/auth/session-security.spec.ts`

**Steps:**
  1. Login as admin user
    - expect: Admin session is established
  2. Try to navigate to /kds (chef route)
    - expect: Access is denied or redirected
    - expect: Error page or permission denied message appears

#### 5.5. Chef cannot access admin dashboard

**File:** `tests/auth/session-security.spec.ts`

**Steps:**
  1. Login as chef user via /chef-login
    - expect: Chef session is established
  2. Try to navigate to /dashboard (admin route)
    - expect: Access is denied
    - expect: Chef is redirected to /kds or shown error
