Welcome to the [NowStack](https://nowstack.melvynx.dev) directory.

## Setup the project

Please follow the [NowStack Course](https://codeline.app/courses/clqn8pmte0001lr54itcjzl59/lessons/clqn8pz990003112iia11p7uo) to setup the project.

After cloning a fresh project, install dependencies before running Convex. Convex bundles your local `convex/` files and must resolve packages from `node_modules`.

```bash
pnpm install
pnpm convex:dev
```

Running `npx convex dev` before `pnpm install` can fail with `Could not resolve "convex/server"` or `Could not resolve "@convex-dev/resend/convex.config.js"` because the CLI is installed temporarily, but the project dependencies are still missing.

## Environment Variables Setup

Before running the application, you'll need to configure several environment variables. Copy the `.env-template` file to `.env` and fill in the required values:

```bash
cp .env-template .env
```

### Database

You can install [Postgres (MacOS)](https://postgresapp.com/) or [Postgres (Windows)](https://www.postgresql.org/download/windows/) to have a local database.

Launch the application, then configure your database URL:

```bash
DATABASE_URL="postgresql://NAME:@localhost:5432/PROJECT_NAME"
```

To find your `NAME`:

```bash
# MacOS/Linux
whoami

# Windows
echo %username%
```

For `PROJECT_NAME`, choose any name you want - we recommend using the same name as your application.

### Redis (Required)

Redis is **required** for caching and provides ~90% performance improvement.

#### Option 1: Local Redis Installation

**macOS** (using Homebrew):

```bash
# Install Redis
brew install redis

# Start Redis server
brew services start redis

# Or run manually
redis-server
```

See the [official macOS installation guide](https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-mac-os/) for more details.

**Windows**:

Download and install Redis from the [official Windows guide](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/install-redis-on-windows/).

**Linux**:

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server
```

After installation, add to your `.env`:

```bash
REDIS_URL=redis://localhost:6379
```

#### Option 2: Docker (Quick Setup)

```bash
# Start Redis with Docker
docker run -d -p 6379:6379 redis:alpine

# Add to .env
REDIS_URL=redis://localhost:6379
```

#### Option 3: Redis Cloud Services (Recommended for Production)

For production deployments, we recommend using a managed Redis service:

**Upstash** (Serverless Redis):

- Free tier: 10,000 commands/day
- Serverless with pay-per-use pricing
- Sign up at [console.upstash.com](https://console.upstash.com)
- Copy your Redis URL and add to `.env`

**Redis Cloud** (Official Redis):

- Free tier: 30MB RAM
- Managed by Redis Labs
- Sign up at [redis.com/try-free](https://redis.com/try-free/)
- Get your connection URL from the dashboard

**Railway**:

- $5/month for 512MB RAM
- Simple setup and deployment
- Go to [railway.app](https://railway.app) and deploy Redis

For detailed setup instructions for each provider, see the [Redis Setup Guide](./docs/redis-setup.md).

### Better-Auth

For [Better-Auth](https://www.better-auth.com/), we recommend starting with the GitHub provider. You can add more providers later.

By default, the template also includes Magic Link (requires Resend setup) and email/password authentication.

You'll need a `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` from [GitHub Developer Settings](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app).

Configure these settings:

- `Authorization callback URL`: `http://localhost:3000/api/auth/callback/github`
- `Homepage URL`: `http://localhost:3000`

Then add to your `.env`:

```bash
GITHUB_CLIENT_ID="YOUR_GITHUB_ID"
GITHUB_CLIENT_SECRET="YOUR_GITHUB_SECRET"
```

Generate a `BETTER_AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the result and add it to your `.env`:

```bash
BETTER_AUTH_SECRET="YOUR_SECRET"
```

### Resend

Create a [Resend account](https://resend.com) and [create an API key](https://resend.com/api-keys). You'll also need to [configure a domain](https://resend.com/domains) - either your application's domain or any domain you own.

- [Tutorial for Resend API keys](https://resend.com/docs/dashboard/api-keys/introduction)
- [Tutorial for Resend domains](https://resend.com/docs/dashboard/domains/introduction)

Add the API key to your `.env`:

```bash
RESEND_API_KEY="YOUR_API_KEY"
EMAIL_FROM="contact@yourdomain.com"
NEXT_PUBLIC_EMAIL_CONTACT="your@email.com"
```

### Stripe

If you don't have a Stripe account yet, [create one](https://dashboard.stripe.com/register).

Follow [this documentation](https://stripe.com/docs/development/get-started) to get your **test** API keys.

Add them to your `.env`:

```bash
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

#### Stripe Webhooks

For webhooks, first login to Stripe CLI:

```bash
stripe login
```

Then run the webhook listener:

```bash
pnpm run stripe-webhooks
```

Copy the webhook secret from the output and add it to your `.env`:

```bash
STRIPE_WEBHOOK_SECRET="whsec_..."
```

> **Note**: Each time you want to use webhooks during development, you'll need to run `pnpm stripe-webhooks` to forward Stripe events to your local application. The webhook secret remains the same.

### Uploadthing

[Uploadthing](https://uploadthing.com/) is a SaaS for managing images in your application.

Go to your [Uploadthing dashboard](https://uploadthing.com/dashboard/) and get a token:

```bash
UPLOADTHING_TOKEN='YOUR_TOKEN'
```

### Starting the Application

Once all environment variables are configured, install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Test that everything works by:

- Logging in with GitHub
- Creating an account
- Verifying emails are sent
- Testing other features

## Caching

NowStack uses **Redis caching** to provide exceptional performance, reducing database queries by ~90% and middleware execution time from ~200-500ms to <20ms.

### Why Redis is Required

Without caching:

- Every page navigation hits the database 2-3 times
- Middleware validates sessions and organization membership repeatedly
- External Stripe API calls on every page load
- Slow response times and high database load

With Redis caching:

- 80-95% of requests served from cache
- Session validation cached for 5 minutes
- Organization lookups cached for 5 minutes
- Stripe subscription data cached for 1 hour
- **~90% performance improvement**

### Quick Setup

**For local development**:

```bash
# Start Redis with Docker
docker run -d -p 6379:6379 redis:alpine

# Add to .env.local
REDIS_URL=redis://localhost:6379
```

**For production** (recommended providers):

- **Railway**: $5/month - [Setup Guide](./docs/redis-setup.md#railway-recommended)
- **Redis Cloud**: Free tier available - [Setup Guide](./docs/redis-setup.md#redis-cloud-free-tier-available)
- **Upstash**: Pay-per-use - [Setup Guide](./docs/redis-setup.md#upstash-serverless-redis)

See [docs/redis-setup.md](./docs/redis-setup.md) for complete setup instructions.

### What's Cached

- **Session validation** (5 min TTL) - Better Auth cookie caching + Redis
- **Organization membership** (5 min TTL) - Middleware checks
- **User's organizations** (10 min TTL) - Organization list
- **Stripe subscriptions** (1 hour TTL) - Billing data

### Cache Invalidation

Caches are automatically invalidated when:

- User updates their profile
- Organization settings change
- Membership changes (add/remove members)
- Subscription updates via Stripe webhooks

### Performance Impact

Real-world metrics:

- Middleware execution: ~200-500ms → <20ms (**~90% faster**)
- Database queries per request: 2-3 → ~0.2 (**90% reduction**)
- Cache hit rate: 80-95% after warmup
- Page load improvement: 30-50% faster overall

## Contributions

Feel free to create a pull request with any changes you think valuable
