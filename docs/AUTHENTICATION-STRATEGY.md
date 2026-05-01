# Authentication Strategy: Database vs Middleware

## Core Concept

**Authentication tables depend ENTIRELY on your chosen auth approach:**

```
Choice 1: Built-in (Database-backed)
  └─ You manage User table
  └─ You manage RefreshToken table
  └─ You handle password hashing
  └─ You control session lifecycle

Choice 2: External Auth Service (Auth0, Firebase, Keycloak, etc)
  └─ No User table in your DB
  └─ No RefreshToken table
  └─ Service manages authentication
  └─ You only store User ID from service

Choice 3: SSO / OAuth2 (GitHub, Google, etc)
  └─ No password table
  └─ No RefreshToken management
  └─ External service handles tokens
  └─ You only store external user ID + metadata
```

---

## Option 1: Built-in JWT Authentication (Database-Backed)

### When to Use

✅ **Simple application** (internal team, small user base)
✅ **Full control** (you want to manage everything)
✅ **No external dependencies** (on-prem, isolated)
✅ **Learning** (understand JWT, password hashing)

### Database Structure Required

```
TABLE: users
├─ id (UUID/CUID) - Primary Key
├─ email (VARCHAR 255) - UNIQUE
├─ password (VARCHAR 255) - bcrypt hashed (60 chars min)
├─ name (VARCHAR 255) - nullable
├─ createdAt (TIMESTAMP)
├─ updatedAt (TIMESTAMP)
└─ UNIQUE INDEX on email

TABLE: refresh_tokens
├─ id (UUID/CUID) - Primary Key
├─ userId (UUID/CUID) - FK → users.id, CASCADE
├─ token (VARCHAR 500) - UNIQUE (hashed token)
├─ expiresAt (TIMESTAMP)
├─ revokedAt (TIMESTAMP) - nullable
├─ createdAt (TIMESTAMP)
└─ INDEX on userId
```

### API Endpoints

```
POST /auth/register
  Body: { email, password, name }
  Returns: { accessToken, refreshToken, user }

POST /auth/login
  Body: { email, password }
  Returns: { accessToken, refreshToken, user }

POST /auth/refresh
  Body: { refreshToken }
  Returns: { accessToken }

POST /auth/logout
  Body: { refreshToken }
  Returns: { success: true }
```

### JWT Tokens

**Access Token (15 min):**
```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234569690,
  "type": "access"
}
```

**Refresh Token (7 days):**
```json
{
  "sub": "user-123",
  "iat": 1234567890,
  "exp": 1234999999,
  "type": "refresh"
}
```

### Backend Implementation (NestJS example)

```typescript
// auth.controller.ts
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  
  @Post('register')
  async register(@Body() dto: RegisterDTO) {
    // 1. Validate email not taken
    // 2. Hash password with bcrypt
    // 3. Create user in database
    // 4. Generate tokens
    // 5. Return tokens + user
    return this.authService.register(dto)
  }
  
  @Post('login')
  async login(@Body() dto: LoginDTO) {
    // 1. Find user by email
    // 2. Verify password (bcrypt.compare)
    // 3. Generate tokens
    // 4. Store refresh token in database
    // 5. Return tokens
    return this.authService.login(dto)
  }
  
  @Post('refresh')
  async refresh(@Body('refreshToken') token: string) {
    // 1. Verify refresh token signature
    // 2. Check if revoked in database
    // 3. Check if expired
    // 4. Generate new access token
    // 5. Return access token
    return this.authService.refresh(token)
  }
  
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Body('refreshToken') token: string) {
    // 1. Mark token as revoked in database
    // 2. Return success
    return this.authService.logout(token)
  }
}

// auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private em: EntityManager,
    private jwtService: JwtService
  ) {}
  
  async register(dto: RegisterDTO) {
    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10)
    
    // Create user
    const user = new User()
    user.email = dto.email
    user.password = hashedPassword
    user.name = dto.name
    
    this.em.persist(user)
    await this.em.flush()
    
    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user)
    
    // Store refresh token
    const token = new RefreshToken()
    token.user = user
    token.token = await bcrypt.hash(refreshToken, 10)
    token.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    
    this.em.persist(token)
    await this.em.flush()
    
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name }
    }
  }
  
  private generateTokens(user: User) {
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '15m' }
    )
    
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    )
    
    return { accessToken, refreshToken }
  }
}
```

### Pros & Cons

**Pros:**
✅ Full control
✅ No external dependencies
✅ Simple for small teams
✅ Learning opportunity
✅ Can implement custom rules

**Cons:**
❌ You manage password security
❌ You handle token lifecycle
❌ User management is your responsibility
❌ Scaling (password resets, account recovery)
❌ PII stored in your database

---

## Option 2: External Auth Service (Auth0, Firebase, Keycloak)

### When to Use

✅ **Enterprise application** (many users, complex policies)
✅ **Security critical** (health, finance, etc)
✅ **Multi-application** (share auth across services)
✅ **Advanced features** (MFA, passwordless, SAML)
✅ **Compliance** (SOC2, HIPAA, GDPR)

### Database Structure Required

```
TABLE: users
├─ id (UUID/CUID) - Primary Key
├─ externalId (VARCHAR 255) - UNIQUE (from Auth0/Firebase)
├─ email (VARCHAR 255) - from external service
├─ name (VARCHAR 255) - from external service
├─ metadata (JSON) - custom data from external service
├─ lastLogin (TIMESTAMP)
├─ createdAt (TIMESTAMP)
├─ updatedAt (TIMESTAMP)
└─ INDEX on externalId
```

**NO password table!**
**NO refresh_tokens table!**

### Architecture

```
Frontend
  ↓
Auth0 Login Page / Widget
  ↓
Auth0 generates tokens
  ↓
Frontend calls your API with token
  ↓
Your middleware validates token with Auth0
  ↓
Middleware extracts user info from token
  ↓
Your app uses externalId to find user in database
```

### API Endpoints

```
POST /auth/callback
  Body: { auth0Token }
  Action: Validate token, sync user, return app token

GET /auth/me
  Headers: { Authorization: Bearer <appToken> }
  Returns: { user: {...} }

POST /auth/logout
  Headers: { Authorization: Bearer <appToken> }
  Action: Mark logout in external service
```

### Middleware Implementation (Auth0 example)

```typescript
// auth0.strategy.ts
import { Strategy } from 'passport-auth0'

@Injectable()
export class Auth0Strategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      domain: configService.get('AUTH0_DOMAIN'),
      clientID: configService.get('AUTH0_CLIENT_ID'),
      clientSecret: configService.get('AUTH0_CLIENT_SECRET'),
      callbackURL: configService.get('AUTH0_CALLBACK_URL')
    })
  }
  
  validate(accessToken: string, refreshToken: string, profile: any) {
    // profile from Auth0 contains:
    // { id, email, displayName, photos, ... }
    return profile
  }
}

// auth.controller.ts
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private em: EntityManager
  ) {}
  
  @Get('login')
  @UseGuards(AuthGuard('auth0'))
  async login() {}
  
  @Get('callback')
  @UseGuards(AuthGuard('auth0'))
  async callback(@Request() req: any) {
    // req.user contains Auth0 profile
    
    // 1. Check if user exists in our DB
    let user = await this.em.findOne(User, {
      externalId: req.user.id
    })
    
    // 2. If not, create user
    if (!user) {
      user = new User()
      user.externalId = req.user.id
      user.email = req.user.email
      user.name = req.user.displayName
      
      this.em.persist(user)
      await this.em.flush()
    }
    
    // 3. Update lastLogin
    user.lastLogin = new Date()
    await this.em.flush()
    
    // 4. Generate app token (optional, for API calls)
    const appToken = this.authService.generateAppToken(user)
    
    // 5. Redirect to frontend with token
    return {
      token: appToken,
      user: { id: user.id, email: user.email }
    }
  }
  
  @Get('logout')
  async logout(@Request() req: any) {
    // Call Auth0 logout endpoint
    // Invalidate app token if using one
  }
}

// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = this.extractToken(request)
    
    if (!token) {
      throw new UnauthorizedException()
    }
    
    try {
      // Verify token (could be from Auth0 or your app token)
      const payload = this.jwtService.verify(token)
      request.user = payload
      return true
    } catch (err) {
      throw new UnauthorizedException()
    }
  }
  
  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }
}
```

### Pros & Cons

**Pros:**
✅ Offload security to experts
✅ Advanced features (MFA, SSO, passwordless)
✅ Compliance built-in
✅ Scaling (multi-tenant, etc)
✅ Password reset, account recovery
✅ No PII in your database

**Cons:**
❌ External dependency
❌ Cost (pay per user)
❌ Learning curve
❌ Less control
❌ Vendor lock-in risk

---

## Option 3: OAuth2 / Social Login (GitHub, Google, Discord)

### When to Use

✅ **Consumer application** (public, many users)
✅ **Easy onboarding** (users already have accounts)
✅ **Social features** (user profiles, etc)
✅ **Lower friction** (no password to remember)

### Database Structure Required

```
TABLE: users
├─ id (UUID/CUID) - Primary Key
├─ provider (VARCHAR 50) - 'github' | 'google' | 'discord'
├─ providerId (VARCHAR 255) - unique ID from provider
├─ email (VARCHAR 255)
├─ name (VARCHAR 255)
├─ avatar (VARCHAR 2000) - profile picture URL
├─ metadata (JSON) - any extra data from provider
├─ lastLogin (TIMESTAMP)
├─ createdAt (TIMESTAMP)
├─ updatedAt (TIMESTAMP)
└─ UNIQUE INDEX on (provider, providerId)
```

**NO password table!**
**NO refresh_tokens table!**

### Implementation (GitHub example)

```typescript
// github.strategy.ts
import { Strategy } from 'passport-github2'

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get('GITHUB_CLIENT_ID'),
      clientSecret: configService.get('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.get('GITHUB_CALLBACK_URL'),
      scope: ['user:email']
    })
  }
  
  validate(accessToken: string, refreshToken: string, profile: any) {
    // profile from GitHub contains:
    // { id, login, avatar_url, email, ... }
    return {
      providerId: profile.id,
      provider: 'github',
      email: profile.emails[0].value,
      name: profile.displayName,
      avatar: profile.photos[0].value
    }
  }
}

// auth.controller.ts
@Controller('auth')
export class AuthController {
  constructor(private em: EntityManager) {}
  
  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubLogin() {}
  
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Request() req: any) {
    // req.user contains GitHub profile
    
    // 1. Find or create user
    let user = await this.em.findOne(User, {
      provider: 'github',
      providerId: req.user.providerId
    })
    
    if (!user) {
      user = new User()
      user.provider = 'github'
      user.providerId = req.user.providerId
      user.email = req.user.email
      user.name = req.user.name
      user.avatar = req.user.avatar
      
      this.em.persist(user)
    }
    
    // 2. Update last login
    user.lastLogin = new Date()
    await this.em.flush()
    
    // 3. Generate session/token
    // 4. Redirect to frontend
  }
}
```

### Pros & Cons

**Pros:**
✅ No password management
✅ Social graph (find friends)
✅ Easy adoption
✅ Verified email from provider

**Cons:**
❌ Dependency on provider
❌ Limited to provider's data
❌ Rate limits from provider
❌ Less control over user data

---

## Comparison Table

| Feature | Built-in | Auth0 | OAuth2 |
|---------|----------|-------|--------|
| **Control** | 100% | Medium | Low |
| **Complexity** | Low | High | Medium |
| **Security** | You manage | Expert | Provider manages |
| **Cost** | $0 | $$$$ | $0 |
| **Scaling** | Manual | Automatic | Automatic |
| **MFA** | You build | Built-in | Built-in |
| **Password Reset** | You build | Built-in | N/A |
| **Multi-tenant** | Manual | Built-in | No |
| **Compliance** | Your burden | Certified | Provider's burden |
| **Table: users** | ✅ Yes | ✅ Small | ✅ Small |
| **Table: refresh_tokens** | ✅ Yes | ❌ No | ❌ No |
| **Table: password** | ✅ Yes | ❌ No | ❌ No |

---

## Recommendation for KAIROS

### Built-in JWT (Recommended for KAIROS)

**Why?**
- Internal tool for consulting team
- Trust is high (coworkers)
- Simplicity matters
- Cost matters
- Full control of data

**Database schema:**
```
users (WITH password)
refresh_tokens
```

**Simplest flow:**
1. User registers with email + password
2. Backend bcrypt hashes password
3. Login: verify password, return JWT
4. Refresh token in database
5. Logout: revoke token

---

## Decision: Which Option?

**Ask yourself:**

1. **Who are your users?**
   - Internal team → Built-in
   - Public users → OAuth2 / Auth0
   - Enterprise clients → Auth0 / Keycloak

2. **How many users?**
   - < 100 → Built-in (simple)
   - 100-10k → Built-in or Auth0
   - > 10k → Auth0

3. **Compliance requirements?**
   - None → Built-in
   - Some (GDPR) → Built-in (you control data)
   - High (HIPAA, SOC2) → Auth0

4. **Time to market?**
   - ASAP → OAuth2 (fastest)
   - Few weeks → Built-in (simple)
   - Flexible → Auth0 (best features)

5. **Budget?**
   - $0 → Built-in or OAuth2
   - $$ → Auth0

---

## Minimal User Table (All Options)

```
TABLE: users (ALWAYS needed, regardless of auth method)
├─ id (UUID/CUID) - Primary Key
├─ email (VARCHAR 255) - UNIQUE (your system identifier)
├─ name (VARCHAR 255) - nullable
├─ createdAt (TIMESTAMP)
├─ updatedAt (TIMESTAMP)
│
├─ [IF Built-in]
│  ├─ password (VARCHAR 255) - bcrypt hash
│  └─ passwordChangedAt (TIMESTAMP)
│
├─ [IF Auth0/External]
│  └─ externalId (VARCHAR 255) - UNIQUE (service identifier)
│
├─ [IF OAuth2]
│  ├─ provider (VARCHAR 50) - github|google|discord
│  ├─ providerId (VARCHAR 255)
│  └─ avatar (VARCHAR 2000)
│
└─ [ALWAYS]
   └─ INDEX on email
```

---

## Conclusion

**Your authentication tables ENTIRELY depend on:**

1. ✅ **Built-in JWT** → users + refresh_tokens tables
2. ✅ **External Service** → only externalId in users table
3. ✅ **OAuth2/Social** → only provider info in users table

**For KAIROS webapp** → Recommend **Built-in JWT** with:
```
users (email, password, name)
refresh_tokens (userId, token, expiresAt, revokedAt)
```

**Minimal, secure, sufficient!**

