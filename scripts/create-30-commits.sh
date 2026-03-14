#!/bin/bash
# Create 30 logical commits for Starknomo (Starknet-only binary options dApp)
# Author: AmaanSayyad <amaansayyad@yahoo.com>
set -e
cd /Users/amaan/Downloads/Github2/Starknomo
export GIT_AUTHOR_NAME="AmaanSayyad"
export GIT_AUTHOR_EMAIL="amaansayyad@yahoo.com"
export GIT_COMMITTER_NAME="AmaanSayyad"
export GIT_COMMITTER_EMAIL="amaansayyad@yahoo.com"

# Remove existing git history and re-init
rm -rf .git
git init
git config user.name "AmaanSayyad"
git config user.email "amaansayyad@yahoo.com"

# Commit 1: Project foundation
git add .gitignore .gitattributes LICENSE .env.example
git commit -m "chore: add project foundation and ignore rules"

# Commit 2: Node and Next.js config
git add package.json yarn.lock tsconfig.json postcss.config.mjs eslint.config.mjs jest.config.js jest.setup.js
git commit -m "build: add Next.js, TypeScript, and test config"

# Commit 3: Starknet config and env validation
git add lib/ctc/config.ts lib/ctc/env-validation.ts
git commit -m "feat(starknet): add Sepolia config and env validation"

# Commit 4: Starknet client and utils
git add lib/ctc/client.ts lib/ctc/starknet-utils.ts lib/STRK/wallet.ts
git commit -m "feat(starknet): add RPC client and STRK wallet helpers"

# Commit 5: Supabase and database layer
git add lib/supabase/client.ts lib/supabase/server.ts lib/ctc/database.ts
git commit -m "feat(db): add Supabase client and house balance layer"

# Commit 6: Balance sync
git add lib/balance/synchronization.ts
git commit -m "feat(balance): add balance sync and reconciliation logic"

# Commit 7: API balance routes
git add app/api/balance/\[address\]/route.ts app/api/balance/deposit/route.ts app/api/balance/withdraw/route.ts app/api/balance/payout/route.ts app/api/balance/win/route.ts app/api/balance/bet/route.ts
git commit -m "feat(api): add balance and bet API routes"

# Commit 8: API bets and deposit/withdraw
git add app/api/bets/history/route.ts app/api/bets/leaderboard/route.ts app/api/bets/save/route.ts app/api/deposit/route.ts app/api/withdraw/route.ts
git commit -m "feat(api): add bets history, deposit and withdraw endpoints"

# Commit 9: API admin and RPC
git add app/api/admin/ app/api/rpc/route.ts app/api/validate-access-code/route.ts
git commit -m "feat(api): add admin routes and RPC proxy"

# Commit 10: Backend client and store
git add lib/ctc/backend-client.ts lib/ctc/wallet.ts lib/store/
git commit -m "feat: add Starknet backend client and store slices"

# Commit 11: Utils and price feed
git add lib/utils/priceFeed.ts lib/utils/formatters.ts lib/utils/address.ts lib/utils/constants.ts lib/utils/errors.ts lib/utils/errorToast.ts lib/utils/sounds.ts
git commit -m "feat: add Pyth price feed and shared utils"

# Commit 12: Starkzap integration
git add lib/starkzap.ts
git commit -m "feat(starknet): add Starkzap wallet integration"

# Commit 13: App layout and styles
git add app/layout.tsx app/globals.css app/providers.tsx app/icon.png
git commit -m "feat(app): add root layout and global styles"

# Commit 14: UI components
git add components/ui/
git commit -m "feat(ui): add Modal, Button, Card, Toast and grid components"

# Commit 15: Wallet components
git add components/wallet/
git commit -m "feat(wallet): add connect, deposit and withdraw modals for Starknet"

# Commit 16: Balance components
git add components/balance/
git commit -m "feat(balance): add BalanceDisplay and STRK deposit/withdraw modals"

# Commit 17: Game components (part)
git add components/game/ActiveRound.tsx components/game/BetControls.tsx components/game/GameBoard.tsx components/game/HeaderMenu.tsx components/game/Leaderboard.tsx components/game/RoundTimer.tsx components/game/SettlementNotification.tsx components/game/TargetGrid.tsx components/game/TierStatusModal.tsx components/game/index.ts
git commit -m "feat(game): add game board, controls and settlement UI"

# Commit 18: LiveChart and GridScan
git add components/game/LiveChart.tsx
git commit -m "feat(game): add live price chart with Pyth feed"

# Commit 19: History and landing
git add components/history/ components/landing/ components/tour/ components/Header.tsx
git commit -m "feat: add bet history, landing steps and quick tour"

# Commit 20: Trade page
git add app/trade/page.tsx
git commit -m "feat(app): add trade page with Classic and Box modes"

# Commit 21: Landing and waitlist pages
git add app/page.tsx app/waitlist/page.tsx app/waitlist/HowItWorksDemo.tsx app/waitlist/waitlist.css
git commit -m "feat(app): add landing and waitlist pages"

# Commit 22: Profile, referrals, dashboard
git add app/dashboard/page.tsx app/profile/page.tsx app/referrals/page.tsx app/ReferralSync.tsx
git commit -m "feat(app): add profile, referrals and dashboard"

# Commit 23: Supabase migrations
git add supabase/migrations/ supabase/access_system.sql supabase/user_profiles.sql
git commit -m "feat(db): add Supabase migrations for balances and bets"

# Commit 24: Supabase tests and scripts
git add supabase/__tests__/ supabase/scripts/
git commit -m "test(db): add Supabase tests and migration scripts"

# Commit 25: API tests
git add app/api/
git commit -m "test(api): add API route tests"

# Commit 26: Lib and component tests
git add lib/balance/__tests__/ lib/ctc/__tests__/ lib/utils/__tests__/
git commit -m "test: add unit tests for balance, CTC and utils"

# Commit 27: Scripts
git add scripts/
git commit -m "chore: add treasury, deposit and verification scripts"

# Commit 28: README
git add README.md
git commit -m "docs: add README with Starknet architecture and setup"

# Commit 29: Docs
git add docs/EXTRAS.md docs/PROJECT.md docs/TECHNICAL.md docs/starknet.address.json docs/SUPABASE_SETUP.sql
git commit -m "docs: add technical docs and Starknet address config"

# Commit 30: Public assets and types
git add public/ types/ lib/logging/ lib/hooks/
git commit -m "chore: add public assets, types and logging"

echo "Done. Total commits:"
git log --oneline | wc -l
